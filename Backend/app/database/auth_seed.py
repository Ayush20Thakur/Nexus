from __future__ import annotations

import argparse
import os
import re
from typing import Iterable

from sqlalchemy import bindparam, text
from sqlalchemy.exc import SQLAlchemyError

from app.database.session import get_engine


DEMO_EMAILS = {"zian@nexus.corp", "authority@nexus.corp", "dr.vance@nexus.corp"}


def _redact_error(message: str) -> str:
    message = re.sub(r"postgres(?:ql)?(?:\+psycopg)?://\S+", "[REDACTED_DB_URL]", message)
    message = re.sub(r"password=[^\s]+", "password=[REDACTED]", message, flags=re.I)
    return message


def _target_users(emails: Iterable[str] | None) -> list[str]:
    return [email.lower().strip() for email in emails or DEMO_EMAILS if email.strip()]


def provision_auth_users(password: str, emails: Iterable[str] | None = None) -> dict[str, int]:
    targets = _target_users(emails)
    engine = get_engine()
    created_or_updated = 0
    skipped = 0
    with engine.begin() as conn:
        auth_schema = conn.execute(
            text("select exists(select 1 from information_schema.schemata where schema_name='auth')")
        ).scalar_one()
        pgcrypto = conn.execute(text("select exists(select 1 from pg_extension where extname='pgcrypto')")).scalar_one()
        if not auth_schema or not pgcrypto:
            raise RuntimeError("Supabase auth schema and pgcrypto extension are required.")

        users_query = text(
            """
            select id, supabase_auth_user_id, email, display_name
            from public.users
            where is_active is true and lower(email) in :emails
            """
        ).bindparams(bindparam("emails", expanding=True))
        users = conn.execute(
            users_query,
            {"emails": targets},
        ).mappings().all()

        for user in users:
            auth_user_id = user["supabase_auth_user_id"] or user["id"]
            existing_auth_id = conn.execute(
                text("select id from auth.users where lower(email) = lower(:email) and deleted_at is null limit 1"),
                {"email": user["email"]},
            ).scalar_one_or_none()
            if existing_auth_id is not None:
                auth_user_id = existing_auth_id

            conn.execute(
                text(
                    """
                    insert into auth.users (
                        instance_id,
                        id,
                        aud,
                        role,
                        email,
                        encrypted_password,
                        email_confirmed_at,
                        raw_app_meta_data,
                        raw_user_meta_data,
                        is_super_admin,
                        created_at,
                        updated_at,
                        confirmation_token,
                        recovery_token,
                        email_change,
                        email_change_token_new,
                        phone,
                        phone_change,
                        phone_change_token,
                        email_change_token_current,
                        email_change_confirm_status,
                        reauthentication_token,
                        is_sso_user,
                        is_anonymous
                    ) values (
                        '00000000-0000-0000-0000-000000000000',
                        cast(:auth_user_id as uuid),
                        'authenticated',
                        'authenticated',
                        :email,
                        crypt(:password, gen_salt('bf')),
                        now(),
                        '{"provider":"email","providers":["email"]}'::jsonb,
                        jsonb_build_object('display_name', cast(:display_name as text)),
                        null,
                        now(),
                        now(),
                        '',
                        '',
                        '',
                        '',
                        null,
                        '',
                        '',
                        '',
                        0,
                        '',
                        false,
                        false
                    )
                    on conflict (id) do update set
                        email = excluded.email,
                        aud = excluded.aud,
                        role = excluded.role,
                        encrypted_password = crypt(:password, gen_salt('bf')),
                        email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
                        raw_app_meta_data = excluded.raw_app_meta_data,
                        raw_user_meta_data = excluded.raw_user_meta_data,
                        updated_at = now(),
                        confirmation_token = coalesce(auth.users.confirmation_token, ''),
                        recovery_token = coalesce(auth.users.recovery_token, ''),
                        email_change = coalesce(auth.users.email_change, ''),
                        email_change_token_new = coalesce(auth.users.email_change_token_new, ''),
                        email_change_token_current = coalesce(auth.users.email_change_token_current, ''),
                        deleted_at = null,
                        is_super_admin = null,
                        is_sso_user = false,
                        is_anonymous = false
                    """
                ),
                {
                    "auth_user_id": str(auth_user_id),
                    "email": user["email"],
                    "display_name": user["display_name"],
                    "password": password,
                },
            )
            conn.execute(
                text(
                    """
                    insert into auth.identities (
                        provider_id,
                        user_id,
                        identity_data,
                        provider,
                        last_sign_in_at,
                        created_at,
                        updated_at
                    ) values (
                        cast(:provider_id as text),
                        cast(:auth_user_id as uuid),
                        jsonb_build_object(
                            'sub', cast(:provider_id as text),
                            'email', cast(:email as text),
                            'email_verified', true,
                            'phone_verified', false
                        ),
                        'email',
                        now(),
                        now(),
                        now()
                    )
                    on conflict (provider_id, provider) do update set
                        user_id = excluded.user_id,
                        identity_data = excluded.identity_data,
                        updated_at = now()
                    """
                ),
                {"provider_id": str(auth_user_id), "auth_user_id": str(auth_user_id), "email": user["email"]},
            )
            conn.execute(
                text(
                    """
                    update public.users
                    set supabase_auth_user_id = cast(:auth_user_id as uuid), updated_at = now()
                    where id = cast(:nexus_user_id as uuid)
                    """
                ),
                {"auth_user_id": str(auth_user_id), "nexus_user_id": str(user["id"])},
            )
            created_or_updated += 1

        skipped = len(targets) - created_or_updated
    return {"created_or_updated": created_or_updated, "skipped": skipped}


def main() -> int:
    parser = argparse.ArgumentParser(description="Provision local Supabase Auth demo logins for seeded NEXUS users.")
    parser.add_argument("--password", default=os.getenv("NEXUS_DEMO_PASSWORD"), help="Demo login password. Prefer NEXUS_DEMO_PASSWORD.")
    parser.add_argument("--email", action="append", help="Email to provision. May be repeated. Defaults to demo admin/manager users.")
    args = parser.parse_args()
    if not args.password:
        print({"status": "failed", "message": "Set NEXUS_DEMO_PASSWORD or pass --password. Secret value was not printed."})
        return 2
    try:
        result = provision_auth_users(args.password, args.email)
        print({"status": "provisioned", **result})
        return 0
    except (RuntimeError, SQLAlchemyError) as exc:
        print({"status": "failed", "error_type": type(exc).__name__, "message": _redact_error(str(exc))})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
