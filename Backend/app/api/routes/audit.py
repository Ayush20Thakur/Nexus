from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.audit import AuditEvent
from app.services.serializers import audit_to_frontend

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
def audit_index(db: Session = Depends(get_db), limit: int = Query(default=100, ge=1, le=500)) -> list[dict[str, Any]]:
    events = db.scalars(select(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(limit)).all()
    return [audit_to_frontend(event) for event in events]
