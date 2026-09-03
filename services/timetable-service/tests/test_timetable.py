from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app

# use in-memory sqlite for tests
engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_create_and_list_class_time():
    r = client.post("/api/v1/timetable/class-times", json={"classroomId": "cl1", "subjectId": "sub1", "teacherId": "t1", "startTime": 480, "endTime": 540, "dayOfWeek": 1})
    assert r.status_code == 201, r.text
    cid = r.json()["id"]
    # overlap should 409
    r2 = client.post("/api/v1/timetable/class-times", json={"classroomId": "cl1", "subjectId": "sub2", "teacherId": "t2", "startTime": 500, "endTime": 560, "dayOfWeek": 1})
    assert r2.status_code == 409
    # no overlap different day OK
    r3 = client.post("/api/v1/timetable/class-times", json={"classroomId": "cl1", "subjectId": "sub2", "teacherId": "t2", "startTime": 500, "endTime": 560, "dayOfWeek": 2})
    assert r3.status_code == 201
    # list
    r = client.get("/api/v1/timetable/class-times", params={"classroomId": "cl1"})
    assert r.status_code == 200
    assert len(r.json()["data"]) >= 2
    # get
    r = client.get(f"/api/v1/timetable/class-times/{cid}")
    assert r.status_code == 200
    # update
    r = client.patch(f"/api/v1/timetable/class-times/{cid}", json={"classroomId": "cl1", "subjectId": "sub1", "teacherId": "t1", "startTime": "08:00", "endTime": "09:00", "dayOfWeek": 1})
    assert r.status_code == 200


def test_break_time_and_holiday():
    r = client.post("/api/v1/timetable/break-times", json={"startTime": 600, "endTime": 615, "dayOfWeek": 1})
    assert r.status_code == 201
    r = client.get("/api/v1/timetable/break-times")
    assert r.status_code == 200
    r = client.post("/api/v1/timetable/holidays", json={"name": "Paques", "startAt": "2026-04-10", "endAt": "2026-04-12", "type": "all_class"})
    assert r.status_code == 201, r.text
    hid = r.json()["id"]
    r = client.post("/api/v1/timetable/holiday-classrooms", json={"holidayId": hid, "classroomId": "cl1"})
    assert r.status_code == 201
    r = client.get("/api/v1/timetable/holidays")
    assert r.status_code == 200


def test_simulate_and_occurrence():
    # create a slot
    r = client.post("/api/v1/timetable/class-times", json={"classroomId": "sim-cl", "subjectId": "math", "teacherId": "prof1", "startTime": 480, "endTime": 540, "dayOfWeek": 1})
    cid = r.json()["id"]
    # simulate classroom should have weeks
    r = client.get(f"/api/v1/timetable/classroom/sim-cl/simulate", params={"weeks": 2})
    assert r.status_code == 200
    assert "weeks" in r.json()["data"]
    # move occurrence
    from datetime import date, timedelta
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    d = monday.isoformat()
    r = client.patch(f"/api/v1/timetable/class-times/{cid}/occurrences/{d}/move", json={"startTime": 600, "endTime": 660, "dayOfWeek": 1})
    assert r.status_code == 200
    # cancel another date
    tue = (monday + timedelta(days=1)).isoformat()
    r = client.patch(f"/api/v1/timetable/class-times/{cid}/occurrences/{tue}/cancel", json={"reason": "greve"})
    assert r.status_code == 200
    # delete
    wed = (monday + timedelta(days=2)).isoformat()
    r = client.delete(f"/api/v1/timetable/class-times/{cid}/occurrences/{wed}")
    assert r.status_code == 200
    # restore
    r = client.patch(f"/api/v1/timetable/class-times/{cid}/occurrences/{wed}/restore")
    assert r.status_code == 200
    r = client.get(f"/api/v1/timetable/teacher/prof1/simulate", params={"weeks": 2})
    assert r.status_code == 200
