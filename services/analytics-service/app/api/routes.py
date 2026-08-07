from typing import Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.aggregation import compute_dashboard, compute_global_statistics
from app.core.cache import AnalyticsCache, get_cache
from app.core.database import get_db
from app.core.export import export_csv, export_pdf
from app.models.metric_event import MetricEvent

router = APIRouter()

# Routes analytics-service - extraites du document de conception (section 5.2)


@router.get("/api/v1/analytics/dashboard")
def tableau_de_bord_d_un_etablissement(
    establishment_id: Optional[str] = Query(None, alias="establishmentId"),
    db: Session = Depends(get_db),
    cache: AnalyticsCache = Depends(get_cache),
):
    """Roles autorises : Directeur / Admin."""
    cache_key = f"sm:analytics:dashboard:{establishment_id or 'all'}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    dashboard = compute_dashboard(db, establishment_id)
    cache.set(cache_key, dashboard)
    return dashboard


@router.get("/api/v1/analytics/global")
def statistiques_multi_etablissement(
    db: Session = Depends(get_db),
    cache: AnalyticsCache = Depends(get_cache),
):
    """Roles autorises : Admin Systeme."""
    cache_key = "sm:analytics:global"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    stats = compute_global_statistics(db)
    cache.set(cache_key, stats)
    return stats


@router.get("/api/v1/analytics/export")
def exporter_un_rapport_pdf_csv(
    format: str = Query(..., pattern="^(csv|pdf)$"),
    topic: Optional[str] = None,
    establishment_id: Optional[str] = Query(None, alias="establishmentId"),
    db: Session = Depends(get_db),
):
    """Roles autorises : Admin."""
    stmt = select(MetricEvent)
    if topic:
        stmt = stmt.where(MetricEvent.topic == topic)
    if establishment_id:
        stmt = stmt.where(MetricEvent.establishment_id == establishment_id)
    stmt = stmt.order_by(MetricEvent.received_at.desc())
    events = db.execute(stmt).scalars().all()

    if format == "csv":
        content = export_csv(events)
        media_type = "text/csv"
        filename = "analytics-export.csv"
    else:
        content = export_pdf(events)
        media_type = "application/pdf"
        filename = "analytics-export.pdf"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
