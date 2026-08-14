from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AuditEventType, AuditSeverity, RoleName, enum_values


class AuditEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_events_event_code", "event_code"),
        Index("ix_audit_events_type", "type"),
        Index("ix_audit_events_actor_user_id", "actor_user_id"),
        Index("ix_audit_events_resource", "resource_type", "resource_id"),
        Index("ix_audit_events_timestamp", "timestamp"),
    )

    external_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    event_code: Mapped[str] = mapped_column(String(80), nullable=False)
    type: Mapped[AuditEventType] = mapped_column(Enum(AuditEventType, name="audit_event_type", values_callable=enum_values), nullable=False)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    actor_name: Mapped[str] = mapped_column(String(120), nullable=False)
    actor_role: Mapped[RoleName] = mapped_column(Enum(RoleName, name="role_name", values_callable=enum_values), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(120), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    event_metadata: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    ip_address: Mapped[str | None] = mapped_column(String(64))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    severity: Mapped[AuditSeverity] = mapped_column(Enum(AuditSeverity, name="audit_severity", values_callable=enum_values), nullable=False)

    actor: Mapped["User | None"] = relationship()
