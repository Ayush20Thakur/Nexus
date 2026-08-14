from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_write_actor
from app.database.session import get_db
from app.models.user import User
from app.services.request_service import create_request_response, create_request_with_approval, get_request, list_requests
from app.services.serializers import request_to_frontend

router = APIRouter(prefix="/requests", tags=["requests"])


@router.get("")
def requests_index(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return list_requests(db)


@router.get("/{request_id}")
def requests_show(request_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    return request_to_frontend(get_request(db, request_id))


@router.post("")
def requests_create(
    payload: dict[str, Any] = Body(...),
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    created, approval = create_request_with_approval(
        db,
        payload,
        actor,
        ip_address=request.client.host if request and request.client else None,
    )
    db.commit()
    return create_request_response(created, approval)
