from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.enums import AuditEventType, AuditSeverity, FulfillmentStatus, RequestPriority, RequestStatus
from app.models.inventory import InventoryItem
from app.models.operations import FulfillmentOrder
from app.models.user import User
from app.services.audit_service import record_audit_event
from app.services.inventory_service import infer_inventory_status
from app.services.serializers import fulfillment_to_frontend, inventory_to_frontend, request_to_frontend


STATUS_FLOW: list[FulfillmentStatus] = [
    FulfillmentStatus.QUEUED,
    FulfillmentStatus.PROCESSING,
    FulfillmentStatus.ALLOCATED,
    FulfillmentStatus.SHIPPED,
    FulfillmentStatus.DELIVERED,
]


def list_fulfillment_orders(db: Session) -> list[dict[str, Any]]:
    orders = db.scalars(
        select(FulfillmentOrder)
        .options(joinedload(FulfillmentOrder.request))
        .order_by(FulfillmentOrder.approved_at.desc(), FulfillmentOrder.created_at.desc())
    ).unique().all()
    return [fulfillment_to_frontend(order) for order in orders]


def get_fulfillment_order(db: Session, order_id: str) -> FulfillmentOrder:
    order = db.scalar(
        select(FulfillmentOrder)
        .options(joinedload(FulfillmentOrder.request))
        .where(or_(FulfillmentOrder.external_id == order_id, cast(FulfillmentOrder.id, String) == order_id))
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fulfillment order not found.")
    return order


def create_fulfillment_order(
    db: Session,
    payload: dict[str, Any],
    actor: User,
    ip_address: str | None = None,
) -> FulfillmentOrder:
    request = None
    request_id = payload.get("requestId")
    if request_id:
        from app.models.operations import OperationalRequest

        request = db.scalar(
            select(OperationalRequest).where(
                or_(OperationalRequest.external_id == request_id, cast(OperationalRequest.id, String) == request_id)
            )
        )
        if request is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request for fulfillment was not found.")

    now = datetime.now(UTC)
    priority_value = payload.get("priority") or (request.priority.value if request else RequestPriority.NORMAL.value)
    eta_value = payload.get("eta")
    eta = datetime.fromisoformat(eta_value.replace("Z", "+00:00")) if isinstance(eta_value, str) and eta_value else None
    order = FulfillmentOrder(
        id=uuid.uuid4(),
        external_id=f"ful-{uuid.uuid4().hex[:12]}",
        request_id=request.id if request else None,
        requested_by_user_id=request.requester_user_id if request else actor.id,
        approved_by_user_id=actor.id,
        request_number=str(payload.get("requestNumber") or (request.request_number if request else f"MAN-{now.strftime('%H%M%S')}")),
        title=str(payload.get("title") or (request.title if request else "Manual Fulfillment Order")).strip(),
        requested_by_name=str(payload.get("requestedBy") or (request.requester_name if request else actor.display_name)).strip(),
        approved_by_name=str(payload.get("approvedBy") or actor.display_name).strip(),
        approved_quantity=int(payload.get("approvedQuantity") or payload.get("quantity") or 1),
        available_stock=int(payload.get("availableStock") or 0),
        safety_stock_min=int(payload.get("safetyStockMin") or 0),
        safety_stock_max=int(payload.get("safetyStockMax") or 0),
        unit=str(payload.get("unit") or "units").strip(),
        status=FulfillmentStatus(payload.get("status") or FulfillmentStatus.QUEUED.value),
        priority=RequestPriority(priority_value),
        carrier=payload.get("carrier"),
        tracking_number=payload.get("trackingNumber"),
        eta=eta,
        approved_at=now,
    )
    db.add(order)
    if request is not None and request.status == RequestStatus.APPROVED:
        request.status = RequestStatus.IN_PROGRESS
    record_audit_event(
        db,
        event_code="FULFILLMENT_CREATED",
        event_type=AuditEventType.FULFILLMENT,
        action="fulfillment.created",
        actor=actor,
        resource_type="FulfillmentOrder",
        resource_id=order.request_number,
        description=f"Created fulfillment order {order.request_number}: {order.title}.",
        severity=AuditSeverity.INFO,
        metadata={"approvedQuantity": order.approved_quantity, "status": order.status.value},
        ip_address=ip_address,
    )
    db.flush()
    return order


def _find_inventory_for_order(db: Session, order: FulfillmentOrder) -> InventoryItem | None:
    if order.request and order.request.inventory_item:
        return order.request.inventory_item
    title = order.title.lower()
    items = db.scalars(select(InventoryItem)).all()
    return next(
        (
            item
            for item in items
            if item.name.lower() in title or title in item.name.lower()
        ),
        None,
    )


def advance_fulfillment_order(
    db: Session,
    order_id: str,
    actor: User,
    ip_address: str | None = None,
) -> dict[str, Any]:
    order = get_fulfillment_order(db, order_id)
    if order.status not in STATUS_FLOW:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fulfillment order cannot be advanced from its current status.")

    current_index = STATUS_FLOW.index(order.status)
    if current_index >= len(STATUS_FLOW) - 1:
        return {"fulfillment": fulfillment_to_frontend(order), "inventory": None, "request": request_to_frontend(order.request) if order.request else None}

    next_status = STATUS_FLOW[current_index + 1]
    updated_inventory = None
    if next_status == FulfillmentStatus.ALLOCATED:
        item = _find_inventory_for_order(db, order)
        if item is not None:
            allocation_quantity = min(order.approved_quantity, item.quantity_on_hand)
            item.quantity_on_hand -= allocation_quantity
            item.status = infer_inventory_status(item.quantity_on_hand, item.reorder_threshold, item.max_capacity)
            updated_inventory = item

    order.status = next_status
    if next_status == FulfillmentStatus.SHIPPED:
        order.carrier = order.carrier or "TechLogistics Express"
        order.tracking_number = order.tracking_number or f"TLX-{datetime.now(UTC).strftime('%H%M%S')}"
        order.eta = order.eta or datetime.now(UTC) + timedelta(hours=8)
    if next_status == FulfillmentStatus.DELIVERED:
        order.fulfilled_at = datetime.now(UTC)
    if order.request is not None:
        order.request.status = RequestStatus.COMPLETED if next_status == FulfillmentStatus.DELIVERED else RequestStatus.IN_PROGRESS

    record_audit_event(
        db,
        event_code=f"FULFILLMENT_{next_status.value}",
        event_type=AuditEventType.FULFILLMENT,
        action=f"fulfillment.{next_status.value.lower()}",
        actor=actor,
        resource_type="FulfillmentOrder",
        resource_id=order.request_number,
        description=f"Fulfillment order {order.request_number} transitioned to {next_status.value}.",
        severity=AuditSeverity.INFO,
        metadata={"status": next_status.value, "approvedQuantity": order.approved_quantity},
        ip_address=ip_address,
    )
    db.flush()
    return {
        "fulfillment": fulfillment_to_frontend(order),
        "inventory": inventory_to_frontend(updated_inventory) if updated_inventory else None,
        "request": request_to_frontend(order.request) if order.request else None,
    }
