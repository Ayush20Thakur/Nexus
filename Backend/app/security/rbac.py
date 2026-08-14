from __future__ import annotations

from collections.abc import Iterable

from app.models.enums import RoleName
from app.models.user import User

ROLE_LEVELS: dict[RoleName, int] = {
    RoleName.VIEWER: 0,
    RoleName.OPERATOR: 1,
    RoleName.MANAGER: 2,
    RoleName.ADMIN: 3,
}


def role_name(user: User) -> RoleName:
    if not user.role:
        return RoleName.VIEWER
    return user.role.name


def role_at_least(actual: RoleName, required: RoleName) -> bool:
    return ROLE_LEVELS[actual] >= ROLE_LEVELS[required]


def has_any_role(user: User, allowed_roles: Iterable[RoleName]) -> bool:
    actual = role_name(user)
    return actual == RoleName.ADMIN or actual in set(allowed_roles)


def user_permissions(user: User) -> set[str]:
    permissions = set(user.permissions or [])
    if user.role:
        permissions.update(permission.permission for permission in user.role.permissions)
    return permissions


def has_permission(user: User, required_permission: str) -> bool:
    permissions = user_permissions(user)
    if "*" in permissions:
        return True
    if required_permission in permissions:
        return True
    prefix = required_permission.split(":", 1)[0] + ":*"
    return prefix in permissions
