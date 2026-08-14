from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Index, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AIDecision, ApprovalStatus, FulfillmentStatus, RequestPriority, RequestStatus, RequestType, enum_values


class OperationalRequest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "operational_requests"
    __table_args__ = (
        CheckConstraint("quantity IS NULL OR quantity > 0", name="ck_requests_quantity_positive"),
        CheckConstraint("ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 100)", name="ck_requests_ai_confidence_range"),
        Index("ix_requests_status", "status"),
        Index("ix_requests_priority", "priority"),
        Index("ix_requests_requester_user_id", "requester_user_id"),
        Index("ix_requests_inventory_item_id", "inventory_item_id"),
    )

    external_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    request_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[RequestType] = mapped_column(Enum(RequestType, name="request_type", values_callable=enum_values), nullable=False)
    priority: Mapped[RequestPriority] = mapped_column(Enum(RequestPriority, name="request_priority", values_callable=enum_values), nullable=False)
    status: Mapped[RequestStatus] = mapped_column(Enum(RequestStatus, name="request_status", values_callable=enum_values), nullable=False)
    requester_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    requester_name: Mapped[str] = mapped_column(String(120), nullable=False)
    requester_department: Mapped[str] = mapped_column(String(120), nullable=False)
    assignee_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    inventory_item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("inventory_items.id"))
    quantity: Mapped[int | None] = mapped_column(Integer)
    total_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    ai_decision: Mapped[AIDecision | None] = mapped_column(Enum(AIDecision, name="ai_decision", values_callable=enum_values))
    ai_confidence: Mapped[int | None] = mapped_column(Integer)
    ai_reasoning: Mapped[str | None] = mapped_column(Text)
    decision_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    clarify_message: Mapped[str | None] = mapped_column(Text)

    requester: Mapped["User | None"] = relationship(foreign_keys=[requester_user_id])
    assignee: Mapped["User | None"] = relationship(foreign_keys=[assignee_user_id])
    inventory_item: Mapped["InventoryItem | None"] = relationship(back_populates="requests")
    approvals: Mapped[list["Approval"]] = relationship(back_populates="request", cascade="all, delete-orphan")
    fulfillment_orders: Mapped[list["FulfillmentOrder"]] = relationship(back_populates="request")
    decision_outcomes: Mapped[list["DecisionOutcome"]] = relationship(back_populates="request", cascade="all, delete-orphan")


class Approval(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "approvals"
    __table_args__ = (
        CheckConstraint("quantity_requested > 0", name="ck_approvals_quantity_requested_positive"),
        CheckConstraint("quantity_approved IS NULL OR quantity_approved >= 0", name="ck_approvals_quantity_approved_nonnegative"),
        Index("ix_approvals_status", "status"),
        Index("ix_approvals_request_id", "request_id"),
        Index("ix_approvals_approver_user_id", "approver_user_id"),
    )

    external_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("operational_requests.id", ondelete="CASCADE"), nullable=False)
    approver_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    status: Mapped[ApprovalStatus] = mapped_column(Enum(ApprovalStatus, name="approval_status", values_callable=enum_values), nullable=False)
    quantity_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_approved: Mapped[int | None] = mapped_column(Integer)
    unit: Mapped[str] = mapped_column(String(40), nullable=False)
    ai_recommendation: Mapped[str | None] = mapped_column(Text)
    available_stock: Mapped[int | None] = mapped_column(Integer)
    procure_quantity: Mapped[int | None] = mapped_column(Integer)
    safety_stock: Mapped[int | None] = mapped_column(Integer)
    ai_confidence: Mapped[int | None] = mapped_column(Integer)
    waiting_time: Mapped[str | None] = mapped_column(String(80))
    decision_note: Mapped[str | None] = mapped_column(Text)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    request: Mapped[OperationalRequest] = relationship(back_populates="approvals")
    approver: Mapped["User | None"] = relationship()
    fulfillment_orders: Mapped[list["FulfillmentOrder"]] = relationship(back_populates="approval")


class FulfillmentOrder(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "fulfillment_orders"
    __table_args__ = (
        CheckConstraint("approved_quantity > 0", name="ck_fulfillment_approved_quantity_positive"),
        Index("ix_fulfillment_status", "status"),
        Index("ix_fulfillment_request_id", "request_id"),
        Index("ix_fulfillment_priority", "priority"),
    )

    external_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    request_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("operational_requests.id"))
    approval_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("approvals.id"))
    requested_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    request_number: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    requested_by_name: Mapped[str] = mapped_column(String(120), nullable=False)
    approved_by_name: Mapped[str] = mapped_column(String(120), nullable=False)
    approved_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    available_stock: Mapped[int] = mapped_column(Integer, nullable=False)
    safety_stock_min: Mapped[int] = mapped_column(Integer, nullable=False)
    safety_stock_max: Mapped[int] = mapped_column(Integer, nullable=False)
    unit: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[FulfillmentStatus] = mapped_column(Enum(FulfillmentStatus, name="fulfillment_status", values_callable=enum_values), nullable=False)
    priority: Mapped[RequestPriority] = mapped_column(Enum(RequestPriority, name="request_priority", values_callable=enum_values), nullable=False)
    carrier: Mapped[str | None] = mapped_column(String(120))
    tracking_number: Mapped[str | None] = mapped_column(String(120))
    eta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fulfilled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    request: Mapped[OperationalRequest | None] = relationship(back_populates="fulfillment_orders")
    approval: Mapped[Approval | None] = relationship(back_populates="fulfillment_orders")
    requested_by: Mapped["User | None"] = relationship(foreign_keys=[requested_by_user_id])
    approved_by: Mapped["User | None"] = relationship(foreign_keys=[approved_by_user_id])
