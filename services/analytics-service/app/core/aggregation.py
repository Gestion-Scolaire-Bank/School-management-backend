import json
from typing import Optional

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.metric_event import MetricEvent

TOPIC_PAYMENT_COMPLETED = "sm.payment.completed"
TOPIC_PRESENCE_RECORDED = "sm.presence.recorded"
TOPIC_REPORTCARD_GENERATED = "sm.reportcard.generated"
TOPIC_ESTABLISHMENT_CREATED = "sm.admin.establishment.created"


def _load_events(db: Session, topic: str, establishment_id: Optional[str] = None) -> pd.DataFrame:
    stmt = select(MetricEvent).where(MetricEvent.topic == topic)
    if establishment_id:
        stmt = stmt.where(MetricEvent.establishment_id == establishment_id)
    rows = db.execute(stmt).scalars().all()
    records = [json.loads(row.payload) for row in rows]
    return pd.DataFrame.from_records(records)


def _sum_column(df: pd.DataFrame, column: str) -> float:
    return float(df[column].sum()) if column in df.columns and not df.empty else 0.0


def _sum_revenue(df: pd.DataFrame) -> float:
    # payment-service publie le montant sous la cle "montant" (cf. README payment-service).
    return _sum_column(df, "montant") or _sum_column(df, "amount")


def _average_reportcard_grades(df: pd.DataFrame) -> Optional[float]:
    if df.empty or "moyennes" not in df.columns:
        return None
    values = [
        value
        for moyennes in df["moyennes"].dropna()
        for value in (moyennes.values() if isinstance(moyennes, dict) else [])
    ]
    return sum(values) / len(values) if values else None


def compute_dashboard(db: Session, establishment_id: Optional[str]) -> dict:
    """Agrege les evenements ingeres (paiements, presence, bulletins) pour un etablissement.

    NB : presence-service ne renseigne encore aucun "establishmentId" dans ses evenements - le
    filtre reste donc sans effet sur sm.presence.recorded tant qu'il ne le fait pas. payment-
    service, lui, renseigne "etablissementId" (cf. sa propre note dans _load_events).
    """
    payments = _load_events(db, TOPIC_PAYMENT_COMPLETED, establishment_id)
    presence = _load_events(db, TOPIC_PRESENCE_RECORDED, establishment_id)
    reportcards = _load_events(db, TOPIC_REPORTCARD_GENERATED, establishment_id)

    return {
        "establishment_id": establishment_id,
        "total_revenue": _sum_revenue(payments),
        "payment_count": int(len(payments)),
        "presence_count": int(len(presence)),
        "average_grade": _average_reportcard_grades(reportcards),
        "reportcard_batches": int(len(reportcards)),
    }


def compute_global_statistics(db: Session) -> dict:
    payments = _load_events(db, TOPIC_PAYMENT_COMPLETED)
    presence = _load_events(db, TOPIC_PRESENCE_RECORDED)
    reportcards = _load_events(db, TOPIC_REPORTCARD_GENERATED)
    establishment_events = _load_events(db, TOPIC_ESTABLISHMENT_CREATED)

    establishment_ids = set()
    for df in (payments, presence, reportcards, establishment_events):
        for column in ("establishmentId", "etablissementId"):
            if column in df.columns:
                establishment_ids.update(df[column].dropna().unique().tolist())

    return {
        "establishment_count": len(establishment_ids),
        "total_revenue": _sum_revenue(payments),
        "payment_count": int(len(payments)),
        "presence_count": int(len(presence)),
        "reportcard_batches": int(len(reportcards)),
    }
