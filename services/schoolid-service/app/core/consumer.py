import asyncio
import json
import logging
from typing import Optional

from aiokafka import AIOKafkaConsumer

from app.api.routes import _generate_card, _generate_certificate
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.events import get_event_publisher
from app.schemas.school_id import GenerateCardRequest

logger = logging.getLogger(__name__)

# Consumer sm.registration.student.enrolled -> generation automatique de la carte d'identite
# (cf. README - Communications entrantes, UC7).
TOPIC_STUDENT_ENROLLED = "sm.registration.student.enrolled"

# Nouveau topic : generation de certificat de fin d'etudes
TOPIC_CERTIFICATE_GENERATED = "sm.reportcard.generated"


def handle_student_enrolled(payload: dict, db, publisher) -> Optional[object]:
    student_id = payload.get("studentId")
    if not student_id:
        logger.warning("Evenement %s ignore (studentId manquant)", TOPIC_STUDENT_ENROLLED)
        return None

    request = GenerateCardRequest(
        student_id=student_id,
        full_name=payload.get("fullName") or student_id,
        class_name=payload.get("classId"),
        photo_url=payload.get("photo"),
    )
    card = _generate_card(request, version=1, db=db, publisher=publisher)
    logger.info("Carte generee automatiquement pour l'eleve %s", student_id)
    return card


def handle_certificate_generated(payload: dict, db, publisher) -> Optional[object]:
    student_id = payload.get("studentId")
    if not student_id:
        logger.warning("Evenement %s ignore (studentId manquant)", TOPIC_CERTIFICATE_GENERATED)
        return None

    # Generate certificate similar to school ID card but with academic information
    from app.models.Certificate import Certificate  # will be imported dynamically
    from datetime import datetime, timezone
    import uuid

    certificate = Certificate(
        id=str(uuid.uuid4()),
        student_id=student_id,
        establishment_id=payload.get("establishmentId", ""),
        student_name=payload.get("fullName", student_id),
        certificate_type=payload.get("type", "Graduation"),
        issued_at=datetime.now(timezone.utc).isoformat(),
        signed_by="School Administration",
        gpa=payload.get("gpa"),
        subjects=payload.get("subjects", []),
        credential_id=payload.get("credentialId", ""),
    )

    # Publish certificate generated event
    publisher.publish(TOPIC_CERTIFICATE_GENERATED, {
        "studentId": student_id,
        "establishmentId": payload.get("establishmentId", ""),
        "fullName": payload.get("fullName", student_id),
        "type": payload.get("type", "Graduation"),
        "gpa": payload.get("gpa"),
        "subjects": payload.get("subjects", []),
        "credentialId": payload.get("credentialId", ""),
    })

    logger.info("Certificat genere automatiquement pour l'eleve %s", student_id)
    return certificate


async def _consume_forever() -> None:
    consumer = AIOKafkaConsumer(
        TOPIC_STUDENT_ENROLLED,
        TOPIC_CERTIFICATE_GENERATED,
        bootstrap_servers=settings.kafka_broker,
        group_id="schoolid-service-group",
        enable_auto_commit=True,
    )
    await consumer.start()
    try:
        async for message in consumer:
            try:
                payload = json.loads(message.value.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                logger.warning("Message ignore sur %s : payload non JSON", message.topic)
                continue

            db = SessionLocal()
            try:
                if message.topic == TOPIC_STUDENT_ENROLLED:
                    handle_student_enrolled(payload, db, get_event_publisher())
                elif message.topic == TOPIC_CERTIFICATE_GENERATED:
                    handle_certificate_generated(payload, db, get_event_publisher())
            finally:
                db.close()
    finally:
        await consumer.stop()


async def _run_with_retry() -> None:
    while True:
        try:
            await _consume_forever()
        except Exception as error:  # noqa: BLE001 - le consumer doit survivre a une panne Kafka
            logger.warning(
                "Consumer Kafka schoolid-service interrompu (%s), nouvelle tentative dans 10s", error
            )
            await asyncio.sleep(10)


def start_consumer_task() -> asyncio.Task:
    return asyncio.create_task(_run_with_retry())
