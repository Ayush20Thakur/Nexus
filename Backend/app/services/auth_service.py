from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.user import User
from app.security.jwt import SupabaseClaims, validate_supabase_jwt
from app.services import user_service


class AuthenticationError(Exception):
    pass


class AuthService:
    def validate_token(self, token: str) -> SupabaseClaims:
        return validate_supabase_jwt(token)

    def resolve_user(self, db: Session, claims: SupabaseClaims) -> User:
        user = None
        if claims.subject_uuid:
            user = user_service.get_user_by_supabase_subject(db, claims.subject_uuid)
        if user is None and claims.email:
            user = user_service.get_user_by_email(db, claims.email)
        if user is None:
            raise AuthenticationError("Authenticated Supabase user is not registered in NEXUS.")
        if not user.is_active:
            raise AuthenticationError("NEXUS user account is inactive.")
        return user

    def authenticate(self, db: Session, token: str) -> User:
        claims = self.validate_token(token)
        return self.resolve_user(db, claims)
