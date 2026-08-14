from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings
from app.database.health import check_database_health
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    settings = get_settings()
    database = check_database_health()
    return HealthResponse(
        status="ok" if database["status"] == "ok" else "degraded",
        service=settings.app_name,
        environment=settings.environment,
        database=database,
    )
