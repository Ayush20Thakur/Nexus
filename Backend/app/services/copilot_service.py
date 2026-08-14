from __future__ import annotations

import uuid
from datetime import UTC, datetime
import re
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.enums import (
    AIDecision,
    ApprovalStatus,
    CopilotMessageRole,
    FulfillmentStatus,
    InventoryStatus,
    ModelStatus,
    RequestPriority,
    RequestStatus,
)
from app.models.intelligence import AIModel, CopilotConversation, CopilotMessage
from app.models.inventory import InventoryItem
from app.models.operations import Approval, FulfillmentOrder, OperationalRequest
from app.models.reporting import Report
from app.models.user import User
from app.services.serializers import iso_datetime, public_id

REQUEST_NUMBER_RE = re.compile(r"\bREQ-\d{4,6}-[A-Z]\b", re.IGNORECASE)


def _tokens(query: str) -> set[str]:
    return {token for token in re.split(r"[^a-z0-9]+", query.lower()) if token}


def classify_copilot_intent(query: str) -> str:
    """Classify short natural-language Copilot prompts without external calls."""
    cleaned = query.strip().lower()
    tokens = _tokens(cleaned)

    if not cleaned:
        return "empty"
    if len(tokens) <= 6 and tokens & {"hi", "hello", "hey", "yo", "namaste"}:
        return "greeting"
    if "how are you" in cleaned or "who are you" in cleaned:
        return "greeting"
    if tokens & {"thanks", "thank", "ty"}:
        return "thanks"
    if tokens & {"bye", "goodbye"}:
        return "closing"
    if "what can you do" in cleaned or tokens & {"help", "capabilities", "commands"}:
        return "help"
    if REQUEST_NUMBER_RE.search(query) or "request" in tokens and tokens & {"detail", "details", "explain", "inference", "why"}:
        return "request_detail"
    if tokens & {"brief", "executive", "risk", "posture"} or "next action" in cleaned:
        return "summary"
    if tokens & {"critical", "approval", "approve", "authority", "escalate", "pending"}:
        return "approval"
    if tokens & {"inventory", "stock", "sku", "reorder", "safety", "warehouse"}:
        return "inventory"
    if tokens & {"fulfillment", "shipping", "ship", "delivered", "dispatch", "carrier"}:
        return "fulfillment"
    if tokens & {"audit", "activity", "changed", "changes", "log"}:
        return "audit"
    if tokens & {"report", "analytics", "summary", "dashboard", "stats", "insight", "kpi"}:
        return "summary"
    return "general"


def _count(db: Session, statement: Any) -> int:
    return int(db.scalar(statement) or 0)


def _context_snapshot(db: Session) -> dict[str, Any]:
    total_inventory = _count(db, select(func.coalesce(func.sum(InventoryItem.quantity_on_hand), 0)))
    pending_approvals = _count(
        db,
        select(func.count()).select_from(Approval).where(Approval.status == ApprovalStatus.PENDING),
    )
    pending_requests = _count(
        db,
        select(func.count()).select_from(OperationalRequest).where(OperationalRequest.status == RequestStatus.PENDING),
    )
    critical_requests = _count(
        db,
        select(func.count())
        .select_from(OperationalRequest)
        .where(OperationalRequest.priority == RequestPriority.CRITICAL, OperationalRequest.status == RequestStatus.PENDING),
    )
    low_stock_items = _count(
        db,
        select(func.count())
        .select_from(InventoryItem)
        .where(InventoryItem.status.in_([InventoryStatus.LOW, InventoryStatus.CRITICAL])),
    )
    delivered = _count(
        db,
        select(func.count()).select_from(FulfillmentOrder).where(FulfillmentOrder.status == FulfillmentStatus.DELIVERED),
    )
    fulfillment_total = _count(db, select(func.count()).select_from(FulfillmentOrder))
    reports_generated = _count(
        db,
        select(func.count()).select_from(Report).where(Report.generated_at.is_not(None)),
    )
    active_model = db.scalar(
        select(AIModel).where(AIModel.status == ModelStatus.ACTIVE).order_by(AIModel.deployed_at.desc().nullslast()).limit(1)
    )
    return {
        "availableInventory": total_inventory,
        "pendingRequests": pending_requests,
        "criticalRequests": critical_requests,
        "pendingApprovals": pending_approvals,
        "lowStockItems": low_stock_items,
        "fulfillmentOrders": fulfillment_total,
        "deliveredOrders": delivered,
        "reportsGenerated": reports_generated,
        "activeModel": active_model.name if active_model else "No active model registered",
        "activeModelVersion": active_model.version if active_model else None,
    }


