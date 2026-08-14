from __future__ import annotations

import uuid

from app.models.enums import RoleName
from app.models.user import Role, RolePermission, User
from app.security.rbac import has_permission, role_at_least, user_permissions


def test_role_hierarchy() -> None:
    assert role_at_least(RoleName.ADMIN, RoleName.VIEWER)
    assert role_at_least(RoleName.MANAGER, RoleName.OPERATOR)
    assert not role_at_least(RoleName.OPERATOR, RoleName.MANAGER)


def test_user_permissions_include_role_permissions() -> None:
    role = Role(id=uuid.uuid4(), name=RoleName.MANAGER, description="Manager")
    role.permissions = [RolePermission(id=uuid.uuid4(), role_id=role.id, permission="requests:approve")]
    user = User(
        id=uuid.uuid4(),
        email="manager@nexus.corp",
        display_name="Manager",
        department="Ops",
        role_id=role.id,
        role=role,
        permissions=["reports:export"],
    )

    assert user_permissions(user) == {"requests:approve", "reports:export"}
    assert has_permission(user, "requests:approve")
    assert has_permission(user, "reports:export")
    assert not has_permission(user, "policies:manage")
