from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.routes import (
    ai_engineering,
    analytics,
    approvals,
    audit,
    auth,
    copilot,
    decision_engine,
    fulfillment,
    health,
    inventory,
    policies,
    reports,
    requests,
    settings,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router, dependencies=[Depends(get_current_user)])
api_router.include_router(analytics.router, dependencies=[Depends(get_current_user)])
api_router.include_router(inventory.router, dependencies=[Depends(get_current_user)])
api_router.include_router(requests.router, dependencies=[Depends(get_current_user)])
api_router.include_router(approvals.router, dependencies=[Depends(get_current_user)])
api_router.include_router(fulfillment.router, dependencies=[Depends(get_current_user)])
api_router.include_router(decision_engine.router, dependencies=[Depends(get_current_user)])
api_router.include_router(policies.router, dependencies=[Depends(get_current_user)])
api_router.include_router(reports.router, dependencies=[Depends(get_current_user)])
api_router.include_router(audit.router, dependencies=[Depends(get_current_user)])
api_router.include_router(copilot.router, dependencies=[Depends(get_current_user)])
api_router.include_router(settings.router, dependencies=[Depends(get_current_user)])
api_router.include_router(ai_engineering.router, dependencies=[Depends(get_current_user)])
