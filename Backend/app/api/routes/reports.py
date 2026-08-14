from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, Request, Response
from sqlalchemy.orm import Session

from app.api.deps import get_write_actor
from app.database.session import get_db
from app.models.user import User
from app.services.report_service import build_report_file, create_report, get_report, list_reports
from app.services.serializers import report_to_frontend

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
def reports_index(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return list_reports(db)


@router.post("")
def reports_create(
    payload: dict[str, Any] = Body(...),
    request: Request = None,
    actor: User = Depends(get_write_actor),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    report = create_report(db, payload, actor, ip_address=request.client.host if request and request.client else None)
    db.commit()
    return report_to_frontend(report)


@router.get("/{report_id}/download")
def reports_download(report_id: str, db: Session = Depends(get_db)) -> Response:
    report = get_report(db, report_id)
    content, media_type, extension = build_report_file(db, report)
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{report.title}.{extension}"'},
    )