def _message_to_frontend(message: CopilotMessage) -> dict[str, Any]:
    return {
        "id": public_id(message),
        "role": message.role.value,
        "content": message.content,
        "timestamp": iso_datetime(message.created_at) or datetime.now(UTC).isoformat(),
        "isStreaming": message.is_streaming,
    }


def _conversation_summary(conversation: CopilotConversation) -> dict[str, Any]:
    return {
        "id": public_id(conversation),
        "title": conversation.title,
        "createdAt": iso_datetime(conversation.created_at),
        "updatedAt": iso_datetime(conversation.updated_at),
    }


def _initial_message(actor: User, context: dict[str, Any]) -> str:
    return (
        f"Hello {actor.display_name}. I am NEXUS Copilot. "
        f"I can answer from the connected PostgreSQL database. Current state: "
        f"{context['pendingRequests']} pending requests, {context['pendingApprovals']} pending approvals, "
        f"{context['lowStockItems']} low-stock SKUs, and {context['availableInventory']} units on hand."
    )


def _suggestions(context: dict[str, Any]) -> list[str]:
    suggestions = [
        "Which approvals need attention first?",
        "Show low stock inventory and reorder exposure.",
        "Summarize fulfillment progress and blockers.",
        "What changed in the latest audit activity?",
    ]
    if context["criticalRequests"]:
        suggestions.insert(0, "List critical pending requests.")
    if context["lowStockItems"]:
        suggestions.insert(1, "Which SKUs are below safety stock?")
    return suggestions[:6]


def _get_latest_conversation(db: Session, actor: User) -> CopilotConversation | None:
    return db.scalar(
        select(CopilotConversation)
        .where(CopilotConversation.user_id == actor.id)
        .order_by(CopilotConversation.updated_at.desc())
        .limit(1)
    )


def _get_conversation(db: Session, actor: User, conversation_id: str | None) -> CopilotConversation:
    if not conversation_id:
        conversation = _get_latest_conversation(db, actor)
        if conversation is not None:
            return conversation
        return start_copilot_conversation(db, actor)
    conversation = db.scalar(
        select(CopilotConversation).where(
            CopilotConversation.user_id == actor.id,
            or_(CopilotConversation.external_id == conversation_id, cast(CopilotConversation.id, String) == conversation_id),
        )
    )
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Copilot conversation not found.")
    return conversation


def _conversation_messages(db: Session, conversation: CopilotConversation) -> list[CopilotMessage]:
    return list(
        db.scalars(
            select(CopilotMessage)
            .where(CopilotMessage.conversation_id == conversation.id)
            .order_by(CopilotMessage.created_at.asc(), CopilotMessage.id.asc())
        ).all()
    )


def start_copilot_conversation(db: Session, actor: User) -> CopilotConversation:
    context = _context_snapshot(db)
    conversation = CopilotConversation(
        id=uuid.uuid4(),
        external_id=f"conv-{uuid.uuid4().hex[:12]}",
        user_id=actor.id,
        title="NEXUS Copilot Session",
        context_snapshot=context,
    )
    db.add(conversation)
    db.flush()
    db.add(
        CopilotMessage(
            id=uuid.uuid4(),
            external_id=f"msg-{uuid.uuid4().hex[:12]}",
            conversation_id=conversation.id,
            role=CopilotMessageRole.ASSISTANT,
            content=_initial_message(actor, context),
            is_streaming=False,
        )
    )
    db.flush()
    return conversation


