from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from app.models.audit import AuditEvent
from app.models.intelligence import AIModel, DecisionRule, EngineeringRequest, Policy
from app.models.inventory import InventoryItem
from app.models.operations import Approval, FulfillmentOrder, OperationalRequest
from app.models.reporting import Report
from app.models.user import User


def public_id(obj: Any) -> str:
    return obj.external_id or str(obj.id)


def iso_datetime(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def iso_date(value: date | None) -> str | None:
    return value.isoformat() if value else None


def number(value: Decimal | int | float | None) -> float | int | None:
    if isinstance(value, Decimal):
        return float(value)
    return value


def enum_value(value: Any) -> Any:
    return value.value if hasattr(value, "value") else value


def user_to_frontend(user: User) -> dict[str, Any]:
    role = user.role.name if user.role else None
    return {
        "id": public_id(user),
        "email": user.email,
        "displayName": user.display_name,
        "role": enum_value(role),
        "avatarUrl": user.avatar_url,
        "department": user.department,
        "permissions": user.permissions,
        "lastLoginAt": iso_datetime(user.last_login_at),
    }


def inventory_to_frontend(item: InventoryItem) -> dict[str, Any]:
    return {
        "id": public_id(item),
        "sku": item.sku,
        "name": item.name,
        "category": item.category,
        "zone": item.zone,
        "quantityOnHand": item.quantity_on_hand,
        "quantityReserved": item.quantity_reserved,
        "reorderThreshold": item.reorder_threshold,
        "maxCapacity": item.max_capacity,
        "unit": item.unit,
        "status": enum_value(item.status),
        "lastUpdated": iso_datetime(item.updated_at),
        "supplier": item.supplier,
        "unitCost": number(item.unit_cost),
    }


def request_to_frontend(request: OperationalRequest) -> dict[str, Any]:
    return {
        "id": public_id(request),
        "requestNumber": request.request_number,
        "title": request.title,
        "description": request.description,
        "type": enum_value(request.type),
        "priority": enum_value(request.priority),
        "status": enum_value(request.status),
        "requester": request.requester_name,
        "requesterDept": request.requester_department,
        "assignee": request.assignee.display_name if request.assignee else None,
        "inventoryItem": request.inventory_item.name if request.inventory_item else None,
        "quantity": request.quantity,
        "aiDecision": enum_value(request.ai_decision),
        "aiConfidence": request.ai_confidence,
        "aiReasoning": request.ai_reasoning,
        "createdAt": iso_datetime(request.created_at),
        "updatedAt": iso_datetime(request.updated_at),
        "dueDate": iso_datetime(request.due_date),
        "rejectionReason": request.rejection_reason,
        "clarifyMessage": request.clarify_message,
    }


def approval_to_frontend(approval: Approval) -> dict[str, Any]:
    request = approval.request
    return {
        "id": public_id(approval),
        "requestId": public_id(request),
        "requestNumber": request.request_number,
        "title": request.title,
        "priority": enum_value(request.priority),
        "requester": request.requester_name,
        "requesterDept": request.requester_department,
        "quantity": approval.quantity_requested,
        "unit": approval.unit,
        "aiRecommendation": approval.ai_recommendation or "",
        "availableStock": approval.available_stock or 0,
        "procureQuantity": approval.procure_quantity or 0,
        "safetyStock": approval.safety_stock or 0,
        "waitingTime": approval.waiting_time or "Just now",
        "aiConfidence": approval.ai_confidence or 0,
        "status": enum_value(approval.status),
        "createdAt": iso_datetime(approval.created_at),
        "decisionNote": approval.decision_note,
    }


def fulfillment_to_frontend(order: FulfillmentOrder) -> dict[str, Any]:
    return {
        "id": public_id(order),
        "requestNumber": order.request_number,
        "requestId": public_id(order.request) if order.request else None,
        "title": order.title,
        "requestedBy": order.requested_by_name,
        "approvedBy": order.approved_by_name,
        "approvedQuantity": order.approved_quantity,
        "availableStock": order.available_stock,
        "safetyStockMin": order.safety_stock_min,
        "safetyStockMax": order.safety_stock_max,
        "unit": order.unit,
        "status": enum_value(order.status),
        "priority": enum_value(order.priority),
        "carrier": order.carrier,
        "trackingNumber": order.tracking_number,
        "eta": iso_datetime(order.eta),
        "approvedAt": iso_datetime(order.approved_at),
        "fulfilledAt": iso_datetime(order.fulfilled_at),
    }


def rule_to_frontend(rule: DecisionRule) -> dict[str, Any]:
    return {
        "id": public_id(rule),
        "name": rule.name,
        "description": rule.description,
        "category": enum_value(rule.category),
        "status": enum_value(rule.status),
        "priority": rule.priority,
        "conditions": rule.conditions,
        "actions": rule.actions,
        "triggerCount": rule.trigger_count,
        "lastTriggered": iso_datetime(rule.last_triggered),
        "createdBy": rule.created_by_name,
        "createdAt": iso_datetime(rule.created_at),
    }


def model_to_frontend(model: AIModel) -> dict[str, Any]:
    return {
        "id": public_id(model),
        "name": model.name,
        "version": model.version,
        "type": enum_value(model.type),
        "status": enum_value(model.status),
        "accuracy": number(model.accuracy),
        "latencyMs": model.latency_ms,
        "requestsPerDay": model.requests_per_day,
        "deployedAt": iso_datetime(model.deployed_at),
        "description": model.description,
    }


def engineering_request_to_frontend(request: EngineeringRequest) -> dict[str, Any]:
    return {
        "id": public_id(request),
        "title": request.title,
        "description": request.description,
        "currentStage": enum_value(request.current_stage),
        "progress": request.progress,
        "status": enum_value(request.status),
        "createdAt": iso_datetime(request.created_at),
        "estimatedCompletion": iso_datetime(request.estimated_completion),
        "telemetry": [
            {
                "label": metric.label,
                "value": metric.value,
                "unit": metric.unit,
                "status": metric.status,
            }
            for metric in request.telemetry
        ],
    }


def policy_to_frontend(policy: Policy) -> dict[str, Any]:
    return {
        "id": public_id(policy),
        "title": policy.title,
        "description": policy.description,
        "version": policy.version,
        "status": enum_value(policy.status),
        "category": policy.category,
        "rules": [
            {
                "id": public_id(rule),
                "description": rule.description,
                "isActive": rule.is_active,
                "scope": rule.scope,
            }
            for rule in policy.rules
        ],
        "createdBy": policy.created_by_name,
        "updatedBy": policy.updated_by_name,
        "createdAt": iso_datetime(policy.created_at),
        "updatedAt": iso_datetime(policy.updated_at),
        "effectiveDate": iso_datetime(policy.effective_date),
        "expiryDate": iso_datetime(policy.expiry_date),
    }


def audit_to_frontend(event: AuditEvent) -> dict[str, Any]:
    return {
        "id": public_id(event),
        "type": enum_value(event.type),
        "action": event.action,
        "actor": event.actor_name,
        "actorRole": enum_value(event.actor_role),
        "resourceType": event.resource_type,
        "resourceId": event.resource_id,
        "description": event.description,
        "metadata": event.event_metadata,
        "ipAddress": event.ip_address,
        "timestamp": iso_datetime(event.timestamp),
        "severity": enum_value(event.severity),
    }


def report_to_frontend(report: Report) -> dict[str, Any]:
    return {
        "id": public_id(report),
        "title": report.title,
        "description": report.description,
        "category": enum_value(report.category),
        "status": enum_value(report.status),
        "format": enum_value(report.format),
        "generatedBy": report.generated_by_name,
        "generatedAt": iso_datetime(report.generated_at),
        "fileSize": report.file_size,
        "pages": report.pages,
        "scheduledFor": iso_datetime(report.scheduled_for),
        "dateRange": {
            "from": iso_date(report.date_from),
            "to": iso_date(report.date_to),
        },
    }


def activity_from_audit(event: AuditEvent) -> dict[str, Any]:
    feed_type = {
        "REQUEST": "request",
        "APPROVAL": "approval",
        "FULFILLMENT": "fulfillment",
        "INVENTORY": "alert",
        "AI": "ai",
    }.get(enum_value(event.type), "system")
    return {
        "id": public_id(event),
        "type": feed_type,
        "title": event.event_code.replace("_", " ").title(),
        "description": event.description,
        "timestamp": iso_datetime(event.timestamp),
        "actor": event.actor_name,
        "link": None,
    }
