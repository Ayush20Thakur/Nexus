from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.audit import AuditEvent
from app.models.enums import AuditEventType, AuditSeverity, RoleName
from app.models.user import User


def record_audit_event(
    db: Session,
    *,
    event_code: str,
    event_type: AuditEventType,
    action: str,
    actor: User,
    resource_type: str,
    resource_id: str,
    description: str,
    severity: AuditSeverity = AuditSeverity.INFO,
    metadata: dict | None = None,
    ip_address: str | None = None,
) -> AuditEvent:
    event = AuditEvent(
        event_code=event_code,
        type=event_type,
        action=action,
        actor_user_id=actor.id,
        actor_name=actor.display_name,
        actor_role=actor.role.name if actor.role else RoleName.VIEWER,
        resource_type=resource_type,
        resource_id=resource_id,
        description=description,
        event_metadata=metadata or {},
        ip_address=ip_address,
        severity=severity,
    )
    db.add(event)
    db.flush()
    return event
