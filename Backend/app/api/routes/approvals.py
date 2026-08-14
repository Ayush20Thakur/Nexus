from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_write_actor
from app.database.session import get_db
from app.models.user import User
from app.services.approval_service import approve_approval, clarify_approval, list_approvals, reject_approval

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("")
def approvals_index(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return list_approvals(db)


@router.post("/{approval_id}/approve")
def approvals_approve(
    approval_id: str,
    payload: dict[str, Any] = Body(default_factory=dict),
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    result = approve_approval(
        db,
        approval_id,
        actor,
        note=payload.get("note"),
        ip_address=request.client.host if request and request.client else None,
    )
    db.commit()
    return result


@router.post("/{approval_id}/reject")
def approvals_reject(
    approval_id: str,
    payload: dict[str, Any] = Body(...),
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    result = reject_approval(
        db,
        approval_id,
        actor,
        reason=str(payload["reason"]),
        ip_address=request.client.host if request and request.client else None,
    )
    db.commit()
    return result


@router.post("/{approval_id}/clarify")
def approvals_clarify(
    approval_id: str,
    payload: dict[str, Any] = Body(...),
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    result = clarify_approval(
        db,
        approval_id,
        actor,
        message=str(payload["message"]),
        ip_address=request.client.host if request and request.client else None,
    )
    db.commit()
    return result
