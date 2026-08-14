from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Any

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "NEXUS Backend"
    environment: str = "development"
    api_prefix: str = "/api"
    frontend_url: str = "http://localhost:3000"
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["http://localhost:3000"])

    supabase_url: str | None = None
    supabase_anon_key: SecretStr | None = None
    supabase_service_role_key: SecretStr | None = None
    supabase_db_url: SecretStr | None = None
    database_url: SecretStr | None = None

    supabase_jwks_url: str | None = None
    supabase_jwt_secret: SecretStr | None = None
    jwt_audience: str | None = "authenticated"
    jwt_algorithms: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["RS256", "ES256", "HS256"])

    log_level: str = "INFO"
    db_pool_size: int = 5
    db_max_overflow: int = 10
    allow_dev_auth_fallback: bool = False

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if value is None or value == "":
            return ["http://localhost:3000"]
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("jwt_algorithms", mode="before")
    @classmethod
    def parse_jwt_algorithms(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            return [algorithm.strip() for algorithm in value.split(",") if algorithm.strip()]
        return value

    @property
    def is_development(self) -> bool:
        return self.environment.lower() in {"development", "dev", "local", "test"}

    @property
    def resolved_database_url(self) -> str | None:
        raw = self._secret_value(self.database_url) or self._secret_value(self.supabase_db_url)
        if not raw:
            return None
        if raw.startswith("postgres://"):
            raw = "postgresql://" + raw.removeprefix("postgres://")
        if raw.startswith("postgresql://"):
            raw = "postgresql+psycopg://" + raw.removeprefix("postgresql://")
        if not raw.startswith("postgresql+psycopg://"):
            raise ValueError("DATABASE_URL/SUPABASE_DB_URL must be a PostgreSQL URL using psycopg")
        return raw

    @property
    def database_configured(self) -> bool:
        return self.resolved_database_url is not None

    @property
    def supabase_issuer(self) -> str | None:
        if not self.supabase_url:
            return None
        return self.supabase_url.rstrip("/") + "/auth/v1"

    @property
    def resolved_jwks_url(self) -> str | None:
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        if self.supabase_url:
            return self.supabase_url.rstrip("/") + "/auth/v1/.well-known/jwks.json"
        return None

    @staticmethod
    def _secret_value(value: SecretStr | None) -> str | None:
        if value is None:
            return None
        secret = value.get_secret_value().strip()
        return secret or None


@lru_cache
def get_settings() -> Settings:
    return Settings()
