from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_write_actor
from app.database.session import get_db
from app.models.user import User
from app.services.engineering_service import deploy_model, list_engineering_requests, list_models
from app.services.serializers import model_to_frontend

router = APIRouter(prefix="/ai-engineering", tags=["ai-engineering"])


@router.get("/models")
def models_index(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return list_models(db)


@router.post("/models")
def models_create(
    payload: dict[str, Any] = Body(...),
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    model = deploy_model(db, payload, actor, ip_address=request.client.host if request and request.client else None)
    db.commit()
    return model_to_frontend(model)


@router.get("/requests")
def engineering_requests_index(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return list_engineering_requests(db)
