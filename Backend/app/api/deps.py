from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database.session import get_db
from app.models.enums import RoleName
from app.models.user import User
from app.security.rbac import has_any_role, has_permission
from app.services.auth_service import AuthService, AuthenticationError

bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_service() -> AuthService:
    return AuthService()


def get_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token is required.")
    return credentials.credentials


def get_current_user(
    token: str = Depends(get_bearer_token),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    try:
        return auth_service.authenticate(db, token)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired bearer token.") from exc


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
) -> User | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    try:
        return auth_service.authenticate(db, credentials.credentials)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired bearer token.") from exc


def get_write_actor(
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> User:
    if current_user is not None:
        return current_user

    settings = get_settings()
    if not (settings.is_development and settings.allow_dev_auth_fallback):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token is required.")

    from sqlalchemy import select

    actor = db.scalar(select(User).where(User.email == "zian@nexus.corp"))
    if actor is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Development actor is unavailable. Run the NEXUS seed first.",
        )
    return actor


def require_role(*roles: RoleName) -> Callable[[User], User]:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if not roles:
            return current_user
        if not has_any_role(current_user, roles):
            allowed = ", ".join(role.value for role in roles)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Requires one of these roles: {allowed}.")
        return current_user

    return dependency


def require_permission(permission: str) -> Callable[[User], User]:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user, permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Requires permission: {permission}.")
        return current_user

    return dependency
