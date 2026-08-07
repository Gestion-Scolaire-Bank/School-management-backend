import asyncio
import json
from typing import Any, Dict

from aiokafka import AIOKafkaProducer

from app.core.config import settings


class KafkaEventPublisher:
    """Publie les evenements sortants de reportcard-service (cf. README - Communications sortantes)."""

    def __init__(self, bootstrap_servers: str):
        self._bootstrap_servers = bootstrap_servers

    def publish(self, topic: str, payload: Dict[str, Any]) -> None:
        # Les endpoints sont synchrones (SQLAlchemy sync) et tournent dans un thread du pool
        # FastAPI, sans event loop actif : asyncio.run() y est donc sans danger.
        asyncio.run(self._publish_async(topic, payload))

    async def _publish_async(self, topic: str, payload: Dict[str, Any]) -> None:
        producer = AIOKafkaProducer(bootstrap_servers=self._bootstrap_servers)
        await producer.start()
        try:
            await producer.send_and_wait(topic, json.dumps(payload).encode("utf-8"))
        finally:
            await producer.stop()


def get_event_publisher() -> KafkaEventPublisher:
    return KafkaEventPublisher(bootstrap_servers=settings.kafka_broker)
