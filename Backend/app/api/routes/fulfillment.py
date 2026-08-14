from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_write_actor
from app.database.session import get_db
from app.models.user import User
from app.services.fulfillment_service import advance_fulfillment_order, create_fulfillment_order, list_fulfillment_orders
from app.services.serializers import fulfillment_to_frontend

router = APIRouter(prefix="/fulfillment", tags=["fulfillment"])


@router.get("")
def fulfillment_index(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return list_fulfillment_orders(db)


@router.post("")
def fulfillment_create(
    payload: dict[str, Any] = Body(...),
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    order = create_fulfillment_order(
        db,
        payload,
        actor,
        ip_address=request.client.host if request and request.client else None,
    )
    db.commit()
    return fulfillment_to_frontend(order)


@router.post("/{order_id}/advance")
def fulfillment_advance(
    order_id: str,
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    result = advance_fulfillment_order(
        db,
        order_id,
        actor,
        ip_address=request.client.host if request and request.client else None,
    )
    db.commit()
    return result
