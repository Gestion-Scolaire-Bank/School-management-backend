import io
from typing import Sequence

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

from app.models.metric_event import MetricEvent


def _events_to_dataframe(events: Sequence[MetricEvent]) -> pd.DataFrame:
    records = [
        {
            "topic": event.topic,
            "establishment_id": event.establishment_id,
            "received_at": event.received_at.isoformat(),
            "payload": event.payload,
        }
        for event in events
    ]
    return pd.DataFrame.from_records(records, columns=["topic", "establishment_id", "received_at", "payload"])


def export_csv(events: Sequence[MetricEvent]) -> bytes:
    df = _events_to_dataframe(events)
    return df.to_csv(index=False).encode("utf-8")


def export_pdf(events: Sequence[MetricEvent]) -> bytes:
    df = _events_to_dataframe(events)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)

    header = ["Topic", "Etablissement", "Recu le", "Payload"]
    data = [header] + df.astype(str).values.tolist()

    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f4c81")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )
    doc.build([table])
    return buffer.getvalue()
