from __future__ import annotations

import pytest

from app.core.config import Settings


def test_database_url_must_be_postgresql() -> None:
    settings = Settings(database_url="sqlite:///nexus.db")
    with pytest.raises(ValueError, match="PostgreSQL"):
        _ = settings.resolved_database_url


def test_postgresql_url_is_normalized_for_psycopg() -> None:
    settings = Settings(database_url="postgresql://user:pass@example.com:5432/db")
    assert settings.resolved_database_url == "postgresql+psycopg://user:pass@example.com:5432/db"
