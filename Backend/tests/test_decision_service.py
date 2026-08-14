from __future__ import annotations

from decimal import Decimal

from app.models.enums import AIDecision, InventoryStatus, RequestPriority, RequestStatus, RequestType
from app.services.decision_service import InventoryDecisionInput, RequestDecisionInput, evaluate_low_stock_reorder, evaluate_request_decision


def test_auto_approve_standard_request_rule() -> None:
    result = evaluate_request_decision(
        RequestDecisionInput(
            type=RequestType.STANDARD,
            priority=RequestPriority.NORMAL,
            status=RequestStatus.PENDING,
            quantity=12,
            ai_confidence=97,
        )
    )
    assert result.decision == AIDecision.APPROVE
    assert result.applied_rules == ["Auto-Approve Standard Requests"]


def test_critical_pending_request_escalates() -> None:
    result = evaluate_request_decision(
        RequestDecisionInput(
            type=RequestType.PURCHASE,
            priority=RequestPriority.CRITICAL,
            status=RequestStatus.PENDING,
            quantity=30,
            ai_confidence=92,
            total_value=Decimal("126000"),
        )
    )
    assert result.decision == AIDecision.ESCALATE
    assert result.requires_manual_review is True


def test_high_value_purchase_requires_review() -> None:
    result = evaluate_request_decision(
        RequestDecisionInput(
            type=RequestType.PURCHASE,
            priority=RequestPriority.HIGH,
            status=RequestStatus.PENDING,
            quantity=8,
            ai_confidence=76,
            total_value=Decimal("224000"),
        )
    )
    assert result.decision == AIDecision.REVIEW
    assert result.applied_rules == ["High-Value Purchase Review"]


def test_low_stock_auto_reorder_rule() -> None:
    result = evaluate_low_stock_reorder(
        InventoryDecisionInput(
            quantity_on_hand=14,
            reorder_threshold=30,
            status=InventoryStatus.CRITICAL,
        )
    )
    assert result.should_create_request is True
    assert result.suggested_quantity == 46