def get_copilot_state(db: Session, actor: User) -> dict[str, Any]:
    conversation = _get_latest_conversation(db, actor) or start_copilot_conversation(db, actor)
    context = _context_snapshot(db)
    conversation.context_snapshot = context
    conversation.updated_at = datetime.now(UTC)
    messages = _conversation_messages(db, conversation)
    return {
        "conversation": _conversation_summary(conversation),
        "messages": [_message_to_frontend(message) for message in messages],
        "context": context,
        "suggestions": _suggestions(context),
    }


def _low_stock_rows(db: Session) -> list[InventoryItem]:
    return list(
        db.scalars(
            select(InventoryItem)
            .where(InventoryItem.status.in_([InventoryStatus.LOW, InventoryStatus.CRITICAL]))
            .order_by(InventoryItem.status.asc(), InventoryItem.quantity_on_hand.asc())
            .limit(6)
        ).all()
    )


def _critical_request_rows(db: Session) -> list[OperationalRequest]:
    return list(
        db.scalars(
            select(OperationalRequest)
            .where(OperationalRequest.priority == RequestPriority.CRITICAL, OperationalRequest.status == RequestStatus.PENDING)
            .order_by(OperationalRequest.created_at.asc())
            .limit(6)
        ).all()
    )


def _pending_approval_rows(db: Session) -> list[Approval]:
    return list(
        db.scalars(
            select(Approval)
            .join(Approval.request)
            .where(Approval.status == ApprovalStatus.PENDING)
            .order_by(OperationalRequest.priority.asc(), Approval.created_at.asc())
            .limit(6)
        ).all()
    )


def _fulfillment_status_counts(db: Session) -> list[tuple[str, int]]:
    rows = db.execute(
        select(FulfillmentOrder.status, func.count())
        .group_by(FulfillmentOrder.status)
        .order_by(FulfillmentOrder.status.asc())
    ).all()
    return [(status_value.value, int(count)) for status_value, count in rows]


