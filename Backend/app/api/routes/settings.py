from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_write_actor
from app.database.session import get_db
from app.models.user import User
from app.services.settings_service import get_preferences, get_profile_payload, update_preferences, update_profile

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/profile")
def profile(actor: User = Depends(get_write_actor)) -> dict[str, Any]:
    return get_profile_payload(actor)


@router.patch("/profile")
def profile_update(
    payload: dict[str, Any] = Body(...),
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    profile_payload = update_profile(db, actor, payload)
    db.commit()
    return profile_payload


@router.get("/preferences")
def preferences(actor: User = Depends(get_write_actor), db: Session = Depends(get_db)) -> dict[str, Any]:
    return get_preferences(db, actor)


@router.patch("/preferences")
def preferences_update(
    payload: dict[str, Any] = Body(...),
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    preferences_payload = update_preferences(db, actor, payload)
    db.commit()
    return preferences_payload
