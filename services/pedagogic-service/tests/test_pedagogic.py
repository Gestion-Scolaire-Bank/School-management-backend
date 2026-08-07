import io

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.admin_client import AdminResourceNotFound, get_admin_client
from app.core.database import Base, get_db
from app.core.storage import get_storage
from app.main import app


class FakeStorage:
    def __init__(self):
        self.uploaded = []

    def upload(self, object_name, data, content_type):
        self.uploaded.append((object_name, content_type))
        return f"http://fake-minio/sm-pedagogic-dev/{object_name}"


class FakeAdminClient:
    """Simule admin-service : une classe "6emeA" existante, des matieres "Maths"/"SVT", et
    "teacher-1" affecte a 6emeA/Maths - reproduit la validation reelle sans dependre d'un
    vrai admin-service en test (meme fixture que reportcard-service)."""

    KNOWN_CLASSES = {"6emeA", "5emeB"}
    KNOWN_SUBJECTS = {"SUBJ-MATHS": "Maths", "SUBJ-SVT": "SVT"}

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


@pytest.fixture()
def admin_client():
    return FakeAdminClient()


@pytest.fixture()
def client(admin_client):
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
    app.dependency_overrides[get_storage] = lambda: FakeStorage()
    app.dependency_overrides[get_admin_client] = lambda: admin_client

    # Pas de "with" ici : on evite de declencher le lifespan de l'app, qui appellerait
    # Base.metadata.create_all sur le vrai moteur Postgres (non disponible en test).
    test_client = TestClient(app)
    yield test_client

    app.dependency_overrides.clear()


def _upload(client, teacher_id="teacher-1", **extra_data):
    data = {"title": "Chapitre 1 - Algebre", "resource_type": "DOCUMENT"}
    data.update(extra_data)
    headers = {"X-User-Id": teacher_id} if teacher_id else {}
    return client.post(
        "/api/v1/pedagogic/resources",
        data=data,
        files={"file": ("chapitre1.pdf", io.BytesIO(b"%PDF-1.4 fake content"), "application/pdf")},
        headers=headers,
    )


def test_uploader_une_ressource_sans_classe_ni_matiere(client):
    """Une ressource generale (sans classe/matiere) reste autorisee."""
    response = _upload(client)
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Chapitre 1 - Algebre"
    assert body["file_name"] == "chapitre1.pdf"
    assert body["size_bytes"] > 0
    assert body["file_url"].startswith("http://fake-minio/")
    assert body["class_id"] is None
    assert body["subject_id"] is None


def test_uploader_une_ressource_avec_classe_matiere_affectee(client):
    response = _upload(client, class_id="6emeA", subject_id="SUBJ-MATHS")
    assert response.status_code == 201
    body = response.json()
    assert body["class_id"] == "6emeA"
    assert body["subject_id"] == "SUBJ-MATHS"
    assert body["subject_name"] == "Maths"


def test_uploader_une_ressource_classe_inconnue_retourne_400(client):
    response = _upload(client, class_id="ClasseInconnue")
    assert response.status_code == 400


def test_uploader_une_ressource_matiere_non_affectee_retourne_403(client):
    """teacher-1 n'est affecte qu'a 6emeA/Maths - pas a 6emeA/SVT."""
    response = _upload(client, class_id="6emeA", subject_id="SUBJ-SVT")
    assert response.status_code == 403


def test_lister_les_ressources_disponibles_filtre_par_matiere(client):
    _upload(client, title="Video intro", class_id="6emeA", subject_id="SUBJ-MATHS")
    _upload(client, title="Exercices", class_id="6emeA", subject_id="SUBJ-MATHS")

    response = client.get("/api/v1/pedagogic/resources", params={"subject_id": "SUBJ-MATHS"})
    assert response.status_code == 200
    resources = response.json()
    assert len(resources) == 2
    assert all(r["subject_id"] == "SUBJ-MATHS" for r in resources)


def _creer_cours(client, teacher_id="teacher-1", **overrides):
    payload = {
        "title": "Introduction aux fractions",
        "class_id": "6emeA",
        "subject_id": "SUBJ-MATHS",
        "content": "Plan de lecon : definitions, exemples, exercices.",
    }
    payload.update(overrides)
    headers = {"X-User-Id": teacher_id} if teacher_id else {}
    return client.post("/api/v1/pedagogic/courses", json=payload, headers=headers)


def test_creer_un_cours_plan_de_lecon(client):
    response = _creer_cours(client)
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Introduction aux fractions"
    assert body["subject_id"] == "SUBJ-MATHS"
    assert body["subject_name"] == "Maths"
    assert body["id"]


def test_creer_un_cours_champ_manquant_retourne_422(client):
    response = client.post("/api/v1/pedagogic/courses", json={"title": "Sans matiere"})
    assert response.status_code == 422


def test_creer_un_cours_classe_inconnue_retourne_400(client):
    response = _creer_cours(client, class_id="ClasseInconnue")
    assert response.status_code == 400


def test_creer_un_cours_matiere_non_affectee_retourne_403(client):
    response = _creer_cours(client, subject_id="SUBJ-SVT")
    assert response.status_code == 403


def test_lister_les_cours_disponibles(client):
    _creer_cours(client, title="Introduction aux fractions")
    _creer_cours(client, title="Les nombres decimaux")

    response = client.get("/api/v1/pedagogic/courses")
    assert response.status_code == 200
    courses = response.json()
    assert len(courses) == 2
    assert {c["title"] for c in courses} == {"Introduction aux fractions", "Les nombres decimaux"}


def test_lister_les_cours_disponibles_filtre_par_classe(client, admin_client):
    admin_client.assignments.append({"teacherId": "teacher-1", "classId": "5emeB", "subjectId": "SUBJ-MATHS"})
    _creer_cours(client, title="Cours 6emeA")
    _creer_cours(client, title="Cours 5emeB", class_id="5emeB")

    response = client.get("/api/v1/pedagogic/courses", params={"class_id": "5emeB"})
    assert response.status_code == 200
    courses = response.json()
    assert len(courses) == 1
    assert courses[0]["title"] == "Cours 5emeB"


def test_lister_les_cours_disponibles_liste_vide(client):
    response = client.get("/api/v1/pedagogic/courses")
    assert response.status_code == 200
    assert response.json() == []
