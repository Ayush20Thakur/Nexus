from __future__ import annotations

import time
from typing import Any

from sqlalchemy import text

from app.core.config import get_settings
from app.database.session import get_engine


def check_database_health() -> dict[str, Any]:
    settings = get_settings()
    if not settings.database_configured:
        return {
            "configured": False,
            "status": "unconfigured",
            "latency_ms": None,
            "message": "DATABASE_URL or SUPABASE_DB_URL is not configured.",
        }

    started = time.perf_counter()
    try:
        with get_engine().connect() as connection:
            connection.execute(text("select 1"))
        return {
            "configured": True,
            "status": "ok",
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            "message": "Database connection succeeded.",
        }
    except Exception as exc:
        return {
            "configured": True,
            "status": "error",
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            "message": "Database connectivity check failed.",
            "error_type": type(exc).__name__,
        }
