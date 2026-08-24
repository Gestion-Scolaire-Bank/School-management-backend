from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.card_renderer import render_card
from app.core.config import settings
from app.core.database import get_db
from app.core.events import KafkaEventPublisher, get_event_publisher
from app.models.school_id_card import SchoolIdCard
from app.schemas.school_id import GenerateCardRequest, SchoolIdCardResponse

router = APIRouter()

# Routes schoolid-service - extraites du document de conception (section 5.2)

CARD_VALIDITY_DAYS = 365
EVENT_TOPIC_GENERATED = "sm.schoolid.generated"


def _to_response(card: SchoolIdCard) -> SchoolIdCardResponse:
    return SchoolIdCardResponse(
        id=card.id,
        student_id=card.student_id,
        card_number=card.card_number,
        full_name=card.full_name,
        class_name=card.class_name,
        status=card.status,
        version=card.version,
        issued_at=card.issued_at,
        expires_at=card.expires_at,
        download_url=f"{settings.sm_gateway_url}/api/v1/school-id/{card.student_id}",
    )


def _generate_card(
    payload: GenerateCardRequest,
    version: int,
    db: Session,
    publisher: KafkaEventPublisher,
) -> SchoolIdCard:
    card_number = f"SM-{datetime.now(timezone.utc).year}-{uuid4().hex[:8].upper()}"
    expires_at = date.today() + timedelta(days=CARD_VALIDITY_DAYS)
    qr_payload = f"SCHOOLMANAGE:{payload.student_id}:{card_number}"

    card_image = render_card(
        card_number=card_number,
        student_id=payload.student_id,
        full_name=payload.full_name,
        class_name=payload.class_name,
        date_of_birth=payload.date_of_birth,
        expires_at=expires_at,
        qr_payload=qr_payload,
        school_name=payload.school_name,
        accent_color=payload.accent_color,
        background_color=payload.background_color,
        logo_url=payload.logo_url,
        photo_url=payload.photo_url,
    )

    card = SchoolIdCard(
        student_id=payload.student_id,
        card_number=card_number,
        full_name=payload.full_name,
        class_name=payload.class_name,
        date_of_birth=payload.date_of_birth,
        photo_url=payload.photo_url,
        qr_payload=qr_payload,
        card_image=card_image,
        version=version,
        status="ACTIVE",
        expires_at=expires_at,
    )
    db.add(card)
    db.commit()
    db.refresh(card)

    download_url = f"{settings.sm_gateway_url}/api/v1/school-id/{card.student_id}"
    try:
        publisher.publish(EVENT_TOPIC_GENERATED, {"studentId": card.student_id, "idCardUrl": download_url})
    except Exception:
        # La generation de la carte reste valide meme si Kafka est indisponible :
        # la notification est un effet secondaire, pas la responsabilite principale.
        pass

    return card


@router.post(
    "/api/v1/school-id/generate",
    response_model=SchoolIdCardResponse,
    status_code=status.HTTP_201_CREATED,
)
def generer_une_carte_id(
    payload: GenerateCardRequest,
    db: Session = Depends(get_db),
    publisher: KafkaEventPublisher = Depends(get_event_publisher),
):
    """Roles autorises : Systeme (interne)."""
    card = _generate_card(payload, version=1, db=db, publisher=publisher)
    return _to_response(card)


@router.post(
    "/api/v1/school-id/{studentId}/reissue",
    response_model=SchoolIdCardResponse,
    status_code=status.HTTP_201_CREATED,
)
def renouveler_une_carte_id(
    studentId: str,
    db: Session = Depends(get_db),
    publisher: KafkaEventPublisher = Depends(get_event_publisher),
):
    """Roles autorises : Admin."""
    existing = db.execute(
        select(SchoolIdCard).where(SchoolIdCard.student_id == studentId).order_by(SchoolIdCard.version.desc())
    ).scalars().first()

    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aucune carte existante pour cet eleve")

    if existing.status == "ACTIVE":
        existing.status = "REVOKED"
        db.add(existing)

    payload = GenerateCardRequest(
        student_id=existing.student_id,
        full_name=existing.full_name,
        class_name=existing.class_name,
        date_of_birth=existing.date_of_birth,
        photo_url=existing.photo_url,
    )
    card = _generate_card(payload, version=existing.version + 1, db=db, publisher=publisher)
    return _to_response(card)


@router.get("/api/v1/school-id/{studentId}")
def telecharger_la_carte_id(studentId: str, db: Session = Depends(get_db)):
    """Roles autorises : Parent / Admin."""
    card = db.execute(
        select(SchoolIdCard)
        .where(SchoolIdCard.student_id == studentId, SchoolIdCard.status == "ACTIVE")
        .order_by(SchoolIdCard.version.desc())
    ).scalars().first()

    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aucune carte active pour cet eleve")

    return Response(content=card.card_image, media_type="image/png")
