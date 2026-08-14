from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app


def test_health_degrades_without_database_configuration(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setenv("SUPABASE_DB_URL", "")

    client = TestClient(create_app())
    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "degraded"
    assert payload["database"]["configured"] is False
    assert payload["database"]["status"] == "unconfigured"


def test_protected_route_without_token_returns_401_before_database(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setenv("SUPABASE_DB_URL", "")

    client = TestClient(create_app())
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"
