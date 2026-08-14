from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_write_actor
from app.database.session import get_db
from app.models.enums import AuditEventType, AuditSeverity
from app.models.user import User
from app.services.audit_service import record_audit_event
from app.services.inventory_service import adjust_inventory_stock, create_inventory_item, list_inventory, update_inventory_item
from app.services.serializers import inventory_to_frontend

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("")
def inventory_index(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return list_inventory(db)


@router.post("")
def inventory_create(
    payload: dict[str, Any] = Body(...),
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    item = create_inventory_item(db, payload)
    record_audit_event(
        db,
        event_code="INVENTORY_CREATED",
        event_type=AuditEventType.INVENTORY,
        action="inventory.created",
        actor=actor,
        resource_type="InventoryItem",
        resource_id=item.external_id or str(item.id),
        description=f"Added inventory item {item.name} ({item.sku}) to {item.zone}.",
        severity=AuditSeverity.INFO,
        metadata={"sku": item.sku, "quantityOnHand": item.quantity_on_hand},
        ip_address=request.client.host if request and request.client else None,
    )
    db.commit()
    return inventory_to_frontend(item)


@router.patch("/{item_id}")
def inventory_update(
    item_id: str,
    payload: dict[str, Any] = Body(...),
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    item = update_inventory_item(db, item_id, payload)
    record_audit_event(
        db,
        event_code="INVENTORY_UPDATED",
        event_type=AuditEventType.INVENTORY,
        action="inventory.updated",
        actor=actor,
        resource_type="InventoryItem",
        resource_id=item.external_id or str(item.id),
        description=f"Updated inventory item {item.name}.",
        severity=AuditSeverity.INFO,
        metadata={},
        ip_address=request.client.host if request and request.client else None,
    )
    db.commit()
    return inventory_to_frontend(item)


@router.patch("/{item_id}/stock")
def inventory_stock_adjust(
    item_id: str,
    payload: dict[str, Any] = Body(...),
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    item = adjust_inventory_stock(db, item_id, int(payload["delta"]))
    record_audit_event(
        db,
        event_code="INVENTORY_STOCK_ADJUSTED",
        event_type=AuditEventType.INVENTORY,
        action="inventory.stock_adjusted",
        actor=actor,
        resource_type="InventoryItem",
        resource_id=item.external_id or str(item.id),
        description=f"Adjusted stock for {item.name} by {int(payload['delta'])}.",
        severity=AuditSeverity.WARNING if int(payload["delta"]) < 0 else AuditSeverity.INFO,
        metadata={"delta": int(payload["delta"]), "quantityOnHand": item.quantity_on_hand},
        ip_address=request.client.host if request and request.client else None,
    )
    db.commit()
    return inventory_to_frontend(item)
