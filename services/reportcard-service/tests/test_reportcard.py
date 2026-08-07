import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.admin_client import AdminResourceNotFound, get_admin_client
from app.core.database import Base, get_db
from app.core.events import get_event_publisher
from app.core.pdf_renderer import get_pdf_renderer
from app.core.registration_client import get_registration_client
from app.core.storage import get_storage
from app.main import app


class FakeStorage:
    def __init__(self):
        self.uploaded = {}

    def upload(self, object_name, data, content_type="application/pdf"):
        self.uploaded[object_name] = data
        return f"http://fake-minio/sm-reportcard-dev/{object_name}"

    def download(self, object_name):
        return self.uploaded[object_name]


class FakePublisher:
    def __init__(self):
        self.published = []

    def publish(self, topic, payload):
        self.published.append((topic, payload))


class FakeAdminClient:
    """Simule admin-service : une classe "6emeA" existante, une matiere "Maths", et
    "teacher-1" affecte a cette classe/matiere - reproduit la validation reelle sans
    dependre d'un vrai admin-service en test."""

    KNOWN_CLASSES = {"6emeA", "5emeB"}
    KNOWN_SUBJECTS = {"SUBJ-MATHS": "Maths"}

    def __init__(self):
        self.assignments = [{"teacherId": "teacher-1", "classId": "6emeA", "subjectId": "SUBJ-MATHS"}]

    def get_class(self, class_id):
        if class_id not in self.KNOWN_CLASSES:
            raise AdminResourceNotFound(f"Classe introuvable : {class_id}")
        return {"id": class_id}

    def get_subject(self, subject_id):
        if subject_id not in self.KNOWN_SUBJECTS:
            raise AdminResourceNotFound(f"Matiere introuvable : {subject_id}")
        return {"id": subject_id, "name": self.KNOWN_SUBJECTS[subject_id]}

    def list_teacher_assignments(self, class_id):
        return [a for a in self.assignments if a["classId"] == class_id]


class FakeRegistrationClient:
    """Simule registration-service : une classe "5emeB" avec deux eleves connus - reproduit
    la resolution de nom sans dependre d'un vrai registration-service en test."""

    def __init__(self):
        self.by_class = {
            "5emeB": [
                {"id": "STU-4", "firstName": "Kevin", "lastName": "Fouda"},
                {"id": "STU-5", "firstName": "Aicha", "lastName": "Njoya"},
            ]
        }

    def list_by_class(self, class_id):
        return self.by_class.get(class_id, [])


def fake_render_pdf(**kwargs):
    return b"%PDF-1.4 fake bulletin content"


@pytest.fixture()
def storage():
    return FakeStorage()


@pytest.fixture()
def publisher():
    return FakePublisher()


@pytest.fixture()
def registration_client():
    return FakeRegistrationClient()


@pytest.fixture()
def admin_client():
    admin = FakeAdminClient()
    # Autorise aussi "teacher-1" sur 5emeB/Maths pour les tests de generation/synthese.
    admin.assignments.append({"teacherId": "teacher-1", "classId": "5emeB", "subjectId": "SUBJ-MATHS"})
    return admin


@pytest.fixture()
def client(storage, publisher, admin_client, registration_client):
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
    app.dependency_overrides[get_storage] = lambda: storage
    app.dependency_overrides[get_event_publisher] = lambda: publisher
    app.dependency_overrides[get_pdf_renderer] = lambda: fake_render_pdf
    app.dependency_overrides[get_admin_client] = lambda: admin_client
    app.dependency_overrides[get_registration_client] = lambda: registration_client

    # Pas de "with" ici : on evite de declencher le lifespan de l'app, qui appellerait
    # Base.metadata.create_all sur le vrai moteur Postgres (non disponible en test).
    test_client = TestClient(app)
    yield test_client

    app.dependency_overrides.clear()


def _saisir_note(client, student_id, class_id, period, subject_id, score, teacher_id="teacher-1", **kwargs):
    payload = {
        "student_id": student_id,
        "class_id": class_id,
        "period": period,
        "subject_id": subject_id,
        "score": score,
    }
    payload.update(kwargs)
    headers = {"X-User-Id": teacher_id} if teacher_id else {}
    return client.post("/api/v1/reports/grades", json=payload, headers=headers)


def test_saisir_une_note(client):
    response = _saisir_note(client, "STU-1", "6emeA", "T1", "SUBJ-MATHS", 15)
    assert response.status_code == 201
    body = response.json()
    assert body["subject_id"] == "SUBJ-MATHS"
    assert body["subject_name"] == "Maths"
    assert body["teacher_id"] == "teacher-1"


