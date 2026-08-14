from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, ForeignKey, Index, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    AIDecision,
    CopilotMessageRole,
    EngineeringStatus,
    ModelStatus,
    ModelType,
    PipelineStage,
    PolicyStatus,
    RuleCategory,
    RuleStatus,
    enum_values,
)


class AIModel(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "ai_models"
    __table_args__ = (
        Index("ix_ai_models_status", "status"),
        Index("ix_ai_models_type", "type"),
    )

    external_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    version: Mapped[str] = mapped_column(String(60), nullable=False)
    type: Mapped[ModelType] = mapped_column(Enum(ModelType, name="model_type", values_callable=enum_values), nullable=False)
    status: Mapped[ModelStatus] = mapped_column(Enum(ModelStatus, name="model_status", values_callable=enum_values), nullable=False)
    accuracy: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    requests_per_day: Mapped[int | None] = mapped_column(Integer)
    deployed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    description: Mapped[str] = mapped_column(Text, nullable=False)


class EngineeringRequest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "engineering_requests"
    __table_args__ = (
        CheckConstraint("progress >= 0 AND progress <= 100", name="ck_engineering_progress_range"),
        Index("ix_engineering_requests_status", "status"),
        Index("ix_engineering_requests_current_stage", "current_stage"),
    )

    external_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    current_stage: Mapped[PipelineStage] = mapped_column(Enum(PipelineStage, name="pipeline_stage", values_callable=enum_values), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[EngineeringStatus] = mapped_column(Enum(EngineeringStatus, name="engineering_status", values_callable=enum_values), nullable=False)
    estimated_completion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    telemetry: Mapped[list["EngineeringTelemetryMetric"]] = relationship(back_populates="engineering_request", cascade="all, delete-orphan")


class EngineeringTelemetryMetric(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "engineering_telemetry_metrics"
    __table_args__ = (Index("ix_engineering_telemetry_request_id", "engineering_request_id"),)

    engineering_request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("engineering_requests.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    value: Mapped[str] = mapped_column(String(80), nullable=False)
    unit: Mapped[str | None] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(40), nullable=False)

    engineering_request: Mapped[EngineeringRequest] = relationship(back_populates="telemetry")


class DecisionRule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "decision_rules"
    __table_args__ = (
        Index("ix_decision_rules_status", "status"),
        Index("ix_decision_rules_category", "category"),
        Index("ix_decision_rules_priority", "priority"),
    )

    external_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(180), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[RuleCategory] = mapped_column(Enum(RuleCategory, name="rule_category", values_callable=enum_values), nullable=False)
    status: Mapped[RuleStatus] = mapped_column(Enum(RuleStatus, name="rule_status", values_callable=enum_values), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False)
    conditions: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    actions: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    trigger_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    last_triggered: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_by_name: Mapped[str] = mapped_column(String(120), nullable=False)

    created_by: Mapped["User | None"] = relationship()
    decision_outcomes: Mapped[list["DecisionOutcome"]] = relationship(back_populates="rule")


class DecisionOutcome(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "decision_outcomes"
    __table_args__ = (
        CheckConstraint("confidence IS NULL OR (confidence >= 0 AND confidence <= 100)", name="ck_decision_outcomes_confidence_range"),
        Index("ix_decision_outcomes_request_id", "request_id"),
        Index("ix_decision_outcomes_rule_id", "rule_id"),
    )

    request_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("operational_requests.id", ondelete="CASCADE"))
    rule_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("decision_rules.id"))
    decision: Mapped[AIDecision] = mapped_column(Enum(AIDecision, name="ai_decision", values_callable=enum_values), nullable=False)
    confidence: Mapped[int | None] = mapped_column(Integer)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    outcome_metadata: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    request: Mapped["OperationalRequest | None"] = relationship(back_populates="decision_outcomes")
    rule: Mapped[DecisionRule | None] = relationship(back_populates="decision_outcomes")


class Policy(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "policies"
    __table_args__ = (
        Index("ix_policies_status", "status"),
        Index("ix_policies_category", "category"),
    )

    external_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[PolicyStatus] = mapped_column(Enum(PolicyStatus, name="policy_status", values_callable=enum_values), nullable=False)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_by_name: Mapped[str] = mapped_column(String(120), nullable=False)
    updated_by_name: Mapped[str] = mapped_column(String(120), nullable=False)
    effective_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    rules: Mapped[list["PolicyRule"]] = relationship(back_populates="policy", cascade="all, delete-orphan")
    created_by: Mapped["User | None"] = relationship(foreign_keys=[created_by_user_id])
    updated_by: Mapped["User | None"] = relationship(foreign_keys=[updated_by_user_id])


class PolicyRule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "policy_rules"
    __table_args__ = (Index("ix_policy_rules_policy_id", "policy_id"),)

    external_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policies.id", ondelete="CASCADE"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    scope: Mapped[str] = mapped_column(String(160), nullable=False)

    policy: Mapped[Policy] = relationship(back_populates="rules")


class CopilotConversation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "copilot_conversations"
    __table_args__ = (
        Index("ix_copilot_conversations_user_id", "user_id"),
        Index("ix_copilot_conversations_updated_at", "updated_at"),
    )

    external_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    context_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    user: Mapped["User | None"] = relationship()
    messages: Mapped[list["CopilotMessage"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class CopilotMessage(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "copilot_messages"
    __table_args__ = (Index("ix_copilot_messages_conversation_id", "conversation_id"),)

    external_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("copilot_conversations.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[CopilotMessageRole] = mapped_column(Enum(CopilotMessageRole, name="copilot_message_role", values_callable=enum_values), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_streaming: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))

    conversation: Mapped[CopilotConversation] = relationship(back_populates="messages")
