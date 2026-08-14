from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.audit import AuditEvent
from app.models.enums import AIDecision, ApprovalStatus, FulfillmentStatus, InventoryStatus, RequestPriority, RequestStatus
from app.models.inventory import InventoryItem
from app.models.operations import Approval, FulfillmentOrder, OperationalRequest
from app.services.serializers import activity_from_audit


APPROVED_REQUEST_STATUSES = {RequestStatus.APPROVED, RequestStatus.IN_PROGRESS, RequestStatus.COMPLETED}
REJECTED_REQUEST_STATUSES = {RequestStatus.REJECTED, RequestStatus.CANCELLED}
HEALTHY_INVENTORY_STATUSES = {InventoryStatus.OPTIMAL, InventoryStatus.OVERSTOCK}
LOW_INVENTORY_STATUSES = {InventoryStatus.LOW, InventoryStatus.CRITICAL}


def _percent(part: float | int, total: float | int) -> int:
    return round((float(part) / float(total)) * 100) if total else 0


def _change(current: float | int, previous: float | int) -> tuple[float, str]:
    delta = round(float(current) - float(previous), 1)
    if delta > 0:
        return delta, "up"
    if delta < 0:
        return delta, "down"
    return 0, "stable"


def _date_key(value: Any) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def _daily_request_volume(db: Session, *, days: int) -> list[dict[str, Any]]:
    today = datetime.now(UTC).date()
    start = today - timedelta(days=days - 1)
    rows = db.execute(
        select(func.date(OperationalRequest.created_at), OperationalRequest.status, func.count())
        .where(OperationalRequest.created_at >= datetime.combine(start, datetime.min.time(), tzinfo=UTC))
        .group_by(func.date(OperationalRequest.created_at), OperationalRequest.status)
    ).all()
    by_day: dict[str, dict[str, int]] = {
        (start + timedelta(days=offset)).isoformat(): {"requests": 0, "approved": 0, "rejected": 0}
        for offset in range(days)
    }
    for day, status_value, count in rows:
        key = _date_key(day)
        if key not in by_day:
            continue
        status = status_value if isinstance(status_value, RequestStatus) else RequestStatus(str(status_value))
        by_day[key]["requests"] += int(count)
        if status in APPROVED_REQUEST_STATUSES:
            by_day[key]["approved"] += int(count)
        if status in REJECTED_REQUEST_STATUSES:
            by_day[key]["rejected"] += int(count)
    return [{"date": day, **values} for day, values in by_day.items()]


def _inventory_by_zone(db: Session) -> list[dict[str, Any]]:
    rows = db.execute(
        select(InventoryItem.zone, func.coalesce(func.sum(InventoryItem.quantity_on_hand), 0))
        .group_by(InventoryItem.zone)
        .order_by(InventoryItem.zone.asc())
    ).all()
    return [{"label": zone, "units": int(total or 0)} for zone, total in rows]


def _inventory_distribution(db: Session) -> list[dict[str, Any]]:
    rows = db.execute(
        select(InventoryItem.category, func.coalesce(func.sum(InventoryItem.quantity_on_hand), 0))
        .group_by(InventoryItem.category)
        .order_by(func.coalesce(func.sum(InventoryItem.quantity_on_hand), 0).desc())
    ).all()
    total_units = sum(int(total or 0) for _, total in rows) or 1
    return [
        {"category": category, "value": int(total or 0), "percentage": round((int(total or 0) / total_units) * 100)}
        for category, total in rows
    ]


def _health_metric(label: str, value: int) -> dict[str, Any]:
    value = max(0, min(100, int(value)))
    if value >= 85:
        color = "success"
    elif value >= 60:
        color = "warning"
    else:
        color = "error"
    return {
        "label": label,
        "value": value,
        "segments": [
            {"color": color, "percentage": value},
            {"color": "neutral", "percentage": max(0, 100 - value)},
        ],
    }


def _approval_rate_for_window(db: Session, *, start: datetime, end: datetime) -> int:
    total = db.scalar(
        select(func.count())
        .select_from(OperationalRequest)
        .where(OperationalRequest.created_at >= start, OperationalRequest.created_at < end)
    ) or 0
    approved = db.scalar(
        select(func.count())
        .select_from(OperationalRequest)
        .where(
            OperationalRequest.created_at >= start,
            OperationalRequest.created_at < end,
            OperationalRequest.status.in_(list(APPROVED_REQUEST_STATUSES)),
        )
    ) or 0
    return _percent(approved, total)


def _critical_backlog_for_window(db: Session, *, start: datetime, end: datetime) -> int:
    return db.scalar(
        select(func.count())
        .select_from(OperationalRequest)
        .where(
            OperationalRequest.created_at >= start,
            OperationalRequest.created_at < end,
            OperationalRequest.priority == RequestPriority.CRITICAL,
            OperationalRequest.status == RequestStatus.PENDING,
        )
    ) or 0


