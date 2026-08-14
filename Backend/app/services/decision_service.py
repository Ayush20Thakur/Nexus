from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.models.enums import (
    AIDecision,
    AuditEventType,
    AuditSeverity,
    InventoryStatus,
    RequestPriority,
    RequestStatus,
    RequestType,
    RuleCategory,
    RuleStatus,
)
from app.models.intelligence import DecisionOutcome, DecisionRule
from app.models.operations import OperationalRequest
from app.models.user import User
from app.services.audit_service import record_audit_event
from app.services.serializers import rule_to_frontend


@dataclass(frozen=True)
class RequestDecisionInput:
    type: RequestType
    priority: RequestPriority
    status: RequestStatus
    quantity: int | None
    ai_confidence: int | None
    total_value: Decimal | None = None


@dataclass(frozen=True)
class InventoryDecisionInput:
    quantity_on_hand: int
    reorder_threshold: int
    status: InventoryStatus


@dataclass(frozen=True)
class DecisionResult:
    decision: AIDecision
    confidence: int | None
    reasoning: str
    applied_rules: list[str]
    requires_manual_review: bool = False


@dataclass(frozen=True)
class ReorderResult:
    should_create_request: bool
    reasoning: str
    suggested_quantity: int | None = None
    applied_rules: list[str] | None = None


def evaluate_request_decision(request: RequestDecisionInput) -> DecisionResult:
    if (
        request.type == RequestType.STANDARD
        and request.quantity is not None
        and request.quantity <= 50
        and request.ai_confidence is not None
        and request.ai_confidence >= 90
    ):
        return DecisionResult(
            decision=AIDecision.APPROVE,
            confidence=request.ai_confidence,
            reasoning="Standard request volume and confidence threshold allow automatic approval.",
            applied_rules=["Auto-Approve Standard Requests"],
        )

    if request.priority == RequestPriority.CRITICAL and request.status == RequestStatus.PENDING:
        return DecisionResult(
            decision=AIDecision.ESCALATE,
            confidence=request.ai_confidence,
            reasoning="Critical pending request requires escalation before fulfillment.",
            applied_rules=["Critical Request Escalation"],
            requires_manual_review=True,
        )

    if request.total_value is not None and request.total_value > Decimal("10000"):
        return DecisionResult(
            decision=AIDecision.REVIEW,
            confidence=request.ai_confidence,
            reasoning="High-value purchase exceeds manual review threshold.",
            applied_rules=["High-Value Purchase Review"],
            requires_manual_review=True,
        )

    return DecisionResult(
        decision=AIDecision.REVIEW,
        confidence=request.ai_confidence,
        reasoning="No automatic decision rule matched; human review is required.",
        applied_rules=[],
        requires_manual_review=True,
    )


def evaluate_low_stock_reorder(inventory: InventoryDecisionInput) -> ReorderResult:
    if (
        inventory.quantity_on_hand <= inventory.reorder_threshold
        and inventory.status in {InventoryStatus.LOW, InventoryStatus.CRITICAL}
    ):
        suggested_quantity = max(inventory.reorder_threshold * 2 - inventory.quantity_on_hand, inventory.reorder_threshold)
        return ReorderResult(
            should_create_request=True,
            suggested_quantity=suggested_quantity,
            reasoning="Inventory is at or below reorder threshold with LOW/CRITICAL status.",
            applied_rules=["Low Stock Auto-Reorder"],
        )
    return ReorderResult(
        should_create_request=False,
        reasoning="Inventory does not meet low-stock auto-reorder conditions.",
        applied_rules=[],
    )


def _percent(part: float | int, total: float | int) -> int:
    return round((float(part) / float(total)) * 100) if total else 0


def list_decision_rules(db: Session) -> list[dict[str, Any]]:
    rules = db.scalars(select(DecisionRule).order_by(DecisionRule.priority.asc(), DecisionRule.created_at.desc())).all()
    return [rule_to_frontend(rule) for rule in rules]


def get_decision_rule(db: Session, rule_id: str) -> DecisionRule:
    rule = db.scalar(
        select(DecisionRule).where(or_(DecisionRule.external_id == rule_id, cast(DecisionRule.id, String) == rule_id))
    )
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision rule not found.")
    return rule


