from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session

from app.models.enums import InventoryStatus
from app.models.inventory import InventoryItem
from app.services.serializers import inventory_to_frontend


def infer_inventory_status(quantity_on_hand: int, reorder_threshold: int, max_capacity: int) -> InventoryStatus:
    if quantity_on_hand <= max(1, int(reorder_threshold * 0.5)):
        return InventoryStatus.CRITICAL
    if quantity_on_hand <= reorder_threshold:
        return InventoryStatus.LOW
    if max_capacity > 0 and quantity_on_hand >= max_capacity:
        return InventoryStatus.OVERSTOCK
    return InventoryStatus.OPTIMAL


def list_inventory(db: Session) -> list[dict[str, Any]]:
    items = db.scalars(select(InventoryItem).order_by(InventoryItem.updated_at.desc())).all()
    return [inventory_to_frontend(item) for item in items]


def get_inventory_item(db: Session, item_id: str) -> InventoryItem:
    item = db.scalar(
        select(InventoryItem).where(or_(InventoryItem.external_id == item_id, cast(InventoryItem.id, String) == item_id))
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found.")
    return item


def create_inventory_item(db: Session, payload: dict[str, Any]) -> InventoryItem:
    quantity_on_hand = int(payload.get("quantityOnHand", 0))
    reorder_threshold = int(payload.get("reorderThreshold", 0))
    max_capacity = int(payload.get("maxCapacity", 0))
    requested_status = payload.get("status")
    status_value = InventoryStatus(requested_status) if requested_status else infer_inventory_status(quantity_on_hand, reorder_threshold, max_capacity)

    item = InventoryItem(
        id=uuid.uuid4(),
        external_id=f"inv-{uuid.uuid4().hex[:12]}",
        sku=str(payload["sku"]).strip(),
        name=str(payload["name"]).strip(),
        category=str(payload["category"]).strip(),
        zone=str(payload["zone"]).strip(),
        quantity_on_hand=quantity_on_hand,
        quantity_reserved=int(payload.get("quantityReserved", 0)),
        reorder_threshold=reorder_threshold,
        max_capacity=max_capacity,
        unit=str(payload.get("unit", "units")).strip(),
        status=status_value,
        supplier=payload.get("supplier"),
        unit_cost=payload.get("unitCost"),
    )
    db.add(item)
    db.flush()
    return item


def update_inventory_item(db: Session, item_id: str, payload: dict[str, Any]) -> InventoryItem:
    item = get_inventory_item(db, item_id)
    mapping = {
        "sku": "sku",
        "name": "name",
        "category": "category",
        "zone": "zone",
        "quantityOnHand": "quantity_on_hand",
        "quantityReserved": "quantity_reserved",
        "reorderThreshold": "reorder_threshold",
        "maxCapacity": "max_capacity",
        "unit": "unit",
        "supplier": "supplier",
        "unitCost": "unit_cost",
    }
    for source, target in mapping.items():
        if source in payload:
            setattr(item, target, payload[source])
    if "status" in payload:
        item.status = InventoryStatus(payload["status"])
    else:
        item.status = infer_inventory_status(item.quantity_on_hand, item.reorder_threshold, item.max_capacity)
    db.flush()
    return item


def adjust_inventory_stock(db: Session, item_id: str, delta: int) -> InventoryItem:
    item = get_inventory_item(db, item_id)
    next_quantity = item.quantity_on_hand + int(delta)
    if next_quantity < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stock adjustment would make quantity negative.")
    item.quantity_on_hand = next_quantity
    item.status = infer_inventory_status(item.quantity_on_hand, item.reorder_threshold, item.max_capacity)
    db.flush()
    return item
