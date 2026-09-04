import uuid
from datetime import datetime, date
from sqlalchemy import String, Integer, Date, Text, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class ClassTime(Base):
    __tablename__ = "class_time"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    school_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    classroom_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    subject_id: Mapped[str] = mapped_column(String(36), nullable=False)
    teacher_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    start_time: Mapped[int] = mapped_column(Integer, nullable=False)  # minutes from 00:00
    end_time: Mapped[int] = mapped_column(Integer, nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 1=Mon..7=Sun
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BreakTime(Base):
    __tablename__ = "break_time"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    school_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    start_time: Mapped[int] = mapped_column(Integer, nullable=False)
    end_time: Mapped[int] = mapped_column(Integer, nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Holiday(Base):
    __tablename__ = "holidays"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    school_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    start_at: Mapped[date] = mapped_column(Date, nullable=False)
    end_at: Mapped[date] = mapped_column(Date, nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False, default="all_class")  # all_class | specific_class
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class HolidayClassroom(Base):
    __tablename__ = "holiday_classroom"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    school_id: Mapped[str] = mapped_column(String(36), nullable=False)
    holiday_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    classroom_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ClassTimeOccurrence(Base):
    __tablename__ = "class_time_occurrence"
    __table_args__ = (UniqueConstraint("class_time_id", "occurrence_date", name="uniq_class_time_occurrence"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    school_id: Mapped[str] = mapped_column(String(36), nullable=False)
    class_time_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    occurrence_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # moved | cancelled | deleted
    start_time: Mapped[int | None] = mapped_column(Integer, nullable=True)
    end_time: Mapped[int | None] = mapped_column(Integer, nullable=True)
    day_of_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
