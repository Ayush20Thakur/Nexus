from __future__ import annotations

import uuid

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session, selectinload

from app.models.enums import RoleName
from app.models.enums import FulfillmentStatus, InventoryStatus, RequestStatus
from app.models.inventory import InventoryItem
from app.models.operations import FulfillmentOrder, OperationalRequest
from app.models.user import Role, User
from app.schemas.user import UserRead
from app.security.rbac import user_permissions


def get_user_by_supabase_subject(db: Session, subject: uuid.UUID) -> User | None:
    return db.execute(
        select(User)
        .options(selectinload(User.role).selectinload(Role.permissions))
        .where(User.supabase_auth_user_id == subject, User.is_active.is_(True))
    ).scalar_one_or_none()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.execute(
        select(User)
        .options(selectinload(User.role).selectinload(Role.permissions))
        .where(func.lower(User.email) == email.lower(), User.is_active.is_(True))
    ).scalar_one_or_none()


def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.execute(
        select(User)
        .options(selectinload(User.role).selectinload(Role.permissions))
        .where(User.id == user_id)
    ).scalar_one_or_none()


def list_users(db: Session, *, offset: int = 0, limit: int = 50) -> tuple[list[User], int]:
    total = db.scalar(select(func.count()).select_from(User)) or 0
    users = db.execute(
        select(User)
        .options(selectinload(User.role).selectinload(Role.permissions))
        .order_by(User.display_name.asc())
        .offset(offset)
        .limit(limit)
    ).scalars().all()
    return list(users), total


def create_user(db: Session, payload: dict, *, external_id: str | None = None) -> User:
    email = str(payload["email"]).lower().strip()
    existing = get_user_by_email(db, email)
    if existing is not None:
        raise ValueError("A NEXUS user with that email already exists.")
    role_name = RoleName(payload.get("role", RoleName.VIEWER.value))
    role = db.execute(select(Role).where(Role.name == role_name)).scalar_one_or_none()
    if role is None:
        raise ValueError(f"Role {role_name.value} does not exist.")
    user = User(
        id=uuid.uuid4(),
        external_id=external_id or f"usr-{uuid.uuid4().hex[:12]}",
        supabase_auth_user_id=None,
        email=email,
        display_name=str(payload["display_name"]).strip(),
        department=str(payload["department"]).strip(),
        role_id=role.id,
        role=role,
        permissions=list(payload.get("permissions") or []),
        is_active=True,
    )
    db.add(user)
    db.flush()
    return get_user_by_id(db, user.id) or user


def set_user_role(db: Session, user: User, role_name: RoleName) -> User:
    role = db.execute(select(Role).where(Role.name == role_name)).scalar_one_or_none()
    if role is None:
        raise ValueError(f"Role {role_name.value} does not exist.")
    user.role_id = role.id
    user.role = role
    db.add(user)
    db.flush()
    db.refresh(user)
    return get_user_by_id(db, user.id) or user


def list_system_units(db: Session) -> list[dict[str, str]]:
    table_count = db.execute(
        text("select count(*) from information_schema.tables where table_schema = 'public'")
    ).scalar_one()
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    total_requests = db.scalar(select(func.count()).select_from(OperationalRequest)) or 0
    pending_requests = db.scalar(
        select(func.count())
        .select_from(OperationalRequest)
        .where(OperationalRequest.status == RequestStatus.PENDING)
    ) or 0
    total_orders = db.scalar(select(func.count()).select_from(FulfillmentOrder)) or 0
    active_orders = db.scalar(
        select(func.count()).select_from(FulfillmentOrder).where(FulfillmentOrder.status != FulfillmentStatus.DELIVERED)
    ) or 0
    total_items = db.scalar(select(func.count()).select_from(InventoryItem)) or 0
    low_items = db.scalar(
        select(func.count()).select_from(InventoryItem).where(InventoryItem.status.in_([InventoryStatus.LOW, InventoryStatus.CRITICAL]))
    ) or 0
    request_load = round((pending_requests / total_requests) * 100) if total_requests else 0
    fulfillment_load = round((active_orders / total_orders) * 100) if total_orders else 0
    inventory_risk = round((low_items / total_items) * 100) if total_items else 0
    return [
        {"name": "PostgreSQL public schema", "status": "Healthy", "load": f"{table_count} tables"},
        {"name": "NEXUS user directory", "status": "Healthy", "load": f"{total_users} active users"},
        {"name": "Request queue", "status": "Backlog" if request_load else "Clear", "load": f"{request_load}% pending"},
        {"name": "Fulfillment queue", "status": "Active" if active_orders else "Clear", "load": f"{fulfillment_load}% in progress"},
        {"name": "Inventory risk monitor", "status": "Attention" if low_items else "Healthy", "load": f"{inventory_risk}% low stock"},
    ]


def to_user_read(user: User) -> UserRead:
    permissions = sorted(user_permissions(user))
    return UserRead(
        id=user.id,
        external_id=user.external_id,
        supabase_auth_user_id=user.supabase_auth_user_id,
        email=user.email,
        display_name=user.display_name,
        department=user.department,
        role=user.role.name,
        permissions=permissions,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
    )
