from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import RoleName


class RoleRead(BaseModel):
    id: uuid.UUID
    name: RoleName
    description: str | None = None
    permissions: list[str]


class UserRead(BaseModel):
    id: uuid.UUID
    external_id: str | None = None
    supabase_auth_user_id: uuid.UUID | None = None
    email: EmailStr
    display_name: str
    department: str
    role: RoleName
    permissions: list[str]
    avatar_url: str | None = None
    is_active: bool
    last_login_at: datetime | None = None


class UserListResponse(BaseModel):
    items: list[UserRead]
    total: int
    offset: int
    limit: int


class UserCreate(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=1, max_length=120)
    department: str = Field(min_length=1, max_length=120)
    role: RoleName = RoleName.VIEWER
    permissions: list[str] = Field(default_factory=list)


class UserRoleUpdate(BaseModel):
    role: RoleName


class UserRoleUpdateResponse(BaseModel):
    user: UserRead
