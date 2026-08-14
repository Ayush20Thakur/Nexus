from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.enums import AuditEventType, AuditSeverity, PolicyStatus
from app.models.intelligence import Policy, PolicyRule
from app.models.user import User
from app.services.audit_service import record_audit_event
from app.services.serializers import policy_to_frontend


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def list_policies(db: Session) -> list[dict[str, Any]]:
    policies = db.scalars(select(Policy).options(joinedload(Policy.rules)).order_by(Policy.updated_at.desc())).unique().all()
    return [policy_to_frontend(policy) for policy in policies]


def get_policy(db: Session, policy_id: str) -> Policy:
    policy = db.scalar(
        select(Policy)
        .options(joinedload(Policy.rules))
        .where(or_(Policy.external_id == policy_id, cast(Policy.id, String) == policy_id))
    )
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found.")
    return policy


def create_policy(db: Session, payload: dict[str, Any], actor: User, ip_address: str | None = None) -> Policy:
    policy = Policy(
        id=uuid.uuid4(),
        external_id=f"pol-{uuid.uuid4().hex[:12]}",
        title=str(payload["title"]).strip(),
        description=str(payload["description"]).strip(),
        version=str(payload.get("version", "1.0")).strip(),
        status=PolicyStatus(payload.get("status", PolicyStatus.ACTIVE.value)),
        category=str(payload.get("category", "General")).strip(),
        created_by_user_id=actor.id,
        updated_by_user_id=actor.id,
        created_by_name=str(payload.get("createdBy") or actor.display_name).strip(),
        updated_by_name=str(payload.get("updatedBy") or actor.display_name).strip(),
        effective_date=_parse_datetime(payload.get("effectiveDate")),
        expiry_date=_parse_datetime(payload.get("expiryDate")),
    )
    for rule_payload in payload.get("rules", []):
        policy.rules.append(
            PolicyRule(
                id=uuid.uuid4(),
                external_id=f"pr-{uuid.uuid4().hex[:12]}",
                description=str(rule_payload["description"]).strip(),
                is_active=bool(rule_payload.get("isActive", True)),
                scope=str(rule_payload.get("scope", "Global")).strip(),
            )
        )
    db.add(policy)
    db.flush()
    record_audit_event(
        db,
        event_code="POLICY_CREATED",
        event_type=AuditEventType.POLICY,
        action="policy.created",
        actor=actor,
        resource_type="Policy",
        resource_id=policy.external_id or str(policy.id),
        description=f"Created policy {policy.title} v{policy.version}.",
        severity=AuditSeverity.INFO,
        metadata={"status": policy.status.value, "category": policy.category},
        ip_address=ip_address,
    )
    return policy


def update_policy(db: Session, policy_id: str, payload: dict[str, Any], actor: User, ip_address: str | None = None) -> Policy:
    policy = get_policy(db, policy_id)
    for key, attr in {
        "title": "title",
        "description": "description",
        "version": "version",
        "category": "category",
        "updatedBy": "updated_by_name",
    }.items():
        if key in payload:
            setattr(policy, attr, payload[key])
    if "status" in payload:
        policy.status = PolicyStatus(payload["status"])
    if "effectiveDate" in payload:
        policy.effective_date = _parse_datetime(payload["effectiveDate"])
    if "expiryDate" in payload:
        policy.expiry_date = _parse_datetime(payload["expiryDate"])
    policy.updated_by_user_id = actor.id
    if "rules" in payload:
        policy.rules.clear()
        db.flush()
        for rule_payload in payload["rules"]:
            policy.rules.append(
                PolicyRule(
                    id=uuid.uuid4(),
                    external_id=f"pr-{uuid.uuid4().hex[:12]}",
                    description=str(rule_payload["description"]).strip(),
                    is_active=bool(rule_payload.get("isActive", True)),
                    scope=str(rule_payload.get("scope", "Global")).strip(),
                )
            )
    record_audit_event(
        db,
        event_code="POLICY_UPDATED",
        event_type=AuditEventType.POLICY,
        action="policy.updated",
        actor=actor,
        resource_type="Policy",
        resource_id=policy.external_id or str(policy.id),
        description=f"Updated policy {policy.title}.",
        severity=AuditSeverity.INFO,
        metadata={"status": policy.status.value},
        ip_address=ip_address,
    )
    db.flush()
    return policy


def toggle_policy_status(db: Session, policy_id: str, actor: User, ip_address: str | None = None) -> Policy:
    policy = get_policy(db, policy_id)
    policy.status = PolicyStatus.ARCHIVED if policy.status == PolicyStatus.ACTIVE else PolicyStatus.ACTIVE
    policy.updated_by_user_id = actor.id
    policy.updated_by_name = actor.display_name
    record_audit_event(
        db,
        event_code="POLICY_STATUS_TOGGLED",
        event_type=AuditEventType.POLICY,
        action="policy.status_toggled",
        actor=actor,
        resource_type="Policy",
        resource_id=policy.external_id or str(policy.id),
        description=f"Changed policy {policy.title} status to {policy.status.value}.",
        severity=AuditSeverity.INFO,
        metadata={"status": policy.status.value},
        ip_address=ip_address,
    )
    db.flush()
    return policy
