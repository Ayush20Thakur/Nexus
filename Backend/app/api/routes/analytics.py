from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.audit import AuditEvent
from app.services.analytics_service import dashboard_summary, insights_summary
from app.services.approval_service import list_approvals
from app.services.decision_service import list_decision_rules
from app.services.fulfillment_service import list_fulfillment_orders
from app.services.inventory_service import list_inventory
from app.services.policy_service import list_policies
from app.services.report_service import list_reports
from app.services.request_service import list_requests
from app.services.serializers import activity_from_audit, audit_to_frontend

router = APIRouter(tags=["analytics"])


@router.get("/dashboard/summary")
def dashboard(db: Session = Depends(get_db)) -> dict[str, Any]:
    return dashboard_summary(db)


@router.get("/insights/summary")
def insights(db: Session = Depends(get_db)) -> dict[str, Any]:
    return insights_summary(db)


@router.get("/bootstrap")
def bootstrap(db: Session = Depends(get_db)) -> dict[str, Any]:
    recent_events = db.scalars(select(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(12)).all()
    return {
        "inventory": list_inventory(db),
        "requests": list_requests(db),
        "approvals": list_approvals(db),
        "fulfillment": list_fulfillment_orders(db),
        "auditEvents": [audit_to_frontend(event) for event in recent_events],
        "activityFeed": [activity_from_audit(event) for event in recent_events],
        "policies": list_policies(db),
        "decisionRules": list_decision_rules(db),
        "reports": list_reports(db),
        "dashboard": dashboard_summary(db),
        "insights": insights_summary(db),
    }
