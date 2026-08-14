from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.enums import AIDecision, ApprovalStatus, AuditEventType, AuditSeverity, RequestPriority, RequestStatus, RequestType
from app.models.inventory import InventoryItem
from app.models.operations import Approval, OperationalRequest
from app.models.user import User
from app.services.audit_service import record_audit_event
from app.services.decision_service import RequestDecisionInput, evaluate_request_decision
from app.services.serializers import approval_to_frontend, request_to_frontend


def _request_number(priority: RequestPriority) -> str:
    return f"REQ-{datetime.now(UTC).strftime('%H%M%S')}-{priority.value[0]}"


def _find_inventory_item(db: Session, public_id: str | None) -> InventoryItem | None:
    if not public_id:
        return None
    return db.scalar(
        select(InventoryItem).where(or_(InventoryItem.external_id == public_id, cast(InventoryItem.id, String) == public_id))
    )


def list_requests(db: Session) -> list[dict[str, Any]]:
    requests = db.scalars(
        select(OperationalRequest)
        .options(joinedload(OperationalRequest.inventory_item), joinedload(OperationalRequest.assignee))
        .order_by(OperationalRequest.created_at.desc())
    ).unique().all()
    return [request_to_frontend(request) for request in requests]


def get_request(db: Session, request_id: str) -> OperationalRequest:
    request = db.scalar(
        select(OperationalRequest)
        .options(joinedload(OperationalRequest.inventory_item), joinedload(OperationalRequest.assignee))
        .where(or_(OperationalRequest.external_id == request_id, cast(OperationalRequest.id, String) == request_id))
    )
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operational request not found.")
    return request


def create_request_with_approval(
    db: Session,
    payload: dict[str, Any],
    actor: User,
    ip_address: str | None = None,
) -> tuple[OperationalRequest, Approval]:
    request_type = RequestType(payload["type"])
    priority = RequestPriority(payload["priority"])
    quantity = int(payload.get("quantity") or 10)
    inventory_item = _find_inventory_item(db, payload.get("inventoryItemId"))
    total_value = None
    if inventory_item and inventory_item.unit_cost is not None:
        total_value = Decimal(quantity) * inventory_item.unit_cost

    seed_confidence = 92 if priority == RequestPriority.CRITICAL else 96
    decision = evaluate_request_decision(
        RequestDecisionInput(
            type=request_type,
            priority=priority,
            status=RequestStatus.PENDING,
            quantity=quantity,
            ai_confidence=seed_confidence,
            total_value=total_value,
        )
    )
    request = OperationalRequest(
        id=uuid.uuid4(),
        external_id=f"req-{uuid.uuid4().hex[:12]}",
        request_number=_request_number(priority),
        title=str(payload["title"]).strip(),
        description=str(payload["description"]).strip(),
        type=request_type,
        priority=priority,
        status=RequestStatus.PENDING,
        requester_user_id=actor.id,
        requester_name=str(payload.get("requester") or actor.display_name).strip(),
        requester_department=str(payload.get("requesterDept") or actor.department).strip(),
        inventory_item_id=inventory_item.id if inventory_item else None,
        quantity=quantity,
        total_value=total_value,
        ai_decision=decision.decision,
        ai_confidence=decision.confidence,
        ai_reasoning=decision.reasoning,
        decision_metadata={"appliedRules": decision.applied_rules, "requiresManualReview": decision.requires_manual_review},
    )
    db.add(request)
    db.flush()

    available_stock = inventory_item.quantity_on_hand if inventory_item else max(12, quantity + 4)
    safety_stock = inventory_item.reorder_threshold if inventory_item else 15
    fulfillable_stock = max(0, available_stock - safety_stock)
    procure_quantity = max(0, quantity - fulfillable_stock)
    approval = Approval(
        id=uuid.uuid4(),
        external_id=f"appr-{uuid.uuid4().hex[:12]}",
        request_id=request.id,
        status=ApprovalStatus.PENDING,
        quantity_requested=quantity,
        unit=inventory_item.unit if inventory_item else "units",
        ai_recommendation=(
            f"Fulfill {min(quantity, max(available_stock, 0))} units from active stock"
            + (f" and procure {procure_quantity} units." if procure_quantity else ".")
        ),
        available_stock=available_stock,
        procure_quantity=procure_quantity,
        safety_stock=safety_stock,
        ai_confidence=decision.confidence,
        waiting_time="Just now",
    )
    db.add(approval)
    db.flush()

    record_audit_event(
        db,
        event_code="REQUEST_CREATED",
        event_type=AuditEventType.REQUEST,
        action="request.created",
        actor=actor,
        resource_type="OperationalRequest",
        resource_id=request.request_number,
        description=f"Created {priority.value} request {request.request_number}: {request.title}.",
        severity=AuditSeverity.WARNING if priority == RequestPriority.CRITICAL else AuditSeverity.INFO,
        metadata={"quantity": quantity, "aiDecision": decision.decision.value, "aiConfidence": decision.confidence},
        ip_address=ip_address,
    )
    return request, approval


def create_request_response(request: OperationalRequest, approval: Approval) -> dict[str, Any]:
    return {
        "request": request_to_frontend(request),
        "approval": approval_to_frontend(approval),
    }