def decision_engine_metrics(db: Session) -> dict[str, Any]:
    total_rules = db.scalar(select(func.count()).select_from(DecisionRule)) or 0
    active_rules = db.scalar(
        select(func.count()).select_from(DecisionRule).where(DecisionRule.status == RuleStatus.ACTIVE)
    ) or 0
    total_triggers = db.scalar(select(func.coalesce(func.sum(DecisionRule.trigger_count), 0))) or 0
    total_requests = db.scalar(select(func.count()).select_from(OperationalRequest)) or 0
    automated_approvals = db.scalar(
        select(func.count()).select_from(OperationalRequest).where(OperationalRequest.ai_decision == AIDecision.APPROVE)
    ) or 0
    manual_review_queue = db.scalar(
        select(func.count())
        .select_from(OperationalRequest)
        .where(
            OperationalRequest.status == RequestStatus.PENDING,
            OperationalRequest.ai_decision.in_([AIDecision.REVIEW, AIDecision.ESCALATE]),
        )
    ) or 0
    avg_confidence = db.scalar(select(func.avg(OperationalRequest.ai_confidence))) or 0
    total_outcomes = db.scalar(select(func.count()).select_from(DecisionOutcome)) or 0
    covered_outcomes = db.scalar(
        select(func.count()).select_from(DecisionOutcome).where(DecisionOutcome.rule_id.is_not(None))
    ) or 0
    return {
        "totalRules": int(total_rules),
        "activeRules": int(active_rules),
        "ruleTriggers": int(total_triggers),
        "averageConfidence": round(float(avg_confidence)),
        "automationRate": _percent(automated_approvals, total_requests),
        "manualReviewQueue": int(manual_review_queue),
        "ruleCoverage": _percent(covered_outcomes, total_outcomes),
    }


def create_decision_rule(db: Session, payload: dict[str, Any], actor: User, ip_address: str | None = None) -> DecisionRule:
    rule = DecisionRule(
        id=uuid.uuid4(),
        external_id=f"rule-{uuid.uuid4().hex[:12]}",
        name=str(payload["name"]).strip(),
        description=str(payload["description"]).strip(),
        category=RuleCategory(payload["category"]),
        status=RuleStatus(payload.get("status", RuleStatus.ACTIVE.value)),
        priority=int(payload.get("priority", 1)),
        conditions=payload.get("conditions", []),
        actions=payload.get("actions", []),
        trigger_count=0,
        created_by_user_id=actor.id,
        created_by_name=str(payload.get("createdBy") or actor.display_name).strip(),
    )
    db.add(rule)
    db.flush()
    record_audit_event(
        db,
        event_code="RULE_CREATED",
        event_type=AuditEventType.AI,
        action="rule.created",
        actor=actor,
        resource_type="DecisionRule",
        resource_id=rule.external_id or str(rule.id),
        description=f"Created decision rule: {rule.name}.",
        severity=AuditSeverity.INFO,
        metadata={"category": rule.category.value, "status": rule.status.value},
        ip_address=ip_address,
    )
    return rule


def toggle_decision_rule(db: Session, rule_id: str, actor: User, ip_address: str | None = None) -> DecisionRule:
    rule = get_decision_rule(db, rule_id)
    rule.status = RuleStatus.INACTIVE if rule.status == RuleStatus.ACTIVE else RuleStatus.ACTIVE
    record_audit_event(
        db,
        event_code="RULE_STATUS_TOGGLED",
        event_type=AuditEventType.AI,
        action="rule.status_toggled",
        actor=actor,
        resource_type="DecisionRule",
        resource_id=rule.external_id or str(rule.id),
        description=f"Changed decision rule {rule.name} status to {rule.status.value}.",
        severity=AuditSeverity.INFO,
        metadata={"status": rule.status.value},
        ip_address=ip_address,
    )
    db.flush()
    return rule


def simulate_request_decision(payload: dict[str, Any]) -> dict[str, Any]:
    quantity = int(payload.get("quantity", 30))
    priority = RequestPriority(payload.get("priority", RequestPriority.NORMAL.value))
    request_type = RequestType(payload.get("type", RequestType.STANDARD.value))
    if priority == RequestPriority.CRITICAL:
        confidence = min(99, 90 + min(quantity, 90) // 10)
    elif quantity > 50:
        confidence = max(70, 90 - ((quantity - 50) // 5))
    else:
        confidence = min(98, 90 + ((50 - quantity) // 10))
    result = evaluate_request_decision(
        RequestDecisionInput(
            type=request_type,
            priority=priority,
            status=RequestStatus.PENDING,
            quantity=quantity,
            ai_confidence=confidence,
        )
    )
    return {
        "decision": result.decision.value,
        "confidence": result.confidence or confidence,
        "reasoning": result.reasoning,
        "rulesTriggered": result.applied_rules,
        "evaluatedAt": datetime.now(UTC).isoformat(),
    }
