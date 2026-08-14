from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class DatabaseHealth(BaseModel):
    configured: bool
    status: Literal["ok", "unconfigured", "error"]
    latency_ms: float | None = None
    message: str | None = None
    error_type: str | None = None


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str
    environment: str
    database: DatabaseHealth
