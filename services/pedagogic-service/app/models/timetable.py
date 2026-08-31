import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, String, Integer, Date, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TimetableEntry(Base):
    __tablename__ = "timetable_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    subject_id: Mapped[str] = mapped_column(String(100), nullable=False)
    subject_name: Mapped[str] = mapped_column(String(200), nullable=False)
    teacher_id: Mapped[str] = mapped_column(String(100), nullable=False)
    day_of_week: Mapped[str] = mapped_column(String(20), nullable=False) # e.g., 'Monday'
    start_time: Mapped[datetime] = mapped_column(Time, nullable=False)
    end_time: Mapped[datetime] = mapped_column(Time, nullable=False)
    room: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
