import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    class_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # subject_id : reference vers admin-service (source de verite). subject_name : copie
    # denormalisee capturee a la creation, pour afficher le cours sans rappeler
    # admin-service a chaque lecture (meme convention que Grade dans reportcard-service).
    subject_id: Mapped[str] = mapped_column(String(100), nullable=False)
    subject_name: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