def test_saisir_une_note_score_superieur_au_max_retourne_422(client):
    response = _saisir_note(client, "STU-1", "6emeA", "T1", "SUBJ-MATHS", 25, max_score=20)
    assert response.status_code == 422


def test_saisir_une_note_classe_inconnue_retourne_400(client):
    response = _saisir_note(client, "STU-1", "ClasseInconnue", "T1", "SUBJ-MATHS", 15)
    assert response.status_code == 400


def test_saisir_une_note_matiere_inconnue_retourne_400(client):
    response = _saisir_note(client, "STU-1", "6emeA", "T1", "SUBJ-INCONNUE", 15)
    assert response.status_code == 400


def test_saisir_une_note_enseignant_non_affecte_retourne_403(client):
    response = _saisir_note(client, "STU-1", "6emeA", "T1", "SUBJ-MATHS", 15, teacher_id="teacher-intrus")
    assert response.status_code == 403


def test_saisir_une_note_sans_en_tete_x_user_id_retourne_403(client):
    response = _saisir_note(client, "STU-1", "6emeA", "T1", "SUBJ-MATHS", 15, teacher_id=None)
    assert response.status_code == 403


def test_generer_les_bulletins_sans_notes_retourne_404(client):
    response = client.post("/api/v1/reports/generate", json={"class_id": "inconnue", "period": "T1"})
    assert response.status_code == 404


def test_generer_les_bulletins_calcule_moyenne_et_rang(client, publisher):
    _saisir_note(client, "STU-1", "6emeA", "T1", "SUBJ-MATHS", 15)
    _saisir_note(client, "STU-2", "6emeA", "T1", "SUBJ-MATHS", 10)

    response = client.post("/api/v1/reports/generate", json={"class_id": "6emeA", "period": "T1"})
    assert response.status_code == 201
    body = response.json()
    assert len(body) == 2

    by_student = {rc["student_id"]: rc for rc in body}
    assert by_student["STU-1"]["average"] == 15
    assert by_student["STU-1"]["rank"] == 1
    assert by_student["STU-2"]["average"] == 10
    assert by_student["STU-2"]["rank"] == 2
    assert all(rc["class_size"] == 2 for rc in body)

    topics = [topic for topic, _ in publisher.published]
    assert topics.count("sm.reportcard.available") == 2
    assert "sm.reportcard.generated" in topics


def test_consulter_telecharger_le_bulletin(client):
    _saisir_note(client, "STU-3", "6emeA", "T1", "SUBJ-MATHS", 12)
    client.post("/api/v1/reports/generate", json={"class_id": "6emeA", "period": "T1"})

    response = client.get("/api/v1/reports/student/STU-3")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content == b"%PDF-1.4 fake bulletin content"


def test_consulter_telecharger_le_bulletin_eleve_sans_bulletin_retourne_404(client):
    response = client.get("/api/v1/reports/student/INCONNU")
    assert response.status_code == 404


def test_statistiques_de_classe(client):
    _saisir_note(client, "STU-4", "5emeB", "T1", "SUBJ-MATHS", 16)
    _saisir_note(client, "STU-5", "5emeB", "T1", "SUBJ-MATHS", 8)
    client.post("/api/v1/reports/generate", json={"class_id": "5emeB", "period": "T1"})

    response = client.get("/api/v1/reports/class/5emeB/summary", params={"period": "T1"})
    assert response.status_code == 200
    body = response.json()
    assert body["student_count"] == 2
    assert body["class_average"] == 12
    assert body["students"][0]["rank"] == 1
    assert body["students"][0]["student_name"] == "Kevin Fouda"


def test_statistiques_de_classe_registration_service_injoignable_degrade_sur_l_id(client, registration_client):
    def boom(class_id):
        raise httpx.ConnectError("injoignable")

    registration_client.list_by_class = boom

    _saisir_note(client, "STU-4", "5emeB", "T1", "SUBJ-MATHS", 16)
    client.post("/api/v1/reports/generate", json={"class_id": "5emeB", "period": "T1"})

    response = client.get("/api/v1/reports/class/5emeB/summary", params={"period": "T1"})
    assert response.status_code == 200
    body = response.json()
    assert body["students"][0]["student_name"] == "STU-4"


def test_statistiques_de_classe_sans_bulletins_retourne_zero(client):
    response = client.get("/api/v1/reports/class/inconnue/summary", params={"period": "T1"})
    assert response.status_code == 200
    body = response.json()
    assert body["student_count"] == 0
    assert body["class_average"] == 0
