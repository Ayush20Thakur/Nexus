from __future__ import annotations

from pydantic import BaseModel

from app.schemas.user import UserRead


class SessionValidationResponse(BaseModel):
    authenticated: bool
    user: UserRead


class LogoutResponse(BaseModel):
    revoked: bool
    message: str
