import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PedagogicResource(Base):
    __tablename__ = "pedagogic_resources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    resource_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # class_id/subject_id restent optionnels : une ressource generale (ex. guide pedagogique
    # transversal) peut ne cibler aucune classe/matiere precise. Quand renseignes, ils sont
    # verifies aupres d'admin-service (cf. AdminServiceClient) plutot que laisses en texte libre.
    class_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    subject_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    subject_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    object_key: Mapped[str] = mapped_column(String(500), nullable=False)
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
