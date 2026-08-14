from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.auth import LogoutResponse, SessionValidationResponse
from app.schemas.user import UserRead
from app.services.user_service import to_user_read

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserRead)
def current_user(current_user: User = Depends(get_current_user)) -> UserRead:
    return to_user_read(current_user)


@router.get("/session", response_model=SessionValidationResponse)
def validate_session(current_user: User = Depends(get_current_user)) -> SessionValidationResponse:
    return SessionValidationResponse(authenticated=True, user=to_user_read(current_user))


@router.post("/logout", response_model=LogoutResponse)
def logout(current_user: User = Depends(get_current_user)) -> LogoutResponse:
    return LogoutResponse(
        revoked=False,
        message="Supabase Auth owns token revocation; clear the client session and revoke through Supabase if needed.",
    )
