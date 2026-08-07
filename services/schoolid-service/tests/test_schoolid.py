import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.events import get_event_publisher
from app.main import app


class FakePublisher:
    def __init__(self):
        self.published = []

    def publish(self, topic, payload):
        self.published.append((topic, payload))


@pytest.fixture()
def publisher():
    return FakePublisher()


@pytest.fixture()
def client(publisher):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_event_publisher] = lambda: publisher

    # Pas de "with" ici : on evite de declencher le lifespan de l'app, qui appellerait
    # Base.metadata.create_all sur le vrai moteur Postgres (non disponible en test).
    test_client = TestClient(app)
    yield test_client

    app.dependency_overrides.clear()


def test_generer_une_carte_id(client, publisher):
    response = client.post(
        "/api/v1/school-id/generate",
        json={
            "student_id": "STU-001",
            "full_name": "Jean Dupont",
            "class_name": "6eme A",
            "date_of_birth": "2013-04-12",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["student_id"] == "STU-001"
    assert body["version"] == 1
    assert body["status"] == "ACTIVE"
    assert body["card_number"].startswith("SM-")
    assert body["download_url"].endswith("/api/v1/school-id/STU-001")

    assert len(publisher.published) == 1
    topic, payload = publisher.published[0]
    assert topic == "sm.schoolid.generated"
    assert payload["studentId"] == "STU-001"


def test_telecharger_la_carte_id_retourne_le_png(client):
    client.post(
        "/api/v1/school-id/generate",
        json={"student_id": "STU-002", "full_name": "Awa Nguemo"},
    )

    response = client.get("/api/v1/school-id/STU-002")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content[:8] == b"\x89PNG\r\n\x1a\n"


def test_telecharger_la_carte_id_eleve_inconnu_retourne_404(client):
    response = client.get("/api/v1/school-id/INCONNU")
    assert response.status_code == 404


def test_renouveler_une_carte_id(client):
    client.post(
        "/api/v1/school-id/generate",
        json={"student_id": "STU-003", "full_name": "Marie Fotso"},
    )

    response = client.post("/api/v1/school-id/STU-003/reissue")
    assert response.status_code == 201
    body = response.json()
    assert body["version"] == 2
    assert body["status"] == "ACTIVE"

    # L'ancienne version doit avoir ete revoquee, seule la nouvelle est telechargeable.
    download = client.get("/api/v1/school-id/STU-003")
    assert download.status_code == 200


def test_renouveler_une_carte_id_eleve_inconnu_retourne_404(client):
    response = client.post("/api/v1/school-id/INCONNU/reissue")
    assert response.status_code == 404
