from __future__ import annotations

from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

from app.models import Base


def test_required_tables_are_registered() -> None:
    required_tables = {
        "users",
        "roles",
        "sessions",
        "inventory_items",
        "operational_requests",
        "approvals",
        "fulfillment_orders",
        "ai_models",
        "decision_rules",
        "policies",
        "audit_events",
        "copilot_conversations",
        "reports",
    }
    assert required_tables.issubset(set(Base.metadata.tables))


def test_tables_compile_for_postgresql() -> None:
    dialect = postgresql.dialect()
    for table in Base.metadata.sorted_tables:
        ddl = str(CreateTable(table).compile(dialect=dialect))
        assert f"CREATE TABLE {table.name}" in ddl