def _audit_rows(db: Session) -> list[Any]:
    from app.models.audit import AuditEvent

    return list(db.scalars(select(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(5)).all())


def _find_request_by_number(db: Session, query: str) -> OperationalRequest | None:
    match = REQUEST_NUMBER_RE.search(query)
    if not match:
        return None
    request_number = match.group(0).upper()
    return db.scalar(
        select(OperationalRequest)
        .options(joinedload(OperationalRequest.inventory_item))
        .where(func.upper(OperationalRequest.request_number) == request_number)
    )


def _request_detail_response(db: Session, query: str) -> str:
    request = _find_request_by_number(db, query)
    if request is None:
        return (
            "I can open a request dossier when you include the request number, for example REQ-2094-A. "
            "You can also click Get AI Inference on a request card."
        )

    approval = db.scalar(
        select(Approval).where(Approval.request_id == request.id).order_by(Approval.created_at.desc()).limit(1)
    )
    inventory = request.inventory_item
    lines = [
        f"Request {request.request_number}",
        "",
        f"Title: {request.title}",
        f"Status: {request.status.value}",
        f"Priority: {request.priority.value}",
        f"Requester: {request.requester_name} ({request.requester_department})",
        f"Quantity: {request.quantity or 0}",
        f"AI decision: {(request.ai_decision.value if request.ai_decision else 'REVIEW')} at {request.ai_confidence or 0}% confidence",
        f"Reasoning: {request.ai_reasoning or 'No decision reasoning is recorded.'}",
    ]
    if inventory is not None:
        lines.extend(
            [
                "",
                "Inventory context:",
                f"- SKU {inventory.sku}: {inventory.quantity_on_hand} {inventory.unit} on hand, "
                f"{inventory.quantity_reserved} reserved, reorder threshold {inventory.reorder_threshold}.",
            ]
        )
    if approval is not None:
        lines.extend(
            [
                "",
                "Approval context:",
                f"- Status {approval.status.value}; available stock {approval.available_stock or 0}; "
                f"procure quantity {approval.procure_quantity or 0}; safety stock {approval.safety_stock or 0}.",
            ]
        )
    lines.extend(["", "Next action: use the request detail modal for the full inference trail or ask me a follow-up."])
    return "\n".join(lines)


def _risk_level(score: int) -> str:
    if score >= 75:
        return "CRITICAL"
    if score >= 50:
        return "HIGH"
    if score >= 25:
        return "MEDIUM"
    return "LOW"


def _request_inference(db: Session, entity_id: str) -> dict[str, Any]:
    request = db.scalar(
        select(OperationalRequest)
        .options(joinedload(OperationalRequest.inventory_item))
        .where(or_(OperationalRequest.external_id == entity_id, cast(OperationalRequest.id, String) == entity_id))
    )
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    approval = db.scalar(
        select(Approval).where(Approval.request_id == request.id).order_by(Approval.created_at.desc()).limit(1)
    )
    inventory = request.inventory_item
    quantity = request.quantity or 0
    confidence = request.ai_confidence or 0
    available_stock = approval.available_stock if approval else inventory.quantity_on_hand if inventory else 0
    safety_stock = approval.safety_stock if approval else inventory.reorder_threshold if inventory else 0
    procure_quantity = approval.procure_quantity if approval else max(0, quantity - max(0, available_stock - safety_stock))
    fulfillable_stock = max(0, available_stock - safety_stock)

    score = {
        RequestPriority.CRITICAL: 42,
        RequestPriority.HIGH: 28,
        RequestPriority.NORMAL: 14,
        RequestPriority.LOW: 6,
    }[request.priority]
    if request.status == RequestStatus.PENDING:
        score += 18
    if request.ai_decision in {AIDecision.REVIEW, AIDecision.ESCALATE}:
        score += 16
    if confidence < 85:
        score += 12
    if quantity > fulfillable_stock:
        score += 14
    risk_level = _risk_level(min(score, 100))

    evidence = [
        f"Priority is {request.priority.value}.",
        f"Request status is {request.status.value}.",
        f"Requested quantity is {quantity}.",
        f"AI confidence is {confidence}%.",
        f"Available stock after safety reserve is {fulfillable_stock}.",
        f"Procure quantity is {procure_quantity or 0}.",
    ]
    if inventory is not None:
        evidence.append(
            f"Inventory item {inventory.sku} has {inventory.quantity_on_hand} {inventory.unit} on hand "
            f"and threshold {inventory.reorder_threshold}."
        )

    if request.status == RequestStatus.PENDING and request.priority == RequestPriority.CRITICAL:
        next_action = "Escalate to the configured approval authority before fulfillment."
    elif procure_quantity and procure_quantity > 0:
        next_action = "Approve with procurement coverage for the calculated shortage."
    elif request.ai_decision == AIDecision.APPROVE:
        next_action = "Approve and route to fulfillment if business ownership is confirmed."
    else:
        next_action = "Keep in human review until the requester or approver resolves the open risk."

    return {
        "entityType": "request",
        "entityId": public_id(request),
        "title": request.title,
        "headline": f"{risk_level} risk request with {confidence}% AI confidence.",
        "decision": request.ai_decision.value if request.ai_decision else "REVIEW",
        "confidence": confidence,
        "riskLevel": risk_level,
        "summary": request.ai_reasoning or "No request inference reasoning is recorded.",
        "evidence": evidence,
        "nextAction": next_action,
        "generatedAt": datetime.now(UTC).isoformat(),
        "chatPrompt": (
            f"Give me more detail about request {request.request_number}. Explain the risk, approval path, "
            "inventory impact, and next action."
        ),
    }


def _approval_inference(db: Session, entity_id: str) -> dict[str, Any]:
    approval = db.scalar(
        select(Approval)
        .options(joinedload(Approval.request))
        .where(or_(Approval.external_id == entity_id, cast(Approval.id, String) == entity_id))
    )
    if approval is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found.")

    shortage = max(0, approval.quantity_requested - max(0, (approval.available_stock or 0) - (approval.safety_stock or 0)))
    risk_score = 35 if approval.status == ApprovalStatus.PENDING else 10
    if approval.request.priority == RequestPriority.CRITICAL:
        risk_score += 35
    elif approval.request.priority == RequestPriority.HIGH:
        risk_score += 20
    if shortage:
        risk_score += 20
    risk_level = _risk_level(min(risk_score, 100))
    return {
        "entityType": "approval",
        "entityId": public_id(approval),
        "title": approval.request.title,
        "headline": f"{risk_level} approval risk for {approval.request.request_number}.",
        "decision": approval.status.value,
        "confidence": approval.ai_confidence or 0,
        "riskLevel": risk_level,
        "summary": approval.ai_recommendation or "No approval recommendation is recorded.",
        "evidence": [
            f"Quantity requested is {approval.quantity_requested} {approval.unit}.",
            f"Available stock is {approval.available_stock or 0}.",
            f"Safety stock is {approval.safety_stock or 0}.",
            f"Calculated shortage is {shortage}.",
            f"Approval status is {approval.status.value}.",
        ],
        "nextAction": "Resolve the approval queue item and keep safety-stock reserve intact.",
        "generatedAt": datetime.now(UTC).isoformat(),
        "chatPrompt": f"Explain approval {approval.request.request_number} and the inventory shortage calculation.",
    }


def _fulfillment_inference(db: Session, entity_id: str) -> dict[str, Any]:
    order = db.scalar(
        select(FulfillmentOrder).where(or_(FulfillmentOrder.external_id == entity_id, cast(FulfillmentOrder.id, String) == entity_id))
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fulfillment order not found.")

    completion_order = [
        FulfillmentStatus.QUEUED,
        FulfillmentStatus.PROCESSING,
        FulfillmentStatus.ALLOCATED,
        FulfillmentStatus.SHIPPED,
        FulfillmentStatus.DELIVERED,
    ]
    stage_index = completion_order.index(order.status) if order.status in completion_order else 0
    completion = round((stage_index / (len(completion_order) - 1)) * 100)
    risk_score = 40 if order.priority == RequestPriority.CRITICAL else 20 if order.priority == RequestPriority.HIGH else 8
    if order.status in {FulfillmentStatus.QUEUED, FulfillmentStatus.PROCESSING}:
        risk_score += 20
    if order.approved_quantity > max(0, order.available_stock - order.safety_stock_min):
        risk_score += 18
    risk_level = _risk_level(min(risk_score, 100))
    return {
        "entityType": "fulfillment",
        "entityId": public_id(order),
        "title": order.title,
        "headline": f"{completion}% lifecycle completion with {risk_level} operational risk.",
        "decision": order.status.value,
        "confidence": completion,
        "riskLevel": risk_level,
        "summary": f"{order.approved_quantity} {order.unit} approved for {order.request_number}.",
        "evidence": [
            f"Current stage is {order.status.value}.",
            f"Priority is {order.priority.value}.",
            f"Available stock is {order.available_stock}.",
            f"Minimum safety stock is {order.safety_stock_min}.",
            f"Carrier is {order.carrier or 'not assigned'}.",
        ],
        "nextAction": "Advance fulfillment only after allocation preserves the configured safety-stock margin.",
        "generatedAt": datetime.now(UTC).isoformat(),
        "chatPrompt": f"Explain fulfillment order {order.request_number} and what must happen before the next stage.",
    }


def _inventory_inference(db: Session, entity_id: str) -> dict[str, Any]:
    item = db.scalar(
        select(InventoryItem).where(or_(InventoryItem.external_id == entity_id, cast(InventoryItem.id, String) == entity_id))
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found.")

    available_after_reserve = max(0, item.quantity_on_hand - item.quantity_reserved)
    shortage = max(0, item.reorder_threshold - item.quantity_on_hand)
    capacity_used = round((item.quantity_on_hand / item.max_capacity) * 100) if item.max_capacity else 0
    risk_score = 45 if item.status == InventoryStatus.CRITICAL else 25 if item.status == InventoryStatus.LOW else 8
    if shortage:
        risk_score += 20
    risk_level = _risk_level(min(risk_score, 100))
    return {
        "entityType": "inventory",
        "entityId": public_id(item),
        "title": item.name,
        "headline": f"{risk_level} stock risk at {capacity_used}% capacity.",
        "decision": "REORDER" if shortage else "MONITOR",
        "confidence": max(0, min(100, 100 - risk_score)),
        "riskLevel": risk_level,
        "summary": f"{item.sku} has {item.quantity_on_hand} {item.unit} on hand against threshold {item.reorder_threshold}.",
        "evidence": [
            f"Available after reserve is {available_after_reserve}.",
            f"Reorder shortage is {shortage}.",
            f"Maximum capacity is {item.max_capacity}.",
            f"Status is {item.status.value}.",
        ],
        "nextAction": "Create or approve replenishment if stock remains below threshold.",
        "generatedAt": datetime.now(UTC).isoformat(),
        "chatPrompt": f"Explain inventory item {item.sku}, reorder exposure, and recommended next action.",
    }


def build_entity_inference(db: Session, entity_type: str, entity_id: str) -> dict[str, Any]:
    normalized_type = entity_type.strip().lower()
    normalized_id = entity_id.strip()
    if not normalized_type or not normalized_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="entityType and entityId are required.")
    if normalized_type in {"request", "operational_request", "operationalrequest"}:
        return _request_inference(db, normalized_id)
    if normalized_type == "approval":
        return _approval_inference(db, normalized_id)
    if normalized_type in {"fulfillment", "fulfillment_order", "fulfillmentorder"}:
        return _fulfillment_inference(db, normalized_id)
    if normalized_type in {"inventory", "inventory_item", "inventoryitem"}:
        return _inventory_inference(db, normalized_id)
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported entity type.")


def _render_response(db: Session, query: str, context: dict[str, Any], actor: User | None = None) -> str:
    intent = classify_copilot_intent(query)
    if intent == "greeting":
        name = actor.display_name if actor else "there"
        return "\n".join(
            [
                f"Hi {name}. I am NEXUS Copilot.",
                "",
                "I can chat about requests, approvals, inventory, fulfillment, reports, and audit activity using the connected database.",
                "",
                f"Right now I see {context['pendingRequests']} pending requests, "
                f"{context['pendingApprovals']} pending approvals, {context['lowStockItems']} low-stock SKUs, "
                f"and {context['availableInventory']} inventory units on hand.",
            ]
        )
    if intent == "thanks":
        return "You are welcome. Ask me for a request inference, inventory risk, approval queue, or fulfillment status when you need the next decision."
    if intent == "closing":
        return "Session noted. I will keep the current NEXUS context ready for your next question."
    if intent == "help":
        return "\n".join(
            [
                "I can help with:",
                "- Natural questions like 'hi', 'what needs approval', or 'show low stock'",
                "- Request dossiers by request number, such as REQ-2094-A",
                "- AI inference for request, approval, fulfillment, and inventory records",
                "- Critical approval queue triage",
                "- Live counts from the connected NEXUS database",
            ]
        )
    if intent == "request_detail":
        return _request_detail_response(db, query)
    if intent == "approval":
        approvals = _pending_approval_rows(db)
        critical = _critical_request_rows(db)
        approval_lines = [
            f"- {row.request.request_number}: {row.request.title} for {row.quantity_requested} {row.unit}; "
            f"available {row.available_stock or 0}, procure {row.procure_quantity or 0}."
            for row in approvals[:4]
        ]
        critical_lines = [
            f"- {row.request_number}: {row.title} requested by {row.requester_name}."
            for row in critical[:4]
        ]
        return "\n".join(
            [
                "Critical approval view",
                "",
                f"Pending approvals: {context['pendingApprovals']}",
                f"Critical pending requests: {context['criticalRequests']}",
                "",
                "Approval queue:",
                *(approval_lines or ["- No pending approvals are currently recorded."]),
                "",
                "Critical requests:",
                *(critical_lines or ["- No critical pending requests are currently recorded."]),
                "",
                "Recommended action: resolve critical pending approvals before standard replenishment.",
            ]
        )
    if intent == "inventory":
        low_items = _low_stock_rows(db)
        rows = [
            f"- {item.sku}: {item.name}, {item.quantity_on_hand} {item.unit} on hand, "
            f"threshold {item.reorder_threshold}, status {item.status.value}."
            for item in low_items
        ]
        return "\n".join(
            [
                "Inventory health",
                "",
                f"Total units on hand: {context['availableInventory']}",
                f"Low or critical SKUs: {context['lowStockItems']}",
                "",
                *(rows or ["No SKU is currently below its reorder threshold."]),
            ]
        )
    if intent == "fulfillment":
        counts = _fulfillment_status_counts(db)
        lines = [f"- {status_value}: {count}" for status_value, count in counts]
        return "\n".join(
            [
                "Fulfillment status",
                "",
                f"Orders tracked: {context['fulfillmentOrders']}",
                f"Delivered orders: {context['deliveredOrders']}",
                "",
                *(lines or ["- No fulfillment orders are recorded."]),
            ]
        )
    if intent == "audit":
        rows = [
            f"- {event.event_code}: {event.description}"
            for event in _audit_rows(db)
        ]
        return "\n".join(
            [
                "Latest audit activity",
                "",
                *(rows or ["- No audit activity is currently recorded."]),
            ]
        )
    if intent == "summary":
        return "\n".join(
            [
                "Operational summary",
                "",
                f"Pending requests: {context['pendingRequests']}",
                f"Pending approvals: {context['pendingApprovals']}",
                f"Low-stock SKUs: {context['lowStockItems']}",
                f"Generated reports: {context['reportsGenerated']}",
                f"Active model: {context['activeModel']}"
                + (f" v{context['activeModelVersion']}" if context["activeModelVersion"] else ""),
                "",
                "Open Reports to export the same database-backed snapshot.",
            ]
        )
    if any(term in lower for term in ["help", "what can", "capabilities"]):
        return "\n".join(
            [
                "I can help with:",
                "- Critical approval queue triage",
                "- Low-stock and reorder checks",
                "- Fulfillment progress summaries",
                "- Audit and report summaries",
                "- Live counts from the connected NEXUS database",
            ]
        )
    return "\n".join(
        [
            "I checked the connected NEXUS database for that request.",
            "",
            f"Pending requests: {context['pendingRequests']}",
            f"Pending approvals: {context['pendingApprovals']}",
            f"Low-stock SKUs: {context['lowStockItems']}",
            "",
            "Ask about critical approvals, low stock SKUs, fulfillment, or reports for a focused answer.",
        ]
    )


def answer_copilot(db: Session, query: str, actor: User, conversation_id: str | None = None) -> dict[str, Any]:
    cleaned = query.strip()
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message cannot be empty.")
    if len(cleaned) > 2000:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message is too long.")

    conversation = _get_conversation(db, actor, conversation_id)
    prior_messages = _conversation_messages(db, conversation)
    context = _context_snapshot(db)
    conversation.context_snapshot = context
    conversation.updated_at = datetime.now(UTC)
    if len(prior_messages) <= 1:
        conversation.title = cleaned[:80]

    user_message = CopilotMessage(
        id=uuid.uuid4(),
        external_id=f"msg-{uuid.uuid4().hex[:12]}",
        conversation_id=conversation.id,
        role=CopilotMessageRole.USER,
        content=cleaned,
        is_streaming=False,
    )
    assistant_message = CopilotMessage(
        id=uuid.uuid4(),
        external_id=f"msg-{uuid.uuid4().hex[:12]}",
        conversation_id=conversation.id,
        role=CopilotMessageRole.ASSISTANT,
        content=_render_response(db, cleaned, context, actor),
        is_streaming=False,
    )
    db.add_all([user_message, assistant_message])
    db.flush()
    messages = [*prior_messages, user_message, assistant_message]
    return {
        "conversation": _conversation_summary(conversation),
        "messages": [_message_to_frontend(message) for message in messages],
        "message": _message_to_frontend(assistant_message),
        "context": context,
        "suggestions": _suggestions(context),
    }