def dashboard_summary(db: Session) -> dict[str, Any]:
    total_inventory = db.scalar(select(func.coalesce(func.sum(InventoryItem.quantity_on_hand), 0))) or 0
    total_reserved = db.scalar(select(func.coalesce(func.sum(InventoryItem.quantity_reserved), 0))) or 0
    pending_requests = db.scalar(
        select(func.count()).select_from(OperationalRequest).where(OperationalRequest.status == RequestStatus.PENDING)
    ) or 0
    total_requests = db.scalar(select(func.count()).select_from(OperationalRequest)) or 0
    critical_requests = db.scalar(
        select(func.count())
        .select_from(OperationalRequest)
        .where(OperationalRequest.priority == RequestPriority.CRITICAL, OperationalRequest.status == RequestStatus.PENDING)
    ) or 0
    low_stock = db.scalar(
        select(func.count())
        .select_from(InventoryItem)
        .where(InventoryItem.status.in_([InventoryStatus.LOW, InventoryStatus.CRITICAL]))
    ) or 0
    total_items = db.scalar(select(func.count()).select_from(InventoryItem)) or 0
    healthy_items = db.scalar(
        select(func.count())
        .select_from(InventoryItem)
        .where(InventoryItem.status.in_(list(HEALTHY_INVENTORY_STATUSES)))
    ) or 0
    delivered = db.scalar(
        select(func.count()).select_from(FulfillmentOrder).where(FulfillmentOrder.status == FulfillmentStatus.DELIVERED)
    ) or 0
    fulfillment_total = db.scalar(select(func.count()).select_from(FulfillmentOrder)) or 0
    resolved_approvals = db.scalar(
        select(func.count()).select_from(Approval).where(Approval.status != ApprovalStatus.PENDING)
    ) or 0
    approval_total = db.scalar(select(func.count()).select_from(Approval)) or 0
    pending_approvals = db.scalar(
        select(func.count()).select_from(Approval).where(Approval.status == ApprovalStatus.PENDING)
    ) or 0
    avg_confidence = db.scalar(select(func.avg(OperationalRequest.ai_confidence))) or 0
    automated_approvals = db.scalar(
        select(func.count()).select_from(OperationalRequest).where(OperationalRequest.ai_decision == AIDecision.APPROVE)
    ) or 0
    reorder_rows = db.execute(
        select(InventoryItem.quantity_on_hand, InventoryItem.reorder_threshold, InventoryItem.unit_cost)
        .where(InventoryItem.quantity_on_hand < InventoryItem.reorder_threshold)
    ).all()
    reorder_exposure = sum(
        max(0, threshold - on_hand) * float(unit_cost or 0)
        for on_hand, threshold, unit_cost in reorder_rows
    )
    health_metrics = [
        _health_metric("Inventory Coverage", _percent(healthy_items, total_items)),
        _health_metric("Request Flow", _percent(total_requests - pending_requests, total_requests)),
        _health_metric("Approval Throughput", _percent(resolved_approvals, approval_total)),
        _health_metric("Fulfillment Completion", _percent(delivered, fulfillment_total)),
    ]
    operational_health = round(sum(metric["value"] for metric in health_metrics) / len(health_metrics)) if health_metrics else 0
    automation_rate = _percent(automated_approvals, total_requests)
    readiness_score = round(
        (_percent(healthy_items, total_items) * 0.25)
        + (_percent(total_requests - pending_requests, total_requests) * 0.25)
        + (_percent(resolved_approvals, approval_total) * 0.2)
        + (_percent(delivered, fulfillment_total) * 0.15)
        + (round(float(avg_confidence)) * 0.15)
    )
    if readiness_score >= 85:
        readiness_status = "READY"
    elif readiness_score >= 70:
        readiness_status = "WATCH"
    elif readiness_score >= 50:
        readiness_status = "AT_RISK"
    else:
        readiness_status = "BLOCKED"
    next_actions: list[str] = []
    if critical_requests:
        next_actions.append(f"Resolve {int(critical_requests)} critical pending request(s) before standard queue work.")
    if pending_approvals:
        next_actions.append(f"Clear {int(pending_approvals)} approval item(s) to reduce queue pressure.")
    if low_stock:
        next_actions.append(f"Review {int(low_stock)} low-stock SKU(s) before approving new allocations.")
    if not next_actions:
        next_actions.append("Maintain current approval and fulfillment cadence.")
    activity = db.scalars(select(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(8)).all()
    return {
        "kpis": {
            "availableInventory": int(total_inventory),
            "inventoryTrend": _percent(total_reserved, total_inventory),
            "pendingRequests": int(pending_requests),
            "requestsTrend": _percent(pending_requests, total_requests),
            "criticalRequests": int(critical_requests),
            "lowStockItems": int(low_stock),
            "operationalHealth": operational_health,
        },
        "requestVolume": _daily_request_volume(db, days=7),
        "inventoryTrend": _inventory_by_zone(db),
        "healthMetrics": health_metrics,
        "overallSla": operational_health,
        "activityFeed": [activity_from_audit(event) for event in activity],
        "executiveBrief": {
            "readinessScore": max(0, min(100, readiness_score)),
            "status": readiness_status,
            "headline": (
                f"{readiness_status.replace('_', ' ').title()} posture with "
                f"{int(critical_requests)} critical pending request(s), "
                f"{int(pending_approvals)} pending approval(s), and {int(low_stock)} low-stock SKU(s)."
            ),
            "riskNarrative": (
                f"Operational health is {operational_health}%, automation rate is {automation_rate}%, "
                f"and average AI confidence is {round(float(avg_confidence))}% across current requests."
            ),
            "nextActions": next_actions[:3],
            "queuePressure": int(pending_requests + pending_approvals),
            "reorderExposure": round(reorder_exposure, 2),
            "automationRate": automation_rate,
            "avgAiConfidence": round(float(avg_confidence)),
        },
    }


def insights_summary(db: Session) -> dict[str, Any]:
    total_requests = db.scalar(select(func.count()).select_from(OperationalRequest)) or 0
    approved = db.scalar(
        select(func.count()).select_from(OperationalRequest).where(OperationalRequest.status.in_(list(APPROVED_REQUEST_STATUSES)))
    ) or 0
    rejected = db.scalar(
        select(func.count()).select_from(OperationalRequest).where(OperationalRequest.status.in_(list(REJECTED_REQUEST_STATUSES)))
    ) or 0
    low_stock = db.scalar(
        select(func.count())
        .select_from(InventoryItem)
        .where(InventoryItem.status.in_([InventoryStatus.LOW, InventoryStatus.CRITICAL]))
    ) or 0
    total_items = db.scalar(select(func.count()).select_from(InventoryItem)) or 0
    healthy_items = db.scalar(
        select(func.count())
        .select_from(InventoryItem)
        .where(InventoryItem.status.in_(list(HEALTHY_INVENTORY_STATUSES)))
    ) or 0
    pending_approvals = db.scalar(select(func.count()).select_from(Approval).where(Approval.status == ApprovalStatus.PENDING)) or 0
    fulfillment_total = db.scalar(select(func.count()).select_from(FulfillmentOrder)) or 0
    delivered = db.scalar(
        select(func.count()).select_from(FulfillmentOrder).where(FulfillmentOrder.status == FulfillmentStatus.DELIVERED)
    ) or 0
    critical_backlog = db.scalar(
        select(func.count())
        .select_from(OperationalRequest)
        .where(OperationalRequest.priority == RequestPriority.CRITICAL, OperationalRequest.status == RequestStatus.PENDING)
    ) or 0
    avg_confidence = db.scalar(select(func.avg(OperationalRequest.ai_confidence))) or 0
    reorder_rows = db.execute(
        select(InventoryItem.quantity_on_hand, InventoryItem.reorder_threshold, InventoryItem.unit_cost)
        .where(InventoryItem.quantity_on_hand < InventoryItem.reorder_threshold)
    ).all()
    reorder_exposure = sum(
        max(0, threshold - on_hand) * float(unit_cost or 0)
        for on_hand, threshold, unit_cost in reorder_rows
    )
    now = datetime.now(UTC)
    current_start = now - timedelta(days=7)
    previous_start = now - timedelta(days=14)
    current_approval_rate = _approval_rate_for_window(db, start=current_start, end=now)
    previous_approval_rate = _approval_rate_for_window(db, start=previous_start, end=current_start)
    approval_delta, approval_direction = _change(current_approval_rate, previous_approval_rate)
    current_backlog = _critical_backlog_for_window(db, start=current_start, end=now)
    previous_backlog = _critical_backlog_for_window(db, start=previous_start, end=current_start)
    backlog_delta, backlog_direction = _change(current_backlog, previous_backlog)
    return {
        "kpis": [
            {"label": "Approval Rate", "value": f"{_percent(approved, total_requests)}%", "trend": approval_delta, "trendDirection": approval_direction, "status": "good"},
            {"label": "Fulfillment Completion", "value": f"{_percent(delivered, fulfillment_total)}%", "trend": 0, "trendDirection": "stable", "status": "good" if delivered == fulfillment_total and fulfillment_total else "warning"},
            {"label": "Inventory Coverage", "value": f"{_percent(healthy_items, total_items)}%", "trend": 0, "trendDirection": "stable", "status": "good" if low_stock == 0 else "warning"},
            {"label": "Critical Backlog", "value": str(critical_backlog), "trend": backlog_delta, "trendDirection": backlog_direction, "status": "critical" if critical_backlog else "good"},
            {"label": "Reorder Exposure", "value": f"${round(reorder_exposure):,}", "trend": 0, "trendDirection": "stable", "status": "warning" if reorder_exposure else "good"},
            {"label": "Avg AI Confidence", "value": f"{round(float(avg_confidence))}%", "trend": 0, "trendDirection": "stable", "status": "good" if float(avg_confidence) >= 85 else "warning"},
            {"label": "Approval Backlog", "value": str(pending_approvals), "trend": 0, "trendDirection": "stable", "status": "warning" if pending_approvals else "good"},
        ],
        "requestVolume": _daily_request_volume(db, days=14),
        "inventoryDistribution": _inventory_distribution(db),
    }
