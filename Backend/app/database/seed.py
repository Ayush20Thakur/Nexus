from __future__ import annotations

import argparse
import hashlib
import math
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database.session import get_sessionmaker
from app.models.audit import AuditEvent
from app.models.enums import (
    AIDecision,
    ApprovalStatus,
    AuditEventType,
    AuditSeverity,
    CopilotMessageRole,
    EngineeringStatus,
    FulfillmentStatus,
    InventoryStatus,
    ModelStatus,
    ModelType,
    PipelineStage,
    PolicyStatus,
    ReportCategory,
    ReportFormat,
    ReportStatus,
    RequestPriority,
    RequestStatus,
    RequestType,
    RoleName,
    RuleCategory,
    RuleStatus,
)
from app.models.intelligence import (
    AIModel,
    CopilotConversation,
    CopilotMessage,
    DecisionOutcome,
    DecisionRule,
    EngineeringRequest,
    EngineeringTelemetryMetric,
    Policy,
    PolicyRule,
)
from app.models.inventory import InventoryItem
from app.models.operations import Approval, FulfillmentOrder, OperationalRequest
from app.models.reporting import Report
from app.models.settings import SystemSetting, UserSetting
from app.models.user import Role, RolePermission, User, UserSession

NAMESPACE = uuid.UUID("d6421192-9f95-48e8-9a52-2c58b91f8d37")


def demo_uuid(kind: str, key: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, f"{kind}:{key}")


def dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def d(value: str) -> date:
    return date.fromisoformat(value)


