from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.enums import AuditEventType, AuditSeverity, ModelStatus, ModelType
from app.models.intelligence import AIModel, EngineeringRequest
from app.models.user import User
from app.services.audit_service import record_audit_event
from app.services.serializers import engineering_request_to_frontend, model_to_frontend


def list_models(db: Session) -> list[dict[str, Any]]:
    models = db.scalars(select(AIModel).order_by(AIModel.deployed_at.desc().nullslast(), AIModel.created_at.desc())).all()
    return [model_to_frontend(model) for model in models]


def deploy_model(db: Session, payload: dict[str, Any], actor: User, ip_address: str | None = None) -> AIModel:
    model = AIModel(
        id=uuid.uuid4(),
        external_id=f"model-{uuid.uuid4().hex[:12]}",
        name=str(payload["name"]).strip(),
        version=str(payload.get("version", "1.0.0")).strip(),
        type=ModelType(payload.get("type", ModelType.PREDICTOR.value)),
        status=ModelStatus.ACTIVE,
        accuracy=None,
        latency_ms=None,
        requests_per_day=0,
        deployed_at=datetime.now(UTC),
        description=str(payload.get("description") or f"Autonomous {payload.get('type', 'PREDICTOR')} model for operational workflow automation."),
    )
    db.add(model)
    db.flush()
    record_audit_event(
        db,
        event_code="AI_MODEL_DEPLOYED",
        event_type=AuditEventType.AI,
        action="model.deployed",
        actor=actor,
        resource_type="AIModel",
        resource_id=model.external_id or str(model.id),
        description=f"Deployed AI model {model.name} v{model.version}.",
        severity=AuditSeverity.INFO,
        metadata={"type": model.type.value, "status": model.status.value},
        ip_address=ip_address,
    )
    return model


def list_engineering_requests(db: Session) -> list[dict[str, Any]]:
    requests = db.scalars(
        select(EngineeringRequest)
        .options(joinedload(EngineeringRequest.telemetry))
        .order_by(EngineeringRequest.created_at.desc())
    ).unique().all()
    return [engineering_request_to_frontend(request) for request in requests]
