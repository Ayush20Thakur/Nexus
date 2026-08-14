from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_write_actor
from app.database.session import get_db
from app.models.enums import AuditEventType, AuditSeverity, RoleName
from app.models.user import User
from app.schemas.user import UserCreate, UserListResponse, UserRead, UserRoleUpdate, UserRoleUpdateResponse
from app.security.rbac import has_any_role
from app.services.audit_service import record_audit_event
from app.services.user_service import create_user, get_user_by_id, list_system_units, list_users, set_user_role, to_user_read

router = APIRouter(prefix="/users", tags=["users"])


def require_admin_actor(actor: User = Depends(get_write_actor)) -> User:
    if not has_any_role(actor, [RoleName.ADMIN]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requires ADMIN role.")
    return actor


@router.get("/me", response_model=UserRead)
def user_profile(current_user: User = Depends(get_current_user)) -> UserRead:
    return to_user_read(current_user)


@router.get("", response_model=UserListResponse)
def users_index(
    _: User = Depends(require_admin_actor),
    db: Session = Depends(get_db),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> UserListResponse:
    users, total = list_users(db, offset=offset, limit=limit)
    return UserListResponse(items=[to_user_read(user) for user in users], total=total, offset=offset, limit=limit)


@router.post("", response_model=UserRead)
def users_create(
    payload: UserCreate,
    request: Request,
    actor: User = Depends(require_admin_actor),
    db: Session = Depends(get_db),
) -> UserRead:
    try:
        user = create_user(db, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    record_audit_event(
        db,
        event_code="USER_CREATED",
        event_type=AuditEventType.USER,
        action="user.created",
        actor=actor,
        resource_type="User",
        resource_id=str(user.id),
        description=f"Created NEXUS user {user.email} with role {payload.role.value}.",
        severity=AuditSeverity.INFO,
        metadata={"role": payload.role.value, "department": payload.department},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return to_user_read(user)


@router.get("/system-units")
def users_system_units(
    _: User = Depends(require_admin_actor),
    db: Session = Depends(get_db),
) -> list[dict[str, str]]:
    return list_system_units(db)


@router.patch("/{user_id}/role", response_model=UserRoleUpdateResponse)
def update_user_role(
    user_id: uuid.UUID,
    payload: UserRoleUpdate,
    request: Request,
    actor: User = Depends(require_admin_actor),
    db: Session = Depends(get_db),
) -> UserRoleUpdateResponse:
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    previous_role = user.role.name if user.role else None
    updated = set_user_role(db, user, payload.role)
    record_audit_event(
        db,
        event_code="USER_ROLE_CHANGED",
        event_type=AuditEventType.USER,
        action="user.role.changed",
        actor=actor,
        resource_type="User",
        resource_id=str(user.id),
        description=f"Changed user role from {previous_role.value if previous_role else 'UNKNOWN'} to {payload.role.value}.",
        severity=AuditSeverity.WARNING,
        metadata={"previousRole": previous_role.value if previous_role else None, "newRole": payload.role.value},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return UserRoleUpdateResponse(user=to_user_read(updated))
