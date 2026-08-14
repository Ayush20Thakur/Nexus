from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_write_actor
from app.database.session import get_db
from app.models.user import User
from app.services.policy_service import create_policy, list_policies, toggle_policy_status, update_policy
from app.services.serializers import policy_to_frontend

router = APIRouter(prefix="/policies", tags=["policies"])


@router.get("")
def policies_index(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return list_policies(db)


@router.post("")
def policies_create(
    payload: dict[str, Any] = Body(...),
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    policy = create_policy(db, payload, actor, ip_address=request.client.host if request and request.client else None)
    db.commit()
    return policy_to_frontend(policy)


@router.patch("/{policy_id}")
def policies_update(
    policy_id: str,
    payload: dict[str, Any] = Body(...),
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    policy = update_policy(db, policy_id, payload, actor, ip_address=request.client.host if request and request.client else None)
    db.commit()
    return policy_to_frontend(policy)


@router.post("/{policy_id}/toggle")
def policies_toggle(
    policy_id: str,
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    policy = toggle_policy_status(db, policy_id, actor, ip_address=request.client.host if request and request.client else None)
    db.commit()
    return policy_to_frontend(policy)
