from __future__ import annotations

from decimal import Decimal

from sqlalchemy import CheckConstraint, Enum, Index, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import InventoryStatus, enum_values


class InventoryItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "inventory_items"
    __table_args__ = (
        CheckConstraint("quantity_on_hand >= 0", name="ck_inventory_quantity_on_hand_nonnegative"),
        CheckConstraint("quantity_reserved >= 0", name="ck_inventory_quantity_reserved_nonnegative"),
        CheckConstraint("reorder_threshold >= 0", name="ck_inventory_reorder_threshold_nonnegative"),
        CheckConstraint("max_capacity >= 0", name="ck_inventory_max_capacity_nonnegative"),
        Index("ix_inventory_items_status", "status"),
        Index("ix_inventory_items_zone", "zone"),
        Index("ix_inventory_items_category", "category"),
    )

    external_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    sku: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    zone: Mapped[str] = mapped_column(String(80), nullable=False)
    quantity_on_hand: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_reserved: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reorder_threshold: Mapped[int] = mapped_column(Integer, nullable=False)
    max_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[InventoryStatus] = mapped_column(Enum(InventoryStatus, name="inventory_status", values_callable=enum_values), nullable=False)
    supplier: Mapped[str | None] = mapped_column(String(255))
    unit_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    requests: Mapped[list["OperationalRequest"]] = relationship(back_populates="inventory_item")
