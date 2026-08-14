from __future__ import annotations

import time
import uuid

import jwt

from app.core.config import Settings
from app.security.jwt import validate_supabase_jwt


def test_hs256_supabase_jwt_validation() -> None:
    subject = str(uuid.uuid4())
    secret = "test-secret-with-at-least-thirty-two-bytes"
    token = jwt.encode(
        {
            "sub": subject,
            "email": "zian@nexus.corp",
            "role": "authenticated",
            "aud": "authenticated",
            "iat": int(time.time()),
            "exp": int(time.time()) + 3600,
        },
        secret,
        algorithm="HS256",
    )

    claims = validate_supabase_jwt(
        token,
        Settings(_env_file=None, supabase_jwt_secret=secret, jwt_audience="authenticated", jwt_algorithms=["HS256"]),
    )

    assert claims.sub == subject
    assert claims.email == "zian@nexus.corp"
    assert claims.subject_uuid == uuid.UUID(subject)
