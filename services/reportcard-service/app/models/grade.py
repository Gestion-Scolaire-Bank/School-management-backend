import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Grade(Base):
    __tablename__ = "grades"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    class_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    period: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # subject_id : reference vers admin-service (source de verite). subject_name : copie
    # denormalisee capturee a la saisie, pour afficher le bulletin sans rappeler
    # admin-service pour chaque ligne de note au moment du rendu PDF.
    subject_id: Mapped[str] = mapped_column(String(100), nullable=False)
    subject_name: Mapped[str] = mapped_column(String(200), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    max_score: Mapped[float] = mapped_column(Float, nullable=False, default=20.0)
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    teacher_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
