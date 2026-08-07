import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.consumer import handle_student_enrolled
from app.core.database import Base


class FakePublisher:
    def __init__(self):
        self.published = []

    def publish(self, topic, payload):
        self.published.append((topic, payload))


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = testing_session_local()
    yield session
    session.close()


def test_handle_student_enrolled_genere_une_carte(db_session):
    publisher = FakePublisher()
    payload = {
        "studentId": "STU-42",
        "fullName": "Junior Mbarga",
        "classId": "6emeA",
        "photo": None,
    }

    card = handle_student_enrolled(payload, db_session, publisher)

    assert card is not None
    assert card.student_id == "STU-42"
    assert card.full_name == "Junior Mbarga"
    assert card.class_name == "6emeA"
    assert len(publisher.published) == 1


def test_handle_student_enrolled_sans_nom_utilise_le_studentId(db_session):
    publisher = FakePublisher()
    payload = {"studentId": "STU-43"}

    card = handle_student_enrolled(payload, db_session, publisher)

    assert card.full_name == "STU-43"


def test_handle_student_enrolled_evenement_incomplet_est_ignore(db_session):
    publisher = FakePublisher()
    result = handle_student_enrolled({"fullName": "Sans ID"}, db_session, publisher)

    assert result is None
    assert publisher.published == []
