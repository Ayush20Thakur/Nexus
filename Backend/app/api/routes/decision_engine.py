from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_write_actor
from app.database.session import get_db
from app.models.user import User
from app.services.decision_service import (
    create_decision_rule,
    decision_engine_metrics,
    list_decision_rules,
    simulate_request_decision,
    toggle_decision_rule,
)
from app.services.serializers import rule_to_frontend

router = APIRouter(prefix="/decision-engine", tags=["decision-engine"])


@router.get("/rules")
def rules_index(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return list_decision_rules(db)


@router.get("/metrics")
def metrics(db: Session = Depends(get_db)) -> dict[str, Any]:
    return decision_engine_metrics(db)


@router.post("/rules")
def rules_create(
    payload: dict[str, Any] = Body(...),
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    rule = create_decision_rule(db, payload, actor, ip_address=request.client.host if request and request.client else None)
    db.commit()
    return rule_to_frontend(rule)


@router.post("/rules/{rule_id}/toggle")
def rules_toggle(
    rule_id: str,
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    rule = toggle_decision_rule(db, rule_id, actor, ip_address=request.client.host if request and request.client else None)
    db.commit()
    return rule_to_frontend(rule)


@router.post("/simulate")
def simulate(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    return simulate_request_decision(payload)
