from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.enums import ApprovalStatus, AuditEventType, AuditSeverity, FulfillmentStatus, RequestStatus
from app.models.operations import Approval, FulfillmentOrder
from app.models.user import User
from app.services.audit_service import record_audit_event
from app.services.serializers import approval_to_frontend, fulfillment_to_frontend, request_to_frontend


def list_approvals(db: Session) -> list[dict[str, Any]]:
    approvals = db.scalars(
        select(Approval)
        .options(joinedload(Approval.request))
        .order_by(Approval.created_at.desc())
    ).unique().all()
    return [approval_to_frontend(approval) for approval in approvals]


def get_approval(db: Session, approval_id: str) -> Approval:
    approval = db.scalar(
        select(Approval)
        .options(joinedload(Approval.request))
        .where(or_(Approval.external_id == approval_id, cast(Approval.id, String) == approval_id))
    )
    if approval is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found.")
    return approval


def approve_approval(
    db: Session,
    approval_id: str,
    actor: User,
    note: str | None = None,
    ip_address: str | None = None,
) -> dict[str, Any]:
    approval = get_approval(db, approval_id)
    request = approval.request
    now = datetime.now(UTC)
    approval.status = ApprovalStatus.APPROVED
    approval.quantity_approved = approval.quantity_requested
    approval.approver_user_id = actor.id
    approval.decision_note = note
    approval.decided_at = now
    request.status = RequestStatus.APPROVED

    fulfillment = db.scalar(select(FulfillmentOrder).where(FulfillmentOrder.approval_id == approval.id))
    if fulfillment is None:
        fulfillment = FulfillmentOrder(
            id=uuid.uuid4(),
            external_id=f"ful-{uuid.uuid4().hex[:12]}",
            request_id=request.id,
            approval_id=approval.id,
            requested_by_user_id=request.requester_user_id,
            approved_by_user_id=actor.id,
            request_number=request.request_number,
            title=request.title,
            requested_by_name=request.requester_name,
            approved_by_name=actor.display_name,
            approved_quantity=approval.quantity_requested,
            available_stock=approval.available_stock or 0,
            safety_stock_min=max(0, int((approval.safety_stock or 0) * 0.5)),
            safety_stock_max=max(approval.safety_stock or 0, int((approval.safety_stock or 0) * 1.5)),
            unit=approval.unit,
            status=FulfillmentStatus.QUEUED,
            priority=request.priority,
            approved_at=now,
        )
        db.add(fulfillment)

    record_audit_event(
        db,
        event_code="APPROVAL_GRANTED",
        event_type=AuditEventType.APPROVAL,
        action="request.approved",
        actor=actor,
        resource_type="OperationalRequest",
        resource_id=request.request_number,
        description=f"Approved request {request.request_number}: {request.title}.",
        severity=AuditSeverity.INFO,
        metadata={"quantity": approval.quantity_requested, "note": note},
        ip_address=ip_address,
    )
    db.flush()
    return {
        "approval": approval_to_frontend(approval),
        "request": request_to_frontend(request),
        "fulfillment": fulfillment_to_frontend(fulfillment),
    }


def reject_approval(
    db: Session,
    approval_id: str,
    actor: User,
    reason: str,
    ip_address: str | None = None,
) -> dict[str, Any]:
    approval = get_approval(db, approval_id)
    request = approval.request
    approval.status = ApprovalStatus.REJECTED
    approval.approver_user_id = actor.id
    approval.decision_note = reason
    approval.decided_at = datetime.now(UTC)
    request.status = RequestStatus.REJECTED
    request.rejection_reason = reason

    record_audit_event(
        db,
        event_code="APPROVAL_REJECTED",
        event_type=AuditEventType.APPROVAL,
        action="request.rejected",
        actor=actor,
        resource_type="OperationalRequest",
        resource_id=request.request_number,
        description=f"Rejected request {request.request_number}. Reason: {reason}",
        severity=AuditSeverity.WARNING,
        metadata={"reason": reason},
        ip_address=ip_address,
    )
    db.flush()
    return {"approval": approval_to_frontend(approval), "request": request_to_frontend(request)}


def clarify_approval(
    db: Session,
    approval_id: str,
    actor: User,
    message: str,
    ip_address: str | None = None,
) -> dict[str, Any]:
    approval = get_approval(db, approval_id)
    request = approval.request
    approval.status = ApprovalStatus.CLARIFYING
    approval.approver_user_id = actor.id
    approval.decision_note = message
    request.clarify_message = message

    record_audit_event(
        db,
        event_code="CLARIFICATION_REQUESTED",
        event_type=AuditEventType.APPROVAL,
        action="request.clarification_requested",
        actor=actor,
        resource_type="OperationalRequest",
        resource_id=request.request_number,
        description=f"Clarification requested for {request.request_number}: {message}",
        severity=AuditSeverity.INFO,
        metadata={"message": message},
        ip_address=ip_address,
    )
    db.flush()
    return {"approval": approval_to_frontend(approval), "request": request_to_frontend(request)}