def file_size_label(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{round(size / 1024, 1)} KB"
    return f"{round(size / (1024 * 1024), 1)} MB"


ROLE_PERMISSIONS: dict[RoleName, list[str]] = {
    RoleName.ADMIN: ["*"],
    RoleName.MANAGER: [
        "requests:read",
        "requests:create",
        "requests:approve",
        "inventory:read",
        "fulfillment:read",
        "policies:read",
        "reports:export",
        "audit:read",
    ],
    RoleName.OPERATOR: [
        "requests:read",
        "requests:create",
        "inventory:read",
        "fulfillment:manage",
    ],
    RoleName.VIEWER: [
        "requests:read",
        "inventory:read",
        "fulfillment:read",
        "reports:read",
    ],
}

USERS = [
    {"external_id": "usr-001", "email": "zian@nexus.corp", "display_name": "Zian", "role": RoleName.ADMIN, "department": "Engineering Admin", "permissions": ["*"]},
    {"external_id": "usr-002", "email": "dr.vance@nexus.corp", "display_name": "Dr. E. Vance", "role": RoleName.MANAGER, "department": "Advanced Research", "permissions": ["requests:approve", "requests:create"]},
    {"external_id": "usr-003", "email": "chen@nexus.corp", "display_name": "Chen Wei", "role": RoleName.OPERATOR, "department": "Operations", "permissions": ["requests:create", "inventory:read"]},
    {"external_id": "usr-004", "email": "ramos@nexus.corp", "display_name": "M. Ramos", "role": RoleName.MANAGER, "department": "Supply Chain", "permissions": ["inventory:write", "fulfillment:manage"]},
    {"external_id": "usr-005", "email": "petrov@nexus.corp", "display_name": "A. Petrov", "role": RoleName.OPERATOR, "department": "Fulfillment", "permissions": ["fulfillment:manage"]},
]

INVENTORY = [
    {"external_id": "inv-001", "sku": "CPU-Z9-XL", "name": "Compute Nodes (Type-Z)", "category": "Computing", "zone": "Zone A", "quantity_on_hand": 24, "quantity_reserved": 6, "reorder_threshold": 20, "max_capacity": 100, "unit": "units", "status": InventoryStatus.LOW, "last_updated": "2026-08-14T04:12:00Z", "supplier": "TechCorp Global", "unit_cost": "4200"},
    {"external_id": "inv-002", "sku": "MEM-DDR5-64", "name": "DDR5 Memory Modules", "category": "Computing", "zone": "Zone A", "quantity_on_hand": 156, "quantity_reserved": 12, "reorder_threshold": 50, "max_capacity": 300, "unit": "units", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-14T03:45:00Z", "supplier": "MemoCorp", "unit_cost": "380"},
    {"external_id": "inv-003", "sku": "COOL-AIO-360", "name": "AIO Liquid Cooling Units", "category": "Cooling", "zone": "Zone B", "quantity_on_hand": 38, "quantity_reserved": 4, "reorder_threshold": 25, "max_capacity": 80, "unit": "units", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-14T02:30:00Z", "supplier": "AquaFlow", "unit_cost": "1100"},
    {"external_id": "inv-004", "sku": "PWR-UPS-2KVA", "name": "UPS Power Units (2KVA)", "category": "Power", "zone": "Zone C", "quantity_on_hand": 12, "quantity_reserved": 0, "reorder_threshold": 15, "max_capacity": 50, "unit": "units", "status": InventoryStatus.CRITICAL, "last_updated": "2026-08-14T01:00:00Z", "supplier": "PowerSafe Ltd", "unit_cost": "2800"},
    {"external_id": "inv-005", "sku": "NET-SW-48P", "name": "48-Port Network Switch", "category": "Networking", "zone": "Zone A", "quantity_on_hand": 8, "quantity_reserved": 2, "reorder_threshold": 5, "max_capacity": 30, "unit": "units", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-14T00:15:00Z", "supplier": "NetGear Pro", "unit_cost": "6500"},
    {"external_id": "inv-006", "sku": "THERM-TPX7", "name": "Thermal Paste (TPX-7)", "category": "Consumables", "zone": "Zone D", "quantity_on_hand": 14, "quantity_reserved": 0, "reorder_threshold": 30, "max_capacity": 200, "unit": "tubes", "status": InventoryStatus.CRITICAL, "last_updated": "2026-08-13T22:00:00Z", "supplier": "ThermoLabs", "unit_cost": "45"},
    {"external_id": "inv-007", "sku": "RACK-42U-STD", "name": "Server Rack (42U Standard)", "category": "Infrastructure", "zone": "Zone E", "quantity_on_hand": 6, "quantity_reserved": 1, "reorder_threshold": 3, "max_capacity": 20, "unit": "units", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-13T20:00:00Z", "supplier": "RackSystems", "unit_cost": "3200"},
    {"external_id": "inv-008", "sku": "SSD-NVMe-4TB", "name": "NVMe SSD (4TB)", "category": "Storage", "zone": "Zone A", "quantity_on_hand": 89, "quantity_reserved": 20, "reorder_threshold": 40, "max_capacity": 200, "unit": "units", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-13T18:30:00Z", "supplier": "DataDrive", "unit_cost": "520"},
    {"external_id": "inv-009", "sku": "CABLE-CAT8-50", "name": "Cat8 Ethernet Cable (50m)", "category": "Networking", "zone": "Zone D", "quantity_on_hand": 245, "quantity_reserved": 15, "reorder_threshold": 100, "max_capacity": 500, "unit": "reels", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-13T16:00:00Z", "supplier": "CableMax", "unit_cost": "120"},
    {"external_id": "inv-010", "sku": "GPU-A100-80G", "name": "GPU Accelerator (A100 80GB)", "category": "Computing", "zone": "Zone A", "quantity_on_hand": 4, "quantity_reserved": 2, "reorder_threshold": 4, "max_capacity": 20, "unit": "units", "status": InventoryStatus.LOW, "last_updated": "2026-08-14T04:00:00Z", "supplier": "AIHardware Inc", "unit_cost": "28000"},
    {"external_id": "inv-011", "sku": "FIBER-SM-100", "name": "Single-Mode Fiber (100m)", "category": "Networking", "zone": "Zone C", "quantity_on_hand": 180, "quantity_reserved": 30, "reorder_threshold": 80, "max_capacity": 400, "unit": "spools", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-13T12:00:00Z", "supplier": "FiberOptics Co", "unit_cost": "85"},
    {"external_id": "inv-012", "sku": "SEC-BADGE-PROX", "name": "Proximity Access Badge", "category": "Security", "zone": "Zone B", "quantity_on_hand": 52, "quantity_reserved": 8, "reorder_threshold": 20, "max_capacity": 150, "unit": "units", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-13T10:00:00Z", "supplier": "SecureAccess", "unit_cost": "35"},
]

REQUESTS = [
    {"external_id": "req-001", "request_number": "REQ-2094-A", "title": "Compute Nodes (Type-Z)", "description": "Urgent request for additional compute nodes to support expanded ML training pipeline.", "type": RequestType.PURCHASE, "priority": RequestPriority.CRITICAL, "status": RequestStatus.PENDING, "requester": "Dr. E. Vance", "requester_department": "Advanced Research", "inventory_item": "Compute Nodes (Type-Z)", "quantity": 30, "ai_decision": AIDecision.APPROVE, "ai_confidence": 92, "ai_reasoning": "Inventory levels critically low. Demand surge predicted. Expedited procurement recommended.", "created_at": "2026-08-14T03:48:00Z", "updated_at": "2026-08-14T03:48:00Z"},
    {"external_id": "req-002", "request_number": "REQ-2093-A", "title": "Safety Equipment (Type-3)", "description": "Routine safety equipment replenishment for Zone C operations.", "type": RequestType.STANDARD, "priority": RequestPriority.NORMAL, "status": RequestStatus.PENDING, "requester": "Chen Wei", "requester_department": "Operations", "inventory_item": None, "quantity": 12, "ai_decision": AIDecision.APPROVE, "ai_confidence": 97, "ai_reasoning": "Standard replenishment. Stock levels support fulfillment. Approved.", "created_at": "2026-08-14T02:15:00Z", "updated_at": "2026-08-14T02:15:00Z"},
    {"external_id": "req-003", "request_number": "REQ-2092-B", "title": "GPU Accelerator Modules", "description": "Additional GPU modules for AI model training workloads.", "type": RequestType.PURCHASE, "priority": RequestPriority.HIGH, "status": RequestStatus.APPROVED, "requester": "Zian", "requester_department": "Engineering", "inventory_item": "GPU Accelerator (A100 80GB)", "quantity": 8, "ai_decision": AIDecision.REVIEW, "ai_confidence": 76, "ai_reasoning": "High cost per unit. Recommend management review before approval.", "created_at": "2026-08-13T22:00:00Z", "updated_at": "2026-08-14T00:30:00Z"},
    {"external_id": "req-004", "request_number": "REQ-2091-C", "title": "Network Switch Upgrade", "description": "Replacing aging 24-port switches with 48-port units in Zone A.", "type": RequestType.MAINTENANCE, "priority": RequestPriority.NORMAL, "status": RequestStatus.IN_PROGRESS, "requester": "M. Ramos", "requester_department": "Supply Chain", "inventory_item": "48-Port Network Switch", "quantity": 4, "ai_decision": AIDecision.APPROVE, "ai_confidence": 88, "ai_reasoning": "Planned maintenance. Inventory sufficient. Auto-approved.", "created_at": "2026-08-13T18:30:00Z", "updated_at": "2026-08-14T01:00:00Z"},
    {"external_id": "req-005", "request_number": "REQ-2090-A", "title": "Thermal Paste Restock", "description": "Critical restock needed. Current levels below safety threshold.", "type": RequestType.PURCHASE, "priority": RequestPriority.HIGH, "status": RequestStatus.PENDING, "requester": "A. Petrov", "requester_department": "Fulfillment", "inventory_item": "Thermal Paste (TPX-7)", "quantity": 100, "ai_decision": AIDecision.APPROVE, "ai_confidence": 99, "ai_reasoning": "Stock critically low at 14 units vs 30-unit threshold. Immediate restock required.", "created_at": "2026-08-13T16:00:00Z", "updated_at": "2026-08-13T16:00:00Z"},
    {"external_id": "req-006", "request_number": "REQ-2089-B", "title": "Cooling Units (AIO)", "description": "Additional cooling for new server deployment in Zone B.", "type": RequestType.PURCHASE, "priority": RequestPriority.NORMAL, "status": RequestStatus.COMPLETED, "requester": "Dr. E. Vance", "requester_department": "Advanced Research", "inventory_item": "AIO Liquid Cooling Units", "quantity": 6, "ai_decision": AIDecision.APPROVE, "ai_confidence": 94, "ai_reasoning": "Cooling capacity insufficient for planned expansion. Approved.", "created_at": "2026-08-13T10:00:00Z", "updated_at": "2026-08-13T14:00:00Z"},
    {"external_id": "req-007", "request_number": "REQ-2088-D", "title": "UPS Power Units", "description": "Emergency replacement for failed UPS units in Zone C.", "type": RequestType.EMERGENCY, "priority": RequestPriority.CRITICAL, "status": RequestStatus.APPROVED, "requester": "Chen Wei", "requester_department": "Operations", "inventory_item": "UPS Power Units (2KVA)", "quantity": 5, "ai_decision": AIDecision.APPROVE, "ai_confidence": 98, "ai_reasoning": "Emergency replacement. Critical system risk. Immediate fulfillment recommended.", "created_at": "2026-08-13T08:00:00Z", "updated_at": "2026-08-13T08:30:00Z"},
]

APPROVALS = [
    {"external_id": "appr-001", "request_number": "REQ-2094-A", "status": ApprovalStatus.PENDING, "quantity_requested": 30, "quantity_approved": None, "unit": "units", "ai_recommendation": "Fulfill 24 units from current inventory and automatically procure remaining 6 units via expedited supplier channel.", "available_stock": 24, "procure_quantity": 6, "safety_stock": 18, "waiting_time": "2h 14m", "ai_confidence": 92, "created_at": "2026-08-14T03:48:00Z"},
    {"external_id": "appr-002", "request_number": "REQ-2090-A", "status": ApprovalStatus.PENDING, "quantity_requested": 100, "quantity_approved": None, "unit": "tubes", "ai_recommendation": "Approve full quantity. Stock at critical level. Supplier delivery within 24h.", "available_stock": 14, "procure_quantity": 86, "safety_stock": 30, "waiting_time": "45m", "ai_confidence": 99, "created_at": "2026-08-13T16:00:00Z"},
    {"external_id": "appr-003", "request_number": "REQ-2088-D", "status": ApprovalStatus.PENDING, "quantity_requested": 5, "quantity_approved": None, "unit": "units", "ai_recommendation": "Emergency approval recommended. Critical infrastructure risk. Stock from Zone C reserve.", "available_stock": 3, "procure_quantity": 2, "safety_stock": 5, "waiting_time": "12m", "ai_confidence": 98, "created_at": "2026-08-13T08:00:00Z"},
]

FULFILLMENT = [
    {"external_id": "ful-001", "request_number": "REQ-2092-B", "title": "GPU Accelerator Modules", "requested_by": "Zian", "approved_by": "Dr. E. Vance", "approved_quantity": 8, "available_stock": 12, "safety_stock_min": 2, "safety_stock_max": 6, "unit": "units", "status": FulfillmentStatus.QUEUED, "priority": RequestPriority.HIGH, "approved_at": "2026-08-14T00:30:00Z"},
    {"external_id": "ful-002", "request_number": "REQ-2091-C", "title": "Network Switch (48P)", "requested_by": "M. Ramos", "approved_by": "Zian", "approved_quantity": 4, "available_stock": 8, "safety_stock_min": 1, "safety_stock_max": 3, "unit": "units", "status": FulfillmentStatus.PROCESSING, "priority": RequestPriority.NORMAL, "approved_at": "2026-08-14T01:00:00Z"},
    {"external_id": "ful-003", "request_number": "REQ-2089-B", "title": "AIO Cooling Units", "requested_by": "Dr. E. Vance", "approved_by": "Zian", "approved_quantity": 6, "available_stock": 38, "safety_stock_min": 5, "safety_stock_max": 15, "unit": "units", "status": FulfillmentStatus.SHIPPED, "priority": RequestPriority.NORMAL, "carrier": "TechLogistics Express", "tracking_number": "TLX-2094-882", "eta": "2026-08-14T18:00:00Z", "approved_at": "2026-08-13T14:00:00Z", "fulfilled_at": "2026-08-13T16:30:00Z"},
    {"external_id": "ful-004", "request_number": "REQ-2088-D", "title": "UPS Power Units (2KVA)", "requested_by": "Chen Wei", "approved_by": "Zian", "approved_quantity": 5, "available_stock": 12, "safety_stock_min": 3, "safety_stock_max": 8, "unit": "units", "status": FulfillmentStatus.ALLOCATED, "priority": RequestPriority.CRITICAL, "approved_at": "2026-08-13T08:30:00Z"},
]

DECISION_RULES = [
    {"external_id": "rule-001", "name": "Auto-Approve Standard Requests", "description": "Automatically approve standard requests under 50 units with AI confidence above 90%.", "category": RuleCategory.REQUEST, "status": RuleStatus.ACTIVE, "priority": 1, "conditions": [{"field": "request.type", "operator": "eq", "value": "STANDARD"}, {"field": "request.quantity", "operator": "lte", "value": 50}, {"field": "ai.confidence", "operator": "gte", "value": 90}], "actions": [{"type": "APPROVE", "params": {"autoFulfill": True, "notifyRequester": True}}], "trigger_count": 847, "last_triggered": "2026-08-14T04:30:00Z", "created_by": "Zian", "created_at": "2026-07-01T00:00:00Z"},
    {"external_id": "rule-002", "name": "Critical Request Escalation", "description": "Escalate all CRITICAL priority requests to senior management within 30 minutes.", "category": RuleCategory.ESCALATION, "status": RuleStatus.ACTIVE, "priority": 0, "conditions": [{"field": "request.priority", "operator": "eq", "value": "CRITICAL"}, {"field": "request.status", "operator": "eq", "value": "PENDING"}], "actions": [{"type": "ESCALATE", "params": {"escalateTo": "SENIOR_MANAGEMENT", "timeoutMinutes": 30}}, {"type": "NOTIFY", "params": {"channel": "email", "urgency": "immediate"}}], "trigger_count": 23, "last_triggered": "2026-08-14T03:48:00Z", "created_by": "Zian", "created_at": "2026-07-01T00:00:00Z"},
    {"external_id": "rule-003", "name": "Low Stock Auto-Reorder", "description": "Automatically create purchase requests when inventory drops below reorder threshold.", "category": RuleCategory.INVENTORY, "status": RuleStatus.ACTIVE, "priority": 2, "conditions": [{"field": "inventory.quantityOnHand", "operator": "lte", "value": "inventory.reorderThreshold"}, {"field": "inventory.status", "operator": "in", "value": "CRITICAL,LOW"}], "actions": [{"type": "CREATE_ORDER", "params": {"type": "PURCHASE", "multiplier": 2.5, "autoApprove": False}}, {"type": "NOTIFY", "params": {"channel": "dashboard", "severity": "warning"}}], "trigger_count": 156, "last_triggered": "2026-08-14T01:00:00Z", "created_by": "Zian", "created_at": "2026-07-15T00:00:00Z"},
    {"external_id": "rule-004", "name": "High-Value Purchase Review", "description": "Flag all purchase requests exceeding $10,000 total value for manual review.", "category": RuleCategory.REQUEST, "status": RuleStatus.ACTIVE, "priority": 3, "conditions": [{"field": "request.type", "operator": "eq", "value": "PURCHASE"}, {"field": "request.totalValue", "operator": "gte", "value": 10000}], "actions": [{"type": "UPDATE_STATUS", "params": {"status": "REVIEW_REQUIRED"}}, {"type": "NOTIFY", "params": {"channel": "email", "role": "MANAGER"}}], "trigger_count": 44, "last_triggered": "2026-08-13T22:00:00Z", "created_by": "Dr. E. Vance", "created_at": "2026-07-20T00:00:00Z"},
]

AI_MODELS = [
    {"external_id": "model-001", "name": "NEXUS Decision Core", "version": "4.2.1", "type": ModelType.LLM, "status": ModelStatus.ACTIVE, "accuracy": None, "latency_ms": None, "requests_per_day": 0, "deployed_at": "2026-08-01T00:00:00Z", "description": "Primary deterministic decision engine for request approval and risk assessment."},
    {"external_id": "model-002", "name": "Inventory Demand Predictor", "version": "2.8.0", "type": ModelType.PREDICTOR, "status": ModelStatus.ACTIVE, "accuracy": None, "latency_ms": None, "requests_per_day": 0, "deployed_at": "2026-07-15T00:00:00Z", "description": "Time-series forecasting model placeholder awaiting measured telemetry."},
    {"external_id": "model-003", "name": "Anomaly Detection Engine", "version": "1.4.2", "type": ModelType.CLASSIFIER, "status": ModelStatus.ACTIVE, "accuracy": None, "latency_ms": None, "requests_per_day": 0, "deployed_at": "2026-06-01T00:00:00Z", "description": "Anomaly detection model placeholder awaiting measured telemetry."},
    {"external_id": "model-004", "name": "Request Optimizer v3", "version": "3.0.0-beta", "type": ModelType.OPTIMIZER, "status": ModelStatus.STAGING, "accuracy": None, "latency_ms": None, "requests_per_day": 0, "deployed_at": "2026-08-12T00:00:00Z", "description": "Next-gen request optimization candidate awaiting validation telemetry."},
]

ENGINEERING_REQUESTS = [
    {"external_id": "eng-001", "title": "Predictive Reorder Algorithm Enhancement", "description": "Integrate seasonal demand patterns into the reorder threshold calculation.", "current_stage": PipelineStage.TEST, "progress": 65, "status": EngineeringStatus.IN_PROGRESS, "created_at": "2026-08-12T09:00:00Z", "estimated_completion": "2026-08-16T18:00:00Z", "telemetry": [{"label": "Test Coverage", "value": "87", "unit": "%", "status": "good"}, {"label": "Latency", "value": "42", "unit": "ms", "status": "good"}, {"label": "Accuracy Delta", "value": "+2.3", "unit": "%", "status": "good"}, {"label": "Memory Usage", "value": "340", "unit": "MB", "status": "warning"}]},
    {"external_id": "eng-002", "title": "Multi-Modal Request Classification", "description": "Add image/document analysis capability to request processing pipeline.", "current_stage": PipelineStage.CODE, "progress": 35, "status": EngineeringStatus.IN_PROGRESS, "created_at": "2026-08-13T14:00:00Z", "estimated_completion": "2026-08-20T18:00:00Z", "telemetry": [{"label": "Build Status", "value": "Passing", "status": "good"}, {"label": "Lines Changed", "value": "1,247", "status": "good"}, {"label": "Test Coverage", "value": "62", "unit": "%", "status": "warning"}, {"label": "Bundle Size", "value": "+24", "unit": "KB", "status": "good"}]},
]

POLICIES = [
    {"external_id": "pol-001", "title": "Emergency Procurement Authorization", "description": "Defines thresholds and approval chains for emergency procurement requests.", "version": "3.1", "status": PolicyStatus.ACTIVE, "category": "Procurement", "created_by": "Zian", "updated_by": "Dr. E. Vance", "created_at": "2026-01-15T00:00:00Z", "updated_at": "2026-07-20T00:00:00Z", "effective_date": "2026-02-01T00:00:00Z", "rules": [{"external_id": "pr-1", "description": "Emergency requests below $5,000 require single manager approval.", "is_active": True, "scope": "All Departments"}, {"external_id": "pr-2", "description": "Emergency requests $5,000-$25,000 require dual approval.", "is_active": True, "scope": "All Departments"}, {"external_id": "pr-3", "description": "Requests above $25,000 require executive sign-off.", "is_active": True, "scope": "All Departments"}]},
    {"external_id": "pol-002", "title": "AI Decision Transparency Standard", "description": "Mandates logging and explainability for all AI-generated decisions.", "version": "2.0", "status": PolicyStatus.ACTIVE, "category": "Compliance", "created_by": "Zian", "updated_by": "Zian", "created_at": "2026-03-01T00:00:00Z", "updated_at": "2026-08-01T00:00:00Z", "rules": [{"external_id": "pr-4", "description": "All AI decisions must include confidence score and reasoning.", "is_active": True, "scope": "AI Systems"}, {"external_id": "pr-5", "description": "Decisions below 80% confidence require human review.", "is_active": True, "scope": "AI Systems"}, {"external_id": "pr-6", "description": "Audit trail retained for 7 years.", "is_active": True, "scope": "All Systems"}]},
    {"external_id": "pol-003", "title": "Critical Inventory Safety Stock Protocol", "description": "Defines minimum safety stock levels and automated response triggers.", "version": "1.4", "status": PolicyStatus.ACTIVE, "category": "Inventory", "created_by": "M. Ramos", "updated_by": "Zian", "created_at": "2026-04-10T00:00:00Z", "updated_at": "2026-06-15T00:00:00Z", "rules": [{"external_id": "pr-7", "description": "Safety stock minimum = 2x average daily consumption.", "is_active": True, "scope": "Inventory"}, {"external_id": "pr-8", "description": "Automatic alert at 120% of reorder threshold.", "is_active": True, "scope": "Inventory"}]},
    {"external_id": "pol-004", "title": "Data Retention and Archival Policy", "description": "Governs retention periods for operational data, audit logs, and reports.", "version": "0.9", "status": PolicyStatus.DRAFT, "category": "Compliance", "created_by": "Zian", "updated_by": "Zian", "created_at": "2026-08-10T00:00:00Z", "updated_at": "2026-08-13T00:00:00Z", "rules": [{"external_id": "pr-9", "description": "Operational data retained for 3 years.", "is_active": False, "scope": "All Systems"}, {"external_id": "pr-10", "description": "Audit logs retained for 7 years (regulatory).", "is_active": False, "scope": "Audit"}]},
]

AUDIT_EVENTS = [
    {"external_id": "aud-001", "event_code": "APPROVAL_GRANTED", "type": AuditEventType.APPROVAL, "action": "request.approved", "actor": "Zian", "actor_role": RoleName.ADMIN, "resource_type": "OperationalRequest", "resource_id": "REQ-2089-B", "description": "Approved request REQ-2089-B: AIO Cooling Units - 6 units.", "metadata": {"quantity": 6, "aiConfidence": 94}, "ip_address": "10.0.1.42", "timestamp": "2026-08-14T03:18:00Z", "severity": AuditSeverity.INFO},
    {"external_id": "aud-002", "event_code": "USER_LOGIN", "type": AuditEventType.AUTH, "action": "user.login", "actor": "Zian", "actor_role": RoleName.ADMIN, "resource_type": "Session", "resource_id": "sess-8849", "description": "User authenticated successfully.", "metadata": {}, "ip_address": "10.0.1.42", "timestamp": "2026-08-14T03:00:00Z", "severity": AuditSeverity.INFO},
    {"external_id": "aud-003", "event_code": "INVENTORY_UPDATED", "type": AuditEventType.SYSTEM, "action": "alert.triggered", "actor": "NEXUS System", "actor_role": RoleName.ADMIN, "resource_type": "InventoryItem", "resource_id": "inv-006", "description": "Low stock alert triggered for Thermal Paste (TPX-7). 14 units remaining.", "metadata": {"threshold": 30, "current": 14}, "ip_address": None, "timestamp": "2026-08-14T01:00:00Z", "severity": AuditSeverity.WARNING},
    {"external_id": "aud-004", "event_code": "REQUEST_CREATED", "type": AuditEventType.REQUEST, "action": "request.created", "actor": "Dr. E. Vance", "actor_role": RoleName.MANAGER, "resource_type": "OperationalRequest", "resource_id": "REQ-2094-A", "description": "New CRITICAL request submitted: Compute Nodes (Type-Z) - 30 units.", "metadata": {}, "ip_address": "10.0.2.15", "timestamp": "2026-08-14T03:48:00Z", "severity": AuditSeverity.WARNING},
    {"external_id": "aud-005", "event_code": "AI_DECISION_GENERATED", "type": AuditEventType.AI, "action": "ai.decision.generated", "actor": "NEXUS AI", "actor_role": RoleName.ADMIN, "resource_type": "OperationalRequest", "resource_id": "REQ-2094-A", "description": "AI decision generated: APPROVE with 92% confidence.", "metadata": {"confidence": 92, "decision": "APPROVE", "model": "NEXUS Decision Core v4.2.1"}, "ip_address": None, "timestamp": "2026-08-14T03:48:05Z", "severity": AuditSeverity.INFO},
    {"external_id": "aud-006", "event_code": "FULFILLMENT_COMPLETED", "type": AuditEventType.FULFILLMENT, "action": "fulfillment.completed", "actor": "A. Petrov", "actor_role": RoleName.OPERATOR, "resource_type": "FulfillmentOrder", "resource_id": "REQ-2089-B", "description": "Fulfillment completed for REQ-2089-B. Items dispatched.", "metadata": {}, "ip_address": "10.0.3.88", "timestamp": "2026-08-13T16:30:00Z", "severity": AuditSeverity.INFO},
    {"external_id": "aud-007", "event_code": "POLICY_UPDATED", "type": AuditEventType.POLICY, "action": "policy.updated", "actor": "Zian", "actor_role": RoleName.ADMIN, "resource_type": "Policy", "resource_id": "pol-002", "description": "Policy POL-002 updated to v2.0. AI Decision Transparency Standard.", "metadata": {}, "ip_address": "10.0.1.42", "timestamp": "2026-08-01T11:00:00Z", "severity": AuditSeverity.INFO},
    {"external_id": "aud-008", "event_code": "USER_ROLE_CHANGED", "type": AuditEventType.USER, "action": "user.role.changed", "actor": "Zian", "actor_role": RoleName.ADMIN, "resource_type": "User", "resource_id": "user-005", "description": "User role updated: A. Petrov promoted from VIEWER to OPERATOR.", "metadata": {}, "ip_address": "10.0.1.42", "timestamp": "2026-08-10T09:00:00Z", "severity": AuditSeverity.WARNING},
]

REPORTS = [
    {"external_id": "rep-001", "title": "Weekly Operations Summary", "description": "Comprehensive weekly summary of all operational activities, KPIs, and AI decisions.", "category": ReportCategory.EXECUTIVE, "status": ReportStatus.GENERATED, "format": ReportFormat.PDF, "generated_by": "NEXUS System", "generated_at": "2026-08-13T06:00:00Z", "file_size": "Calculated on download", "date_from": "2026-08-07", "date_to": "2026-08-13"},
    {"external_id": "rep-002", "title": "Inventory Status Report", "description": "Current inventory levels, stock health, reorder triggers, and supplier performance.", "category": ReportCategory.INVENTORY, "status": ReportStatus.GENERATED, "format": ReportFormat.CSV, "generated_by": "Zian", "generated_at": "2026-08-14T04:00:00Z", "file_size": "Calculated on download", "date_from": "2026-08-01", "date_to": "2026-08-14"},
    {"external_id": "rep-003", "title": "AI Decision Audit", "description": "Audit of all AI-generated decisions including confidence scores and outcomes.", "category": ReportCategory.AI, "status": ReportStatus.GENERATED, "format": ReportFormat.PDF, "generated_by": "Zian", "generated_at": "2026-08-14T02:30:00Z", "file_size": "Calculated on download", "date_from": "2026-08-01", "date_to": "2026-08-14"},
    {"external_id": "rep-004", "title": "Compliance & Policy Report", "description": "Policy compliance tracking, violations, and remediation actions.", "category": ReportCategory.COMPLIANCE, "status": ReportStatus.GENERATING, "format": ReportFormat.PDF, "generated_by": "Zian", "date_from": "2026-07-01", "date_to": "2026-08-14"},
    {"external_id": "rep-005", "title": "Fulfillment Performance Analysis", "description": "SLA adherence, delivery times, carrier performance, and fulfillment trends.", "category": ReportCategory.FULFILLMENT, "status": ReportStatus.GENERATED, "format": ReportFormat.XLSX, "generated_by": "M. Ramos", "generated_at": "2026-08-12T10:00:00Z", "file_size": "Calculated on download", "date_from": "2026-07-01", "date_to": "2026-08-12"},
    {"external_id": "rep-006", "title": "Request Volume & Trends", "description": "Request volume analysis by type, priority, department, and time period.", "category": ReportCategory.REQUESTS, "status": ReportStatus.GENERATED, "format": ReportFormat.PDF, "generated_by": "Dr. E. Vance", "generated_at": "2026-08-11T08:00:00Z", "file_size": "Calculated on download", "date_from": "2026-07-01", "date_to": "2026-08-11"},
]

COPILOT_MESSAGES = [
    {"external_id": "msg-1", "role": CopilotMessageRole.ASSISTANT, "content": "Hello Zian. I'm NEXUS Copilot, your operational intelligence assistant. Ask me about the current database state for inventory, approvals, fulfillment, reports, or audit activity."},
]

USERS.extend([
    {"external_id": "usr-006", "email": "authority@nexus.corp", "display_name": "Executive Authority", "role": RoleName.MANAGER, "department": "Executive Approval", "permissions": ["requests:approve", "reports:export", "audit:read", "policies:read"]},
])

INVENTORY.extend([
    {"external_id": "inv-013", "sku": "RACK-RAIL-KIT", "name": "Rack Rail Kit", "category": "Infrastructure", "zone": "Zone E", "quantity_on_hand": 18, "quantity_reserved": 3, "reorder_threshold": 20, "max_capacity": 80, "unit": "kits", "status": InventoryStatus.LOW, "last_updated": "2026-08-12T09:00:00Z", "supplier": "RackSystems", "unit_cost": "210"},
    {"external_id": "inv-014", "sku": "PDU-32A-MTR", "name": "PDU 32A Metered", "category": "Power", "zone": "Zone C", "quantity_on_hand": 9, "quantity_reserved": 2, "reorder_threshold": 12, "max_capacity": 45, "unit": "units", "status": InventoryStatus.LOW, "last_updated": "2026-08-11T15:00:00Z", "supplier": "PowerSafe Ltd", "unit_cost": "980"},
    {"external_id": "inv-015", "sku": "BKP-APPL-12B", "name": "Backup Appliance (12-bay)", "category": "Storage", "zone": "Zone E", "quantity_on_hand": 5, "quantity_reserved": 1, "reorder_threshold": 4, "max_capacity": 16, "unit": "units", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-07T11:20:00Z", "supplier": "DataDrive", "unit_cost": "7400"},
    {"external_id": "inv-016", "sku": "OPS-TAB-KIT", "name": "Operator Tablet Kit", "category": "Operations", "zone": "Zone D", "quantity_on_hand": 22, "quantity_reserved": 4, "reorder_threshold": 10, "max_capacity": 70, "unit": "kits", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-06T08:45:00Z", "supplier": "FieldTech", "unit_cost": "620"},
    {"external_id": "inv-017", "sku": "NET-QSFP28", "name": "QSFP28 Transceiver", "category": "Networking", "zone": "Zone A", "quantity_on_hand": 48, "quantity_reserved": 10, "reorder_threshold": 30, "max_capacity": 120, "unit": "units", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-06T13:30:00Z", "supplier": "FiberOptics Co", "unit_cost": "410"},
    {"external_id": "inv-018", "sku": "LBL-CART-WHT", "name": "Cable Label Cartridge", "category": "Consumables", "zone": "Zone D", "quantity_on_hand": 70, "quantity_reserved": 12, "reorder_threshold": 60, "max_capacity": 220, "unit": "cartridges", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-05T12:10:00Z", "supplier": "CableMax", "unit_cost": "28"},
    {"external_id": "inv-019", "sku": "GPU-THERM-PAD", "name": "GPU Thermal Pad Set", "category": "Consumables", "zone": "Zone A", "quantity_on_hand": 16, "quantity_reserved": 2, "reorder_threshold": 25, "max_capacity": 160, "unit": "sets", "status": InventoryStatus.LOW, "last_updated": "2026-08-04T16:40:00Z", "supplier": "ThermoLabs", "unit_cost": "64"},
    {"external_id": "inv-020", "sku": "SEC-CAM-DOME", "name": "Security Camera Dome", "category": "Security", "zone": "Zone B", "quantity_on_hand": 11, "quantity_reserved": 1, "reorder_threshold": 10, "max_capacity": 50, "unit": "units", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-09T10:05:00Z", "supplier": "SecureAccess", "unit_cost": "340"},
    {"external_id": "inv-021", "sku": "SEC-DOOR-SENS", "name": "Door Sensor Module", "category": "Security", "zone": "Zone C", "quantity_on_hand": 7, "quantity_reserved": 1, "reorder_threshold": 15, "max_capacity": 90, "unit": "units", "status": InventoryStatus.CRITICAL, "last_updated": "2026-08-02T09:30:00Z", "supplier": "SecureAccess", "unit_cost": "85"},
    {"external_id": "inv-022", "sku": "CPU-PSU-1600", "name": "Compute Node PSU", "category": "Power", "zone": "Zone A", "quantity_on_hand": 18, "quantity_reserved": 5, "reorder_threshold": 18, "max_capacity": 90, "unit": "units", "status": InventoryStatus.LOW, "last_updated": "2026-08-14T05:10:00Z", "supplier": "TechCorp Global", "unit_cost": "540"},
    {"external_id": "inv-023", "sku": "SSD-RAID-NVME", "name": "NVMe RAID Controller", "category": "Storage", "zone": "Zone A", "quantity_on_hand": 14, "quantity_reserved": 2, "reorder_threshold": 8, "max_capacity": 40, "unit": "units", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-07T14:30:00Z", "supplier": "DataDrive", "unit_cost": "860"},
    {"external_id": "inv-024", "sku": "ENV-SENS-PACK", "name": "Environmental Sensor Pack", "category": "Infrastructure", "zone": "Zone E", "quantity_on_hand": 30, "quantity_reserved": 6, "reorder_threshold": 20, "max_capacity": 100, "unit": "packs", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-08T17:15:00Z", "supplier": "AquaFlow", "unit_cost": "125"},
    {"external_id": "inv-025", "sku": "ESD-SVC-KIT", "name": "Anti-Static Service Kit", "category": "Consumables", "zone": "Zone D", "quantity_on_hand": 42, "quantity_reserved": 8, "reorder_threshold": 25, "max_capacity": 140, "unit": "kits", "status": InventoryStatus.OPTIMAL, "last_updated": "2026-08-03T07:50:00Z", "supplier": "FieldTech", "unit_cost": "55"},
])

REQUESTS.extend([
    {"external_id": "req-008", "request_number": "REQ-2087-A", "title": "Storage Expansion Batch", "description": "NVMe SSD pool expansion for data science workloads.", "type": RequestType.PURCHASE, "priority": RequestPriority.HIGH, "status": RequestStatus.COMPLETED, "requester": "Zian", "requester_department": "Engineering", "inventory_item": "NVMe SSD (4TB)", "quantity": 20, "ai_decision": AIDecision.APPROVE, "ai_confidence": 91, "ai_reasoning": "Approved against capacity expansion forecast and available budget.", "created_at": "2026-08-12T10:10:00Z", "updated_at": "2026-08-13T09:00:00Z"},
    {"external_id": "req-009", "request_number": "REQ-2086-C", "title": "Access Badge Reissue", "description": "Badge replacement for new contractors and expired credentials.", "type": RequestType.STANDARD, "priority": RequestPriority.NORMAL, "status": RequestStatus.APPROVED, "requester": "M. Ramos", "requester_department": "Supply Chain", "inventory_item": "Proximity Access Badge", "quantity": 25, "ai_decision": AIDecision.APPROVE, "ai_confidence": 96, "ai_reasoning": "Stock is sufficient and request is inside standard operating bounds.", "created_at": "2026-08-12T08:20:00Z", "updated_at": "2026-08-12T12:00:00Z"},
    {"external_id": "req-010", "request_number": "REQ-2085-B", "title": "Fiber Uplink Expansion", "description": "Additional transceivers and single-mode fiber for Zone A uplink expansion.", "type": RequestType.MAINTENANCE, "priority": RequestPriority.HIGH, "status": RequestStatus.IN_PROGRESS, "requester": "Chen Wei", "requester_department": "Operations", "inventory_item": "QSFP28 Transceiver", "quantity": 18, "ai_decision": AIDecision.APPROVE, "ai_confidence": 90, "ai_reasoning": "Capacity expansion aligns with approved network maintenance window.", "created_at": "2026-08-11T13:15:00Z", "updated_at": "2026-08-12T09:30:00Z"},
    {"external_id": "req-011", "request_number": "REQ-2084-D", "title": "UPS Battery Inspection", "description": "Replace failed UPS modules identified during Zone C inspection.", "type": RequestType.MAINTENANCE, "priority": RequestPriority.NORMAL, "status": RequestStatus.COMPLETED, "requester": "A. Petrov", "requester_department": "Fulfillment", "inventory_item": "UPS Power Units (2KVA)", "quantity": 3, "ai_decision": AIDecision.APPROVE, "ai_confidence": 93, "ai_reasoning": "Maintenance request prevents power continuity risk.", "created_at": "2026-08-11T07:30:00Z", "updated_at": "2026-08-11T16:45:00Z"},
    {"external_id": "req-012", "request_number": "REQ-2083-B", "title": "AI Lab Memory Pool", "description": "Large DDR5 memory allocation for experimental workloads.", "type": RequestType.PURCHASE, "priority": RequestPriority.HIGH, "status": RequestStatus.REJECTED, "requester": "Dr. E. Vance", "requester_department": "Advanced Research", "inventory_item": "DDR5 Memory Modules", "quantity": 200, "ai_decision": AIDecision.REVIEW, "ai_confidence": 74, "ai_reasoning": "Request exceeds current approved project allocation and requires re-scope.", "created_at": "2026-08-10T15:40:00Z", "updated_at": "2026-08-10T18:05:00Z"},
    {"external_id": "req-013", "request_number": "REQ-2082-A", "title": "Emergency Cooling Reserve", "description": "Reserve cooling units for hot aisle temperature spike.", "type": RequestType.EMERGENCY, "priority": RequestPriority.CRITICAL, "status": RequestStatus.APPROVED, "requester": "M. Ramos", "requester_department": "Supply Chain", "inventory_item": "AIO Liquid Cooling Units", "quantity": 12, "ai_decision": AIDecision.ESCALATE, "ai_confidence": 89, "ai_reasoning": "Critical environment condition; route to manager authority for expedited approval.", "created_at": "2026-08-10T05:50:00Z", "updated_at": "2026-08-10T06:20:00Z"},
    {"external_id": "req-014", "request_number": "REQ-2081-E", "title": "Rack Rail Kit Restock", "description": "Restock rails before the Zone E rack expansion cycle.", "type": RequestType.PURCHASE, "priority": RequestPriority.NORMAL, "status": RequestStatus.PENDING, "requester": "A. Petrov", "requester_department": "Fulfillment", "inventory_item": "Rack Rail Kit", "quantity": 30, "ai_decision": AIDecision.APPROVE, "ai_confidence": 95, "ai_reasoning": "Current stock is below threshold and procurement is within normal range.", "created_at": "2026-08-09T14:25:00Z", "updated_at": "2026-08-09T14:25:00Z"},
    {"external_id": "req-015", "request_number": "REQ-2080-C", "title": "Security Camera Upgrade", "description": "Replace aging dome cameras in Zone B staging area.", "type": RequestType.MAINTENANCE, "priority": RequestPriority.NORMAL, "status": RequestStatus.COMPLETED, "requester": "Chen Wei", "requester_department": "Operations", "inventory_item": "Security Camera Dome", "quantity": 5, "ai_decision": AIDecision.APPROVE, "ai_confidence": 92, "ai_reasoning": "Routine security maintenance with sufficient inventory.", "created_at": "2026-08-09T08:15:00Z", "updated_at": "2026-08-09T17:30:00Z"},
    {"external_id": "req-016", "request_number": "REQ-2079-C", "title": "Power Distribution Units", "description": "PDU replenishment needed before compute pod expansion.", "type": RequestType.PURCHASE, "priority": RequestPriority.HIGH, "status": RequestStatus.PENDING, "requester": "M. Ramos", "requester_department": "Supply Chain", "inventory_item": "PDU 32A Metered", "quantity": 16, "ai_decision": AIDecision.REVIEW, "ai_confidence": 82, "ai_reasoning": "Stock is below threshold; purchase amount needs manager approval.", "created_at": "2026-08-08T11:10:00Z", "updated_at": "2026-08-08T11:10:00Z"},
    {"external_id": "req-017", "request_number": "REQ-2078-A", "title": "Database Backup Appliances", "description": "Deploy backup appliance pair for disaster recovery drill.", "type": RequestType.PURCHASE, "priority": RequestPriority.HIGH, "status": RequestStatus.COMPLETED, "requester": "Zian", "requester_department": "Engineering", "inventory_item": "Backup Appliance (12-bay)", "quantity": 2, "ai_decision": AIDecision.APPROVE, "ai_confidence": 90, "ai_reasoning": "Disaster recovery requirement is approved and inventory can support it.", "created_at": "2026-08-07T10:00:00Z", "updated_at": "2026-08-08T09:00:00Z"},
    {"external_id": "req-018", "request_number": "REQ-2077-D", "title": "Operator Tablet Kits", "description": "Tablet refresh for field operators.", "type": RequestType.STANDARD, "priority": RequestPriority.LOW, "status": RequestStatus.CANCELLED, "requester": "A. Petrov", "requester_department": "Fulfillment", "inventory_item": "Operator Tablet Kit", "quantity": 8, "ai_decision": AIDecision.APPROVE, "ai_confidence": 94, "ai_reasoning": "Request was valid but cancelled by requester after schedule change.", "created_at": "2026-08-06T12:00:00Z", "updated_at": "2026-08-06T14:00:00Z"},
    {"external_id": "req-019", "request_number": "REQ-2076-B", "title": "Network Transceiver Batch", "description": "Transceiver batch for fiber link redundancy.", "type": RequestType.PURCHASE, "priority": RequestPriority.NORMAL, "status": RequestStatus.APPROVED, "requester": "Chen Wei", "requester_department": "Operations", "inventory_item": "QSFP28 Transceiver", "quantity": 20, "ai_decision": AIDecision.APPROVE, "ai_confidence": 91, "ai_reasoning": "Stock level supports allocation while maintaining safety margin.", "created_at": "2026-08-06T09:30:00Z", "updated_at": "2026-08-06T11:20:00Z"},
    {"external_id": "req-020", "request_number": "REQ-2075-D", "title": "Cable Label Stock", "description": "Consumable label cartridges for recabling work.", "type": RequestType.STANDARD, "priority": RequestPriority.NORMAL, "status": RequestStatus.COMPLETED, "requester": "A. Petrov", "requester_department": "Fulfillment", "inventory_item": "Cable Label Cartridge", "quantity": 30, "ai_decision": AIDecision.APPROVE, "ai_confidence": 98, "ai_reasoning": "Routine consumable replenishment approved.", "created_at": "2026-08-05T10:10:00Z", "updated_at": "2026-08-05T15:00:00Z"},
    {"external_id": "req-021", "request_number": "REQ-2074-A", "title": "GPU Thermal Pad Restock", "description": "Restock thermal pads before accelerator maintenance.", "type": RequestType.PURCHASE, "priority": RequestPriority.HIGH, "status": RequestStatus.PENDING, "requester": "Zian", "requester_department": "Engineering", "inventory_item": "GPU Thermal Pad Set", "quantity": 60, "ai_decision": AIDecision.APPROVE, "ai_confidence": 96, "ai_reasoning": "SKU is below reorder threshold and maintenance demand is scheduled.", "created_at": "2026-08-04T16:20:00Z", "updated_at": "2026-08-04T16:20:00Z"},
    {"external_id": "req-022", "request_number": "REQ-2073-C", "title": "Emergency Spare Switches", "description": "Spare switch allocation for degraded network segment.", "type": RequestType.EMERGENCY, "priority": RequestPriority.CRITICAL, "status": RequestStatus.APPROVED, "requester": "Chen Wei", "requester_department": "Operations", "inventory_item": "48-Port Network Switch", "quantity": 6, "ai_decision": AIDecision.ESCALATE, "ai_confidence": 87, "ai_reasoning": "Critical network risk requires human authorization before dispatch.", "created_at": "2026-08-03T06:50:00Z", "updated_at": "2026-08-03T07:30:00Z"},
    {"external_id": "req-023", "request_number": "REQ-2072-C", "title": "Door Sensor Replacements", "description": "Replace failed door sensors after access-control inspection.", "type": RequestType.MAINTENANCE, "priority": RequestPriority.NORMAL, "status": RequestStatus.COMPLETED, "requester": "M. Ramos", "requester_department": "Supply Chain", "inventory_item": "Door Sensor Module", "quantity": 4, "ai_decision": AIDecision.APPROVE, "ai_confidence": 93, "ai_reasoning": "Maintenance request has low cost and controlled operational impact.", "created_at": "2026-08-02T09:00:00Z", "updated_at": "2026-08-02T13:20:00Z"},
    {"external_id": "req-024", "request_number": "REQ-2071-E", "title": "Server Rack Expansion", "description": "Rack expansion for additional compute capacity.", "type": RequestType.PURCHASE, "priority": RequestPriority.NORMAL, "status": RequestStatus.COMPLETED, "requester": "Dr. E. Vance", "requester_department": "Advanced Research", "inventory_item": "Server Rack (42U Standard)", "quantity": 2, "ai_decision": AIDecision.APPROVE, "ai_confidence": 89, "ai_reasoning": "Planned expansion with available rack inventory.", "created_at": "2026-08-01T12:30:00Z", "updated_at": "2026-08-01T18:45:00Z"},
    {"external_id": "req-025", "request_number": "REQ-2070-A", "title": "Compute Node PSU Swap", "description": "PSU replacement kits for Type-Z compute nodes showing voltage instability.", "type": RequestType.EMERGENCY, "priority": RequestPriority.CRITICAL, "status": RequestStatus.PENDING, "requester": "Executive Authority", "requester_department": "Executive Approval", "inventory_item": "Compute Node PSU", "quantity": 16, "ai_decision": AIDecision.ESCALATE, "ai_confidence": 94, "ai_reasoning": "Critical compute reliability issue and low stock require authority approval.", "created_at": "2026-08-14T05:35:00Z", "updated_at": "2026-08-14T05:35:00Z"},
])

APPROVALS.extend([
    {"external_id": "appr-004", "request_number": "REQ-2087-A", "status": ApprovalStatus.APPROVED, "quantity_requested": 20, "quantity_approved": 20, "unit": "units", "ai_recommendation": "Approve storage expansion. Existing inventory supports immediate allocation.", "available_stock": 89, "procure_quantity": 0, "safety_stock": 40, "waiting_time": "Resolved", "ai_confidence": 91, "created_at": "2026-08-12T10:10:00Z"},
    {"external_id": "appr-005", "request_number": "REQ-2086-C", "status": ApprovalStatus.APPROVED, "quantity_requested": 25, "quantity_approved": 25, "unit": "units", "ai_recommendation": "Approve badge reissue from available stock.", "available_stock": 52, "procure_quantity": 0, "safety_stock": 20, "waiting_time": "Resolved", "ai_confidence": 96, "created_at": "2026-08-12T08:20:00Z"},
    {"external_id": "appr-006", "request_number": "REQ-2085-B", "status": ApprovalStatus.APPROVED, "quantity_requested": 18, "quantity_approved": 18, "unit": "units", "ai_recommendation": "Approve transceiver allocation for approved maintenance window.", "available_stock": 48, "procure_quantity": 0, "safety_stock": 30, "waiting_time": "Resolved", "ai_confidence": 90, "created_at": "2026-08-11T13:15:00Z"},
    {"external_id": "appr-007", "request_number": "REQ-2083-B", "status": ApprovalStatus.REJECTED, "quantity_requested": 200, "quantity_approved": 0, "unit": "units", "ai_recommendation": "Reject until project allocation is re-scoped.", "available_stock": 156, "procure_quantity": 94, "safety_stock": 50, "waiting_time": "Resolved", "ai_confidence": 74, "created_at": "2026-08-10T15:40:00Z"},
    {"external_id": "appr-008", "request_number": "REQ-2082-A", "status": ApprovalStatus.APPROVED, "quantity_requested": 12, "quantity_approved": 12, "unit": "units", "ai_recommendation": "Emergency approval with manager sign-off due to hot aisle risk.", "available_stock": 38, "procure_quantity": 0, "safety_stock": 25, "waiting_time": "Resolved", "ai_confidence": 89, "created_at": "2026-08-10T05:50:00Z"},
    {"external_id": "appr-009", "request_number": "REQ-2081-E", "status": ApprovalStatus.PENDING, "quantity_requested": 30, "quantity_approved": None, "unit": "kits", "ai_recommendation": "Approve purchase. SKU is below reorder threshold.", "available_stock": 18, "procure_quantity": 32, "safety_stock": 20, "waiting_time": "4d 3h", "ai_confidence": 95, "created_at": "2026-08-09T14:25:00Z"},
    {"external_id": "appr-010", "request_number": "REQ-2079-C", "status": ApprovalStatus.PENDING, "quantity_requested": 16, "quantity_approved": None, "unit": "units", "ai_recommendation": "Manager review due to below-threshold PDU stock.", "available_stock": 9, "procure_quantity": 19, "safety_stock": 12, "waiting_time": "5d 1h", "ai_confidence": 82, "created_at": "2026-08-08T11:10:00Z"},
    {"external_id": "appr-011", "request_number": "REQ-2074-A", "status": ApprovalStatus.PENDING, "quantity_requested": 60, "quantity_approved": None, "unit": "sets", "ai_recommendation": "Approve procurement ahead of accelerator maintenance.", "available_stock": 16, "procure_quantity": 69, "safety_stock": 25, "waiting_time": "9d 13h", "ai_confidence": 96, "created_at": "2026-08-04T16:20:00Z"},
    {"external_id": "appr-012", "request_number": "REQ-2073-C", "status": ApprovalStatus.APPROVED, "quantity_requested": 6, "quantity_approved": 6, "unit": "units", "ai_recommendation": "Critical approval recommended for network recovery.", "available_stock": 8, "procure_quantity": 3, "safety_stock": 5, "waiting_time": "Resolved", "ai_confidence": 87, "created_at": "2026-08-03T06:50:00Z"},
    {"external_id": "appr-013", "request_number": "REQ-2070-A", "status": ApprovalStatus.PENDING, "quantity_requested": 16, "quantity_approved": None, "unit": "units", "ai_recommendation": "Escalate to executive authority due to critical compute risk.", "available_stock": 18, "procure_quantity": 16, "safety_stock": 18, "waiting_time": "18m", "ai_confidence": 94, "created_at": "2026-08-14T05:35:00Z"},
])

FULFILLMENT.extend([
    {"external_id": "ful-005", "request_number": "REQ-2087-A", "title": "Storage Expansion Batch", "requested_by": "Zian", "approved_by": "Executive Authority", "approved_quantity": 20, "available_stock": 89, "safety_stock_min": 20, "safety_stock_max": 60, "unit": "units", "status": FulfillmentStatus.DELIVERED, "priority": RequestPriority.HIGH, "carrier": "TechLogistics Express", "tracking_number": "TLX-2087-120", "eta": "2026-08-13T09:00:00Z", "approved_at": "2026-08-12T10:30:00Z", "fulfilled_at": "2026-08-13T09:00:00Z"},
    {"external_id": "ful-006", "request_number": "REQ-2086-C", "title": "Access Badge Reissue", "requested_by": "M. Ramos", "approved_by": "Zian", "approved_quantity": 25, "available_stock": 52, "safety_stock_min": 10, "safety_stock_max": 30, "unit": "units", "status": FulfillmentStatus.DELIVERED, "priority": RequestPriority.NORMAL, "approved_at": "2026-08-12T12:00:00Z", "fulfilled_at": "2026-08-12T16:00:00Z"},
    {"external_id": "ful-007", "request_number": "REQ-2085-B", "title": "Fiber Uplink Expansion", "requested_by": "Chen Wei", "approved_by": "Executive Authority", "approved_quantity": 18, "available_stock": 48, "safety_stock_min": 15, "safety_stock_max": 45, "unit": "units", "status": FulfillmentStatus.ALLOCATED, "priority": RequestPriority.HIGH, "approved_at": "2026-08-11T14:00:00Z"},
    {"external_id": "ful-008", "request_number": "REQ-2082-A", "title": "Emergency Cooling Reserve", "requested_by": "M. Ramos", "approved_by": "Executive Authority", "approved_quantity": 12, "available_stock": 38, "safety_stock_min": 10, "safety_stock_max": 30, "unit": "units", "status": FulfillmentStatus.SHIPPED, "priority": RequestPriority.CRITICAL, "carrier": "TechLogistics Express", "tracking_number": "TLX-2082-044", "eta": "2026-08-10T14:30:00Z", "approved_at": "2026-08-10T06:20:00Z"},
    {"external_id": "ful-009", "request_number": "REQ-2078-A", "title": "Database Backup Appliances", "requested_by": "Zian", "approved_by": "Executive Authority", "approved_quantity": 2, "available_stock": 5, "safety_stock_min": 2, "safety_stock_max": 6, "unit": "units", "status": FulfillmentStatus.DELIVERED, "priority": RequestPriority.HIGH, "approved_at": "2026-08-07T11:00:00Z", "fulfilled_at": "2026-08-08T09:00:00Z"},
    {"external_id": "ful-010", "request_number": "REQ-2076-B", "title": "Network Transceiver Batch", "requested_by": "Chen Wei", "approved_by": "Zian", "approved_quantity": 20, "available_stock": 48, "safety_stock_min": 15, "safety_stock_max": 45, "unit": "units", "status": FulfillmentStatus.PROCESSING, "priority": RequestPriority.NORMAL, "approved_at": "2026-08-06T11:20:00Z"},
    {"external_id": "ful-011", "request_number": "REQ-2073-C", "title": "Emergency Spare Switches", "requested_by": "Chen Wei", "approved_by": "Executive Authority", "approved_quantity": 6, "available_stock": 8, "safety_stock_min": 2, "safety_stock_max": 8, "unit": "units", "status": FulfillmentStatus.QUEUED, "priority": RequestPriority.CRITICAL, "approved_at": "2026-08-03T07:30:00Z"},
    {"external_id": "ful-012", "request_number": "REQ-2072-C", "title": "Door Sensor Replacements", "requested_by": "M. Ramos", "approved_by": "Zian", "approved_quantity": 4, "available_stock": 7, "safety_stock_min": 5, "safety_stock_max": 20, "unit": "units", "status": FulfillmentStatus.DELIVERED, "priority": RequestPriority.NORMAL, "approved_at": "2026-08-02T09:30:00Z", "fulfilled_at": "2026-08-02T13:20:00Z"},
    {"external_id": "ful-013", "request_number": "REQ-2071-E", "title": "Server Rack Expansion", "requested_by": "Dr. E. Vance", "approved_by": "Executive Authority", "approved_quantity": 2, "available_stock": 6, "safety_stock_min": 1, "safety_stock_max": 4, "unit": "units", "status": FulfillmentStatus.DELIVERED, "priority": RequestPriority.NORMAL, "approved_at": "2026-08-01T13:10:00Z", "fulfilled_at": "2026-08-01T18:45:00Z"},
])

AUDIT_EVENTS.extend([
    {"external_id": "aud-009", "event_code": "AUTHORITY_LOGIN", "type": AuditEventType.AUTH, "action": "user.login", "actor": "Executive Authority", "actor_role": RoleName.MANAGER, "resource_type": "Session", "resource_id": "sess-9001", "description": "Higher-authority manager authenticated for approval review.", "metadata": {}, "ip_address": "10.0.1.77", "timestamp": "2026-08-14T05:20:00Z", "severity": AuditSeverity.INFO},
    {"external_id": "aud-010", "event_code": "REQUEST_CREATED", "type": AuditEventType.REQUEST, "action": "request.created", "actor": "Executive Authority", "actor_role": RoleName.MANAGER, "resource_type": "OperationalRequest", "resource_id": "REQ-2070-A", "description": "Critical PSU swap request created for compute node reliability.", "metadata": {"quantity": 16}, "ip_address": "10.0.1.77", "timestamp": "2026-08-14T05:35:00Z", "severity": AuditSeverity.CRITICAL},
    {"external_id": "aud-011", "event_code": "APPROVAL_PENDING", "type": AuditEventType.APPROVAL, "action": "approval.pending", "actor": "NEXUS AI", "actor_role": RoleName.ADMIN, "resource_type": "Approval", "resource_id": "REQ-2070-A", "description": "REQ-2070-A escalated for higher-authority approval.", "metadata": {"aiConfidence": 94}, "ip_address": None, "timestamp": "2026-08-14T05:35:05Z", "severity": AuditSeverity.WARNING},
    {"external_id": "aud-012", "event_code": "FULFILLMENT_SHIPPED", "type": AuditEventType.FULFILLMENT, "action": "fulfillment.shipped", "actor": "A. Petrov", "actor_role": RoleName.OPERATOR, "resource_type": "FulfillmentOrder", "resource_id": "REQ-2082-A", "description": "Emergency cooling reserve shipped through TLX-2082-044.", "metadata": {"tracking": "TLX-2082-044"}, "ip_address": "10.0.3.88", "timestamp": "2026-08-10T08:00:00Z", "severity": AuditSeverity.INFO},
    {"external_id": "aud-013", "event_code": "REQUEST_REJECTED", "type": AuditEventType.APPROVAL, "action": "request.rejected", "actor": "Executive Authority", "actor_role": RoleName.MANAGER, "resource_type": "OperationalRequest", "resource_id": "REQ-2083-B", "description": "Rejected AI Lab Memory Pool pending scope revision.", "metadata": {"quantity": 200}, "ip_address": "10.0.1.77", "timestamp": "2026-08-10T18:05:00Z", "severity": AuditSeverity.WARNING},
    {"external_id": "aud-014", "event_code": "INVENTORY_UPDATED", "type": AuditEventType.INVENTORY, "action": "inventory.updated", "actor": "NEXUS System", "actor_role": RoleName.ADMIN, "resource_type": "InventoryItem", "resource_id": "inv-021", "description": "Door Sensor Module entered CRITICAL stock state.", "metadata": {"threshold": 15, "current": 7}, "ip_address": None, "timestamp": "2026-08-02T09:30:00Z", "severity": AuditSeverity.WARNING},
    {"external_id": "aud-015", "event_code": "REPORT_GENERATED", "type": AuditEventType.REPORT, "action": "report.generated", "actor": "Zian", "actor_role": RoleName.ADMIN, "resource_type": "Report", "resource_id": "rep-007", "description": "Generated daily critical approval report.", "metadata": {"category": "EXECUTIVE"}, "ip_address": "10.0.1.42", "timestamp": "2026-08-14T06:10:00Z", "severity": AuditSeverity.INFO},
])

REPORTS.extend([
    {"external_id": "rep-007", "title": "Daily Critical Approval Brief", "description": "Current critical requests, pending approval exposure, and recommended authority actions.", "category": ReportCategory.EXECUTIVE, "status": ReportStatus.GENERATED, "format": ReportFormat.PDF, "generated_by": "Executive Authority", "generated_at": "2026-08-14T06:10:00Z", "file_size": "Calculated on download", "date_from": "2026-08-14", "date_to": "2026-08-14"},
    {"external_id": "rep-008", "title": "Low Stock Reorder Exposure", "description": "Low and critical SKU exposure grouped by supplier and operational zone.", "category": ReportCategory.INVENTORY, "status": ReportStatus.GENERATED, "format": ReportFormat.XLSX, "generated_by": "M. Ramos", "generated_at": "2026-08-13T17:00:00Z", "file_size": "Calculated on download", "date_from": "2026-08-01", "date_to": "2026-08-13"},
    {"external_id": "rep-009", "title": "Fulfillment Queue Snapshot", "description": "Fulfillment queue status, delivered orders, and in-transit exposure.", "category": ReportCategory.FULFILLMENT, "status": ReportStatus.GENERATED, "format": ReportFormat.CSV, "generated_by": "A. Petrov", "generated_at": "2026-08-12T19:00:00Z", "file_size": "Calculated on download", "date_from": "2026-08-01", "date_to": "2026-08-12"},
    {"external_id": "rep-010", "title": "RBAC and Auth Readiness Review", "description": "User directory, higher-authority account setup, and audit controls.", "category": ReportCategory.COMPLIANCE, "status": ReportStatus.GENERATED, "format": ReportFormat.PDF, "generated_by": "Zian", "generated_at": "2026-08-14T07:30:00Z", "file_size": "Calculated on download", "date_from": "2026-08-01", "date_to": "2026-08-14"},
])


def dataset_counts() -> dict[str, int]:
    return {
        "roles": len(RoleName),
        "users": len(USERS),
        "inventory_items": len(INVENTORY),
        "operational_requests": len(REQUESTS),
        "approvals": len(APPROVALS),
        "fulfillment_orders": len(FULFILLMENT),
        "decision_rules": len(DECISION_RULES),
        "ai_models": len(AI_MODELS),
        "engineering_requests": len(ENGINEERING_REQUESTS),
        "policies": len(POLICIES),
        "audit_events": len(AUDIT_EVENTS),
        "reports": len(REPORTS),
        "copilot_messages": len(COPILOT_MESSAGES),
    }


def seed(session: Session) -> None:
    _seed_roles(session)
    role_ids = {role: demo_uuid("role", role.value) for role in RoleName}
    user_ids = _seed_users(session, role_ids)
    inventory_ids = _seed_inventory(session)
    request_ids = _seed_requests(session, user_ids, inventory_ids)
    approval_ids = _seed_approvals(session, user_ids, request_ids)
    _seed_fulfillment(session, user_ids, request_ids, approval_ids)
    rule_ids = _seed_decision_rules(session, user_ids)
    _seed_decision_outcomes(session, request_ids, rule_ids)
    _seed_ai_models(session)
    _seed_engineering(session)
    _seed_policies(session, user_ids)
    _seed_audit(session, user_ids)
    _seed_reports(session, user_ids)
    _seed_copilot(session, user_ids)
    _seed_settings(session, user_ids)
    session.commit()


def _seed_roles(session: Session) -> None:
    for role in RoleName:
        role_id = demo_uuid("role", role.value)
        session.merge(Role(id=role_id, name=role, description=f"NEXUS {role.value.title()} role"))
        for permission in ROLE_PERMISSIONS[role]:
            session.merge(
                RolePermission(
                    id=demo_uuid("role_permission", f"{role.value}:{permission}"),
                    role_id=role_id,
                    permission=permission,
                )
            )


def _seed_users(session: Session, role_ids: dict[RoleName, uuid.UUID]) -> dict[str, uuid.UUID]:
    user_ids: dict[str, uuid.UUID] = {}
    for user in USERS:
        user_id = demo_uuid("user", user["external_id"])
        user_ids[user["display_name"]] = user_id
        session.merge(
            User(
                id=user_id,
                external_id=user["external_id"],
                supabase_auth_user_id=demo_uuid("supabase-user", user["external_id"]),
                email=user["email"],
                display_name=user["display_name"],
                department=user["department"],
                role_id=role_ids[user["role"]],
                permissions=user["permissions"],
                is_active=True,
                last_login_at=dt("2026-08-14T03:00:00Z") if user["external_id"] == "usr-001" else None,
            )
        )
    session.merge(
        UserSession(
            id=demo_uuid("session", "sess-8849"),
            user_id=user_ids["Zian"],
            token_jti="sess-8849",
            token_hash=hashlib.sha256(b"demo-session-placeholder").hexdigest(),
            issued_at=dt("2026-08-14T03:00:00Z"),
            expires_at=dt("2026-08-14T03:00:00Z") + timedelta(hours=1),
            ip_address="10.0.1.42",
            user_agent="NEXUS demo session",
        )
    )
    return user_ids


def _seed_inventory(session: Session) -> dict[str, uuid.UUID]:
    ids: dict[str, uuid.UUID] = {}
    for item in INVENTORY:
        item_id = demo_uuid("inventory", item["external_id"])
        ids[item["name"]] = item_id
        last_updated = dt(item["last_updated"])
        session.merge(
            InventoryItem(
                id=item_id,
                external_id=item["external_id"],
                sku=item["sku"],
                name=item["name"],
                category=item["category"],
                zone=item["zone"],
                quantity_on_hand=item["quantity_on_hand"],
                quantity_reserved=item["quantity_reserved"],
                reorder_threshold=item["reorder_threshold"],
                max_capacity=item["max_capacity"],
                unit=item["unit"],
                status=item["status"],
                supplier=item["supplier"],
                unit_cost=Decimal(item["unit_cost"]),
                created_at=last_updated,
                updated_at=last_updated,
            )
        )
    return ids


def _seed_requests(session: Session, user_ids: dict[str, uuid.UUID], inventory_ids: dict[str, uuid.UUID]) -> dict[str, uuid.UUID]:
    ids: dict[str, uuid.UUID] = {}
    inventory_by_id = {item["external_id"]: item for item in INVENTORY}
    inventory_by_name = {item["name"]: item for item in INVENTORY}
    for req in REQUESTS:
        req_id = demo_uuid("request", req["external_id"])
        ids[req["request_number"]] = req_id
        item = inventory_by_name.get(req["inventory_item"]) if req["inventory_item"] else None
        total_value = Decimal(item["unit_cost"]) * req["quantity"] if item and req["quantity"] else None
        session.merge(
            OperationalRequest(
                id=req_id,
                external_id=req["external_id"],
                request_number=req["request_number"],
                title=req["title"],
                description=req["description"],
                type=req["type"],
                priority=req["priority"],
                status=req["status"],
                requester_user_id=user_ids.get(req["requester"]),
                requester_name=req["requester"],
                requester_department=req["requester_department"],
                inventory_item_id=inventory_ids.get(req["inventory_item"]),
                quantity=req["quantity"],
                total_value=total_value,
                ai_decision=req["ai_decision"],
                ai_confidence=req["ai_confidence"],
                ai_reasoning=req["ai_reasoning"],
                decision_metadata={"seed_source": "deterministic_nexus_seed"},
                created_at=dt(req["created_at"]),
                updated_at=dt(req["updated_at"]),
            )
        )
    return ids


def _seed_approvals(session: Session, user_ids: dict[str, uuid.UUID], request_ids: dict[str, uuid.UUID]) -> dict[str, uuid.UUID]:
    ids: dict[str, uuid.UUID] = {}
    for approval in APPROVALS:
        approval_id = demo_uuid("approval", approval["external_id"])
        ids[approval["request_number"]] = approval_id
        session.merge(
            Approval(
                id=approval_id,
                external_id=approval["external_id"],
                request_id=request_ids[approval["request_number"]],
                approver_user_id=user_ids.get("Zian"),
                status=approval["status"],
                quantity_requested=approval["quantity_requested"],
                quantity_approved=approval["quantity_approved"],
                unit=approval["unit"],
                ai_recommendation=approval["ai_recommendation"],
                available_stock=approval["available_stock"],
                procure_quantity=approval["procure_quantity"],
                safety_stock=approval["safety_stock"],
                ai_confidence=approval["ai_confidence"],
                waiting_time=approval["waiting_time"],
                created_at=dt(approval["created_at"]),
                updated_at=dt(approval["created_at"]),
            )
        )
    return ids


def _seed_fulfillment(
    session: Session,
    user_ids: dict[str, uuid.UUID],
    request_ids: dict[str, uuid.UUID],
    approval_ids: dict[str, uuid.UUID],
) -> None:
    for order in FULFILLMENT:
        session.merge(
            FulfillmentOrder(
                id=demo_uuid("fulfillment", order["external_id"]),
                external_id=order["external_id"],
                request_id=request_ids.get(order["request_number"]),
                approval_id=approval_ids.get(order["request_number"]),
                requested_by_user_id=user_ids.get(order["requested_by"]),
                approved_by_user_id=user_ids.get(order["approved_by"]),
                request_number=order["request_number"],
                title=order["title"],
                requested_by_name=order["requested_by"],
                approved_by_name=order["approved_by"],
                approved_quantity=order["approved_quantity"],
                available_stock=order["available_stock"],
                safety_stock_min=order["safety_stock_min"],
                safety_stock_max=order["safety_stock_max"],
                unit=order["unit"],
                status=order["status"],
                priority=order["priority"],
                carrier=order.get("carrier"),
                tracking_number=order.get("tracking_number"),
                eta=dt(order.get("eta")),
                approved_at=dt(order["approved_at"]),
                fulfilled_at=dt(order.get("fulfilled_at")),
                created_at=dt(order["approved_at"]),
                updated_at=dt(order.get("fulfilled_at") or order["approved_at"]),
            )
        )


def _seed_decision_rules(session: Session, user_ids: dict[str, uuid.UUID]) -> dict[str, uuid.UUID]:
    ids: dict[str, uuid.UUID] = {}
    for rule in DECISION_RULES:
        rule_id = demo_uuid("decision_rule", rule["external_id"])
        ids[rule["external_id"]] = rule_id
        session.merge(
            DecisionRule(
                id=rule_id,
                external_id=rule["external_id"],
                name=rule["name"],
                description=rule["description"],
                category=rule["category"],
                status=rule["status"],
                priority=rule["priority"],
                conditions=rule["conditions"],
                actions=rule["actions"],
                trigger_count=rule["trigger_count"],
                last_triggered=dt(rule["last_triggered"]),
                created_by_user_id=user_ids.get(rule["created_by"]),
                created_by_name=rule["created_by"],
                created_at=dt(rule["created_at"]),
                updated_at=dt(rule["last_triggered"]),
            )
        )
    return ids


def _seed_decision_outcomes(session: Session, request_ids: dict[str, uuid.UUID], rule_ids: dict[str, uuid.UUID]) -> None:
    auto_rule = rule_ids["rule-001"]
    critical_rule = rule_ids["rule-002"]
    high_value_rule = rule_ids["rule-004"]
    for req in REQUESTS:
        applied_rule_id = None
        if req["type"] == RequestType.STANDARD and req["quantity"] and req["quantity"] <= 50 and req["ai_confidence"] >= 90:
            applied_rule_id = auto_rule
        elif req["priority"] == RequestPriority.CRITICAL and req["status"] == RequestStatus.PENDING:
            applied_rule_id = critical_rule
        elif req["inventory_item"] and req["title"].startswith("GPU"):
            applied_rule_id = high_value_rule
        session.merge(
            DecisionOutcome(
                id=demo_uuid("decision_outcome", req["external_id"]),
                request_id=request_ids[req["request_number"]],
                rule_id=applied_rule_id,
                decision=req["ai_decision"],
                confidence=req["ai_confidence"],
                reasoning=req["ai_reasoning"],
                outcome_metadata={"seed_source": "deterministic_nexus_seed", "requestNumber": req["request_number"]},
                created_at=dt(req["created_at"]),
                updated_at=dt(req["updated_at"]),
            )
        )


def _seed_ai_models(session: Session) -> None:
    for model in AI_MODELS:
        session.merge(
            AIModel(
                id=demo_uuid("ai_model", model["external_id"]),
                external_id=model["external_id"],
                name=model["name"],
                version=model["version"],
                type=model["type"],
                status=model["status"],
                accuracy=Decimal(model["accuracy"]) if model.get("accuracy") is not None else None,
                latency_ms=model["latency_ms"],
                requests_per_day=model["requests_per_day"],
                deployed_at=dt(model["deployed_at"]),
                description=model["description"],
                created_at=dt(model["deployed_at"]),
                updated_at=dt(model["deployed_at"]),
            )
        )


def _seed_engineering(session: Session) -> None:
    for request in ENGINEERING_REQUESTS:
        request_id = demo_uuid("engineering_request", request["external_id"])
        session.merge(
            EngineeringRequest(
                id=request_id,
                external_id=request["external_id"],
                title=request["title"],
                description=request["description"],
                current_stage=request["current_stage"],
                progress=request["progress"],
                status=request["status"],
                estimated_completion=dt(request["estimated_completion"]),
                created_at=dt(request["created_at"]),
                updated_at=dt(request["created_at"]),
            )
        )
        for metric in request["telemetry"]:
            session.merge(
                EngineeringTelemetryMetric(
                    id=demo_uuid("engineering_metric", f"{request['external_id']}:{metric['label']}"),
                    engineering_request_id=request_id,
                    label=metric["label"],
                    value=metric["value"],
                    unit=metric.get("unit"),
                    status=metric["status"],
                    created_at=dt(request["created_at"]),
                    updated_at=dt(request["created_at"]),
                )
            )


def _seed_policies(session: Session, user_ids: dict[str, uuid.UUID]) -> None:
    for policy in POLICIES:
        policy_id = demo_uuid("policy", policy["external_id"])
        session.merge(
            Policy(
                id=policy_id,
                external_id=policy["external_id"],
                title=policy["title"],
                description=policy["description"],
                version=policy["version"],
                status=policy["status"],
                category=policy["category"],
                created_by_user_id=user_ids.get(policy["created_by"]),
                updated_by_user_id=user_ids.get(policy["updated_by"]),
                created_by_name=policy["created_by"],
                updated_by_name=policy["updated_by"],
                effective_date=dt(policy.get("effective_date")),
                expiry_date=dt(policy.get("expiry_date")),
                created_at=dt(policy["created_at"]),
                updated_at=dt(policy["updated_at"]),
            )
        )
        for rule in policy["rules"]:
            session.merge(
                PolicyRule(
                    id=demo_uuid("policy_rule", rule["external_id"]),
                    external_id=rule["external_id"],
                    policy_id=policy_id,
                    description=rule["description"],
                    is_active=rule["is_active"],
                    scope=rule["scope"],
                    created_at=dt(policy["created_at"]),
                    updated_at=dt(policy["updated_at"]),
                )
            )


def _seed_audit(session: Session, user_ids: dict[str, uuid.UUID]) -> None:
    for event in AUDIT_EVENTS:
        session.merge(
            AuditEvent(
                id=demo_uuid("audit", event["external_id"]),
                external_id=event["external_id"],
                event_code=event["event_code"],
                type=event["type"],
                action=event["action"],
                actor_user_id=user_ids.get(event["actor"]),
                actor_name=event["actor"],
                actor_role=event["actor_role"],
                resource_type=event["resource_type"],
                resource_id=event["resource_id"],
                description=event["description"],
                event_metadata=event["metadata"],
                ip_address=event["ip_address"],
                timestamp=dt(event["timestamp"]),
                severity=event["severity"],
                created_at=dt(event["timestamp"]),
                updated_at=dt(event["timestamp"]),
            )
        )


def _seed_reports(session: Session, user_ids: dict[str, uuid.UUID]) -> None:
    from app.services.report_service import build_report_file, build_report_text

    for report in REPORTS:
        generated_at = dt(report.get("generated_at"))
        report_row = Report(
            id=demo_uuid("report", report["external_id"]),
            external_id=report["external_id"],
            title=report["title"],
            description=report["description"],
            category=report["category"],
            status=report["status"],
            format=report["format"],
            generated_by_user_id=user_ids.get(report["generated_by"]),
            generated_by_name=report["generated_by"],
            generated_at=generated_at,
            file_size=None,
            pages=None,
            date_from=d(report["date_from"]),
            date_to=d(report["date_to"]),
            created_at=generated_at or datetime(2026, 8, 14, tzinfo=timezone.utc),
            updated_at=generated_at or datetime(2026, 8, 14, tzinfo=timezone.utc),
        )
        session.merge(report_row)
        session.flush()
        persisted = session.get(Report, report_row.id)
        if persisted and persisted.status == ReportStatus.GENERATED:
            content, _, _ = build_report_file(session, persisted)
            persisted.file_size = file_size_label(len(content))
            persisted.pages = (
                max(1, math.ceil(len(build_report_text(session, persisted).splitlines()) / 45))
                if persisted.format == ReportFormat.PDF
                else None
            )


def _seed_copilot(session: Session, user_ids: dict[str, uuid.UUID]) -> None:
    conversation_id = demo_uuid("copilot_conversation", "conv-001")
    session.merge(
        CopilotConversation(
            id=conversation_id,
            external_id="conv-001",
            user_id=user_ids["Zian"],
            title="Critical Requests Status",
            context_snapshot={
                "inventory": ["Compute Nodes (Type-Z)", "Thermal Paste (TPX-7)", "UPS Power Units (2KVA)"],
                "requests": ["REQ-2094-A", "REQ-2088-D", "REQ-2090-A", "REQ-2092-B"],
            },
            created_at=dt("2026-08-14T10:32:00Z"),
            updated_at=dt("2026-08-14T10:33:00Z"),
        )
    )
    for index, message in enumerate(COPILOT_MESSAGES):
        ts = dt("2026-08-14T10:32:00Z") + timedelta(minutes=index)
        session.merge(
            CopilotMessage(
                id=demo_uuid("copilot_message", message["external_id"]),
                external_id=message["external_id"],
                conversation_id=conversation_id,
                role=message["role"],
                content=message["content"],
                is_streaming=False,
                created_at=ts,
                updated_at=ts,
            )
        )


def _seed_settings(session: Session, user_ids: dict[str, uuid.UUID]) -> None:
    session.merge(
        UserSetting(
            id=demo_uuid("user_setting", "usr-001:notifications"),
            user_id=user_ids["Zian"],
            key="notifications",
            value={"email": True, "desktop": True, "criticalOnly": False},
        )
    )
    session.merge(
        UserSetting(
            id=demo_uuid("user_setting", "usr-001:security"),
            user_id=user_ids["Zian"],
            key="security",
            value={"mfaEnabled": True, "sessionTimeoutMinutes": 60},
        )
    )
    session.merge(
        SystemSetting(
            id=demo_uuid("system_setting", "cors"),
            key="cors",
            value={"allowedOrigins": ["http://localhost:3000"]},
            description="Development frontend origin.",
        )
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed NEXUS demo data into Supabase PostgreSQL.")
    parser.add_argument("--dry-run", action="store_true", help="Validate seed dataset without connecting to the database.")
    args = parser.parse_args()

    counts = dataset_counts()
    if args.dry_run:
        print({"status": "dry_run_ok", "counts": counts})
        return 0

    try:
        session_factory = get_sessionmaker()
        with session_factory() as session:
            seed(session)
        print({"status": "seeded", "counts": counts})
        return 0
    except SQLAlchemyError as exc:
        print({"status": "failed", "error_type": type(exc).__name__, "message": _redact_error(str(exc))})
        return 1


def _redact_error(message: str) -> str:
    message = re.sub(r"postgres(?:ql)?(?:\+psycopg)?://\S+", "[REDACTED_DB_URL]", message)
    message = re.sub(r"password=[^\s]+", "password=[REDACTED]", message, flags=re.I)
    message = re.sub(r"db\.[A-Za-z0-9-]+\.supabase\.co", "[REDACTED_DB_HOST]", message)
    message = message.replace("[YOUR-PASSWORD]", "[REDACTED_PLACEHOLDER]")
    return message


if __name__ == "__main__":
    raise SystemExit(main())
