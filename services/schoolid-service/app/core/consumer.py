import asyncio
import json
import logging
from typing import Optional

from aiokafka import AIOKafkaConsumer

from app.api.routes import _generate_card
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.events import get_event_publisher
from app.schemas.school_id import GenerateCardRequest

logger = logging.getLogger(__name__)

# Consumer sm.registration.student.enrolled -> generation automatique de la carte d'identite
# (cf. README - Communications entrantes, UC7).
TOPIC_STUDENT_ENROLLED = "sm.registration.student.enrolled"


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


async def _consume_forever() -> None:
    consumer = AIOKafkaConsumer(
        TOPIC_STUDENT_ENROLLED,
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
                handle_student_enrolled(payload, db, get_event_publisher())
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
