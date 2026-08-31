import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, String, Date, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    class_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    subject_id: Mapped[str] = mapped_column(String(100), nullable=False)
    subject_name: Mapped[str] = mapped_column(String(200), nullable=False)
    teacher_id: Mapped[str] = mapped_column(String(100), nullable=False)
    evaluation_type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g., 'Midterm', 'Final', 'Quiz'
    max_score: Mapped[float] = mapped_column(Float, nullable=False, default=20.0)
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    evaluation_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
