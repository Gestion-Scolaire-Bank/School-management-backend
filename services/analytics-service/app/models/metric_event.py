import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MetricEvent(Base):
    """Evenement brut ingere depuis Kafka (payments, presence, bulletins) - cf. README,
    Communications entrantes. Le payload est conserve tel quel (JSON) plutot que force dans
    un schema rigide : les services emetteurs (payment-service, presence-service) ne sont pas
    encore implementes, leur forme exacte de payload n'est donc pas figee."""

    __tablename__ = "metric_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    establishment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
