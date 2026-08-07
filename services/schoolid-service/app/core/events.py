import asyncio
import json
from typing import Any, Dict

from aiokafka import AIOKafkaProducer

from app.core.config import settings


class KafkaEventPublisher:
    """Publie les evenements metier de schoolid-service (cf. README - Communications sortantes)."""

    def __init__(self, bootstrap_servers: str):
        self._bootstrap_servers = bootstrap_servers

    def publish(self, topic: str, payload: Dict[str, Any]) -> None:
        # Deux contextes d'appel possibles :
        #  - depuis un endpoint REST synchrone (thread du pool FastAPI, sans event loop actif)
        #    -> asyncio.run() demarre une boucle dediee, sans danger.
        #  - depuis le consumer Kafka (handle_student_enrolled, appele dans la boucle asyncio
        #    du consumer) -> une boucle tourne deja dans ce thread ; asyncio.run() y echouerait
        #    ("cannot be called from a running event loop"), d'ou la planification via
        #    create_task() dans ce cas.
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop is not None:
            loop.create_task(self._publish_async(topic, payload))
        else:
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
