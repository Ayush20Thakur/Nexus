from __future__ import annotations

from enum import Enum


def enum_values(enum_cls: type[Enum]) -> list[str]:
    return [member.value for member in enum_cls]


class RoleName(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    OPERATOR = "OPERATOR"
    VIEWER = "VIEWER"


class InventoryStatus(str, Enum):
    OPTIMAL = "OPTIMAL"
    LOW = "LOW"
    CRITICAL = "CRITICAL"
    OVERSTOCK = "OVERSTOCK"
    INACTIVE = "INACTIVE"


class RequestType(str, Enum):
    TRANSFER = "TRANSFER"
    PURCHASE = "PURCHASE"
    MAINTENANCE = "MAINTENANCE"
    EMERGENCY = "EMERGENCY"
    STANDARD = "STANDARD"


class RequestPriority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"


class RequestStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PARTIALLY_APPROVED = "PARTIALLY_APPROVED"
    REJECTED = "REJECTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    ESCALATED = "ESCALATED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


class AIDecision(str, Enum):
    APPROVE = "APPROVE"
    REVIEW = "REVIEW"
    REJECT = "REJECT"
    ESCALATE = "ESCALATE"


class ApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CLARIFYING = "CLARIFYING"
    PARTIALLY_APPROVED = "PARTIALLY_APPROVED"


class FulfillmentStatus(str, Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    ALLOCATED = "ALLOCATED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"


class RuleStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    DRAFT = "DRAFT"


class RuleCategory(str, Enum):
    INVENTORY = "INVENTORY"
    REQUEST = "REQUEST"
    FULFILLMENT = "FULFILLMENT"
    ALERT = "ALERT"
    ESCALATION = "ESCALATION"


class ModelStatus(str, Enum):
    ACTIVE = "ACTIVE"
    STAGING = "STAGING"
    TRAINING = "TRAINING"
    DEPRECATED = "DEPRECATED"
    ERROR = "ERROR"


class ModelType(str, Enum):
    LLM = "LLM"
    CLASSIFIER = "CLASSIFIER"
    PREDICTOR = "PREDICTOR"
    OPTIMIZER = "OPTIMIZER"


class PipelineStage(str, Enum):
    PLAN = "PLAN"
    CODE = "CODE"
    TEST = "TEST"
    VERIFY = "VERIFY"
    DEPLOY = "DEPLOY"


class EngineeringStatus(str, Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    QUEUED = "QUEUED"


class PolicyStatus(str, Enum):
    ACTIVE = "ACTIVE"
    DRAFT = "DRAFT"
    ARCHIVED = "ARCHIVED"
    UNDER_REVIEW = "UNDER_REVIEW"


class AuditEventType(str, Enum):
    AUTH = "AUTH"
    REQUEST = "REQUEST"
    APPROVAL = "APPROVAL"
    INVENTORY = "INVENTORY"
    FULFILLMENT = "FULFILLMENT"
    POLICY = "POLICY"
    SYSTEM = "SYSTEM"
    AI = "AI"
    USER = "USER"
    REPORT = "REPORT"


class AuditSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class ReportCategory(str, Enum):
    INVENTORY = "INVENTORY"
    REQUESTS = "REQUESTS"
    FULFILLMENT = "FULFILLMENT"
    COMPLIANCE = "COMPLIANCE"
    AI = "AI"
    EXECUTIVE = "EXECUTIVE"


class ReportStatus(str, Enum):
    QUEUED = "QUEUED"
    GENERATING = "GENERATING"
    GENERATED = "GENERATED"
    FAILED = "FAILED"


class ReportFormat(str, Enum):
    PDF = "PDF"
    CSV = "CSV"
    XLSX = "XLSX"


class CopilotMessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
