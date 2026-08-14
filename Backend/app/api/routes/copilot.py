from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_write_actor
from app.database.session import get_db
from app.models.user import User
from app.services.copilot_service import (
    answer_copilot,
    build_entity_inference,
    get_copilot_state,
    start_copilot_conversation,
)

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.get("/state")
def copilot_state(
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    state = get_copilot_state(db, actor)
    db.commit()
    return state


@router.post("/conversations")
def copilot_new_conversation(
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    conversation = start_copilot_conversation(db, actor)
    db.commit()
    return get_copilot_state(db, actor)


@router.post("/chat")
def copilot_chat(
    payload: dict[str, Any] = Body(...),
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    message = answer_copilot(db, str(payload["message"]), actor, payload.get("conversationId"))
    db.commit()
    return message


@router.post("/inference")
def copilot_entity_inference(
    payload: dict[str, Any] = Body(...),
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return build_entity_inference(db, str(payload.get("entityType", "")), str(payload.get("entityId", "")))
