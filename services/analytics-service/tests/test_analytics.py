import json

import pytest
from fastapi.testclient import TestClient  # noqa: F401 # starlette.testclient is deprecated
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning, message="starlette.testclient is deprecated")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.cache import get_cache
from app.core.consumer import store_event
from app.core.database import Base, get_db
from app.main import app


class FakeCache:
    def __init__(self):
        self.store = {}

    def get(self, key):
        return self.store.get(key)

    def set(self, key, value):
        self.store[key] = value


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    return testing_session_local


@pytest.fixture()
def cache():
    return FakeCache()


@pytest.fixture()
def client(session_factory, cache):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_cache] = lambda: cache
    # Pas de "with" ici : on evite de declencher le lifespan de l'app, qui demarrerait le
    # consumer Kafka (non disponible en test) et appellerait Base.metadata.create_all sur le
    # vrai moteur Postgres.
    test_client = TestClient(app)
    yield test_client

    app.dependency_overrides.clear()


def _seed(session_factory, topic, payload):
    session = session_factory()
    try:
        store_event(session, topic, json.dumps(payload).encode("utf-8"))
    finally:
        session.close()


def test_store_event_ignore_un_payload_non_json(session_factory):
    session = session_factory()
    result = store_event(session, "sm.payment.completed", b"not-json")
    assert result is None


def test_store_event_persiste_le_payload(session_factory):
    session = session_factory()
    event = store_event(session, "sm.payment.completed", json.dumps({"amount": 5000}).encode("utf-8"))
    assert event is not None
    assert event.topic == "sm.payment.completed"


def test_tableau_de_bord_agrege_les_evenements(client, session_factory):
    _seed(session_factory, "sm.payment.completed", {"montant": 5000, "etablissementId": "etab-1"})
    _seed(session_factory, "sm.payment.completed", {"montant": 3000, "etablissementId": "etab-1"})
    _seed(session_factory, "sm.reportcard.generated", {"classId": "6emeA", "moyennes": {"STU-1": 15, "STU-2": 10}})

    response = client.get("/api/v1/analytics/dashboard")
    assert response.status_code == 200
    body = response.json()
    assert body["total_revenue"] == 8000
    assert body["payment_count"] == 2
    assert body["average_grade"] == 12.5


def test_tableau_de_bord_utilise_le_cache(client, cache):
    cache.set("sm:analytics:dashboard:all", {"cached": True})
    response = client.get("/api/v1/analytics/dashboard")
    assert response.status_code == 200
    assert response.json() == {"cached": True}


def test_statistiques_globales(client, session_factory):
    _seed(session_factory, "sm.presence.recorded", {"status": "PRESENT"})
    _seed(session_factory, "sm.presence.recorded", {"status": "ABSENT"})

    response = client.get("/api/v1/analytics/global")
    assert response.status_code == 200
    body = response.json()
    assert body["presence_count"] == 2


def test_export_csv(client, session_factory):
    _seed(session_factory, "sm.payment.completed", {"amount": 1000})

    response = client.get("/api/v1/analytics/export", params={"format": "csv"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "sm.payment.completed" in response.text


def test_export_pdf(client, session_factory):
    _seed(session_factory, "sm.payment.completed", {"amount": 1000})

    response = client.get("/api/v1/analytics/export", params={"format": "pdf"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:4] == b"%PDF"


def test_export_format_invalide_retourne_422(client):
    response = client.get("/api/v1/analytics/export", params={"format": "xml"})
    assert response.status_code == 422