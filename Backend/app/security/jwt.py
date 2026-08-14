from __future__ import annotations

import uuid
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import jwt
from jwt import InvalidTokenError, PyJWKClient

from app.core.config import Settings, get_settings


class JWTValidationError(Exception):
    pass


@dataclass(frozen=True)
class SupabaseClaims:
    sub: str
    email: str | None
    role: str | None
    audience: str | list[str] | None
    expires_at: int | None
    issued_at: int | None
    jwt_id: str | None
    raw: dict[str, Any]

    @property
    def subject_uuid(self) -> uuid.UUID | None:
        try:
            return uuid.UUID(self.sub)
        except (TypeError, ValueError):
            return None


@lru_cache
def _jwks_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url)


def validate_supabase_jwt(token: str, settings: Settings | None = None) -> SupabaseClaims:
    settings = settings or get_settings()
    try:
        payload = _decode_jwt(token, settings)
    except InvalidTokenError as exc:
        raise JWTValidationError(str(exc)) from exc
    except Exception as exc:
        raise JWTValidationError("Unable to validate Supabase JWT.") from exc

    subject = payload.get("sub")
    if not subject:
        raise JWTValidationError("Token is missing subject claim.")

    return SupabaseClaims(
        sub=subject,
        email=payload.get("email"),
        role=payload.get("role"),
        audience=payload.get("aud"),
        expires_at=payload.get("exp"),
        issued_at=payload.get("iat"),
        jwt_id=payload.get("jti"),
        raw=payload,
    )


def _decode_jwt(token: str, settings: Settings) -> dict[str, Any]:
    token_algorithm = jwt.get_unverified_header(token).get("alg")
    decode_kwargs: dict[str, Any] = {
        "options": {
            "verify_aud": bool(settings.jwt_audience),
            "verify_iss": bool(settings.supabase_issuer),
        }
    }
    if settings.jwt_audience:
        decode_kwargs["audience"] = settings.jwt_audience
    if settings.supabase_issuer:
        decode_kwargs["issuer"] = settings.supabase_issuer

    secret = Settings._secret_value(settings.supabase_jwt_secret)
    if token_algorithm == "HS256" and secret:
        return jwt.decode(token, key=secret, algorithms=["HS256"], **decode_kwargs)

    jwks_url = settings.resolved_jwks_url if settings.supabase_url or settings.supabase_jwks_url else None
    if jwks_url:
        key = _jwks_client(jwks_url).get_signing_key_from_jwt(token).key
        algorithms = [algorithm for algorithm in settings.jwt_algorithms if algorithm != "HS256"]
        if not algorithms:
            algorithms = ["RS256", "ES256"]
        return jwt.decode(token, key=key, algorithms=algorithms, **decode_kwargs)

    if not secret:
        raise JWTValidationError("SUPABASE_JWT_SECRET or SUPABASE_JWKS_URL/SUPABASE_URL is required for JWT validation.")
    return jwt.decode(token, key=secret, algorithms=["HS256"], **decode_kwargs)
