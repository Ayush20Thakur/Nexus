"""initial NEXUS PostgreSQL schema

Revision ID: 20260814_0001
Revises:
Create Date: 2026-08-14 00:00:00
"""
from __future__ import annotations

from alembic import op

from app.models import Base

revision = "20260814_0001"
down_revision = None
branch_labels = None
depends_on = None

RLS_TABLES = [
    "users",
    "user_settings",
    "inventory_items",
    "operational_requests",
    "approvals",
    "fulfillment_orders",
    "decision_rules",
    "decision_outcomes",
    "policies",
    "policy_rules",
    "audit_events",
    "copilot_conversations",
    "copilot_messages",
    "reports",
]


def upgrade() -> None:
    bind = op.get_bind()
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    Base.metadata.create_all(bind=bind)
    _enable_rls()
    _create_supabase_self_access_policies()


def downgrade() -> None:
    bind = op.get_bind()
    _drop_supabase_self_access_policies()
    Base.metadata.drop_all(bind=bind)


def _enable_rls() -> None:
    for table in RLS_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")


def _create_supabase_self_access_policies() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'auth' AND p.proname = 'uid'
            ) THEN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_select_self'
                ) THEN
                    EXECUTE 'CREATE POLICY users_select_self ON users
                        FOR SELECT TO authenticated
                        USING (supabase_auth_user_id = auth.uid())';
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'user_settings_owner_all'
                ) THEN
                    EXECUTE 'CREATE POLICY user_settings_owner_all ON user_settings
                        FOR ALL TO authenticated
                        USING (user_id IN (SELECT id FROM users WHERE supabase_auth_user_id = auth.uid()))
                        WITH CHECK (user_id IN (SELECT id FROM users WHERE supabase_auth_user_id = auth.uid()))';
                END IF;
            END IF;
        END $$;
        """
    )


def _drop_supabase_self_access_policies() -> None:
    op.execute("DROP POLICY IF EXISTS users_select_self ON users")
    op.execute("DROP POLICY IF EXISTS user_settings_owner_all ON user_settings")
