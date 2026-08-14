from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.settings import UserSetting
from app.models.user import User
from app.services.serializers import user_to_frontend


DEFAULT_PREFERENCES = {
    "emailAlerts": True,
    "critAlerts": True,
    "aiInsights": True,
    "twoFactor": True,
}


def get_profile_payload(user: User) -> dict[str, Any]:
    return user_to_frontend(user)


def update_profile(db: Session, user: User, payload: dict[str, Any]) -> dict[str, Any]:
    if "displayName" in payload:
        user.display_name = str(payload["displayName"]).strip()
    if "department" in payload:
        user.department = str(payload["department"]).strip()
    db.flush()
    return get_profile_payload(user)


def get_preferences(db: Session, user: User) -> dict[str, Any]:
    setting = db.scalar(select(UserSetting).where(UserSetting.user_id == user.id, UserSetting.key == "preferences"))
    return {**DEFAULT_PREFERENCES, **(setting.value if setting else {})}


def update_preferences(db: Session, user: User, payload: dict[str, Any]) -> dict[str, Any]:
    setting = db.scalar(select(UserSetting).where(UserSetting.user_id == user.id, UserSetting.key == "preferences"))
    if setting is None:
        setting = UserSetting(user_id=user.id, key="preferences", value={})
        db.add(setting)
    setting.value = {**DEFAULT_PREFERENCES, **setting.value, **payload}
    db.flush()
    return setting.value
