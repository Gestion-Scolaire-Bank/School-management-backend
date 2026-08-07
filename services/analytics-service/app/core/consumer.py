import asyncio
import json
import logging
from typing import Optional

from aiokafka import AIOKafkaConsumer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.metric_event import MetricEvent

logger = logging.getLogger(__name__)

# Consumer multi-topics (cf. README - Communications entrantes).
TOPICS = ["sm.payment.completed", "sm.presence.recorded", "sm.reportcard.generated"]


def store_event(db: Session, topic: str, raw_value: bytes) -> Optional[MetricEvent]:
    try:
        payload = json.loads(raw_value.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        logger.warning("Message ignore sur %s : payload non JSON", topic)
        return None

    # sm.payment.completed utilise "etablissementId" (francais, cf. README payment-service) ;
    # les autres topics utilisent "establishmentId" - on accepte les deux.
    event = MetricEvent(
        topic=topic,
        establishment_id=payload.get("establishmentId") or payload.get("etablissementId"),
        payload=json.dumps(payload),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


async def _consume_forever() -> None:
    consumer = AIOKafkaConsumer(
        *TOPICS,
        bootstrap_servers=settings.kafka_broker,
        group_id="analytics-service-group",
        enable_auto_commit=True,
    )
    await consumer.start()
    try:
        async for message in consumer:
            db = SessionLocal()
            try:
                store_event(db, message.topic, message.value)
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
                "Consumer Kafka analytics-service interrompu (%s), nouvelle tentative dans 10s", error
            )
            await asyncio.sleep(10)


def start_consumer_task() -> asyncio.Task:
    return asyncio.create_task(_run_with_retry())
