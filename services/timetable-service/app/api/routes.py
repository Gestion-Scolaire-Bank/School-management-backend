from datetime import date, timedelta, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.models.timetable import ClassTime, BreakTime, Holiday, HolidayClassroom, ClassTimeOccurrence
from app.schemas.timetable import (
    ClassTimeCreate, ClassTimeUpdate,
    BreakTimeCreate, BreakTimeUpdate,
    HolidayCreate, HolidayUpdate,
    HolidayClassroomCreate,
    OccurrenceMove, OccurrenceCancel,
)

router = APIRouter()

DEFAULT_SCHOOL = "default"


def resolve_school(school_id: Optional[str]) -> str:
    return school_id or DEFAULT_SCHOOL


def minutes_to_hhmm(m: int) -> str:
    return f"{m // 60:02d}:{m % 60:02d}"


def check_overlap(db: Session, school_id: str, classroom_id: str, day_of_week: int, start: int, end: int, exclude_id: Optional[str] = None):
    q = select(ClassTime).where(
        ClassTime.school_id == school_id,
        ClassTime.classroom_id == classroom_id,
        ClassTime.day_of_week == day_of_week,
    )
    if exclude_id:
        q = q.where(ClassTime.id != exclude_id)
    for ct in db.execute(q).scalars():
        if not (end <= ct.start_time or start >= ct.end_time):
            raise HTTPException(status_code=409, detail=f"Overlap with class_time {ct.id} ({minutes_to_hhmm(ct.start_time)}-{minutes_to_hhmm(ct.end_time)})")


def check_teacher_overlap(db: Session, school_id: str, teacher_id: str, day_of_week: int, start: int, end: int, exclude_id: Optional[str] = None):
    """Prevent double-booking a teacher (same logic as classroom overlap)."""
    q = select(ClassTime).where(
        ClassTime.school_id == school_id,
        ClassTime.teacher_id == teacher_id,
        ClassTime.day_of_week == day_of_week,
    )
    if exclude_id:
        q = q.where(ClassTime.id != exclude_id)
    for ct in db.execute(q).scalars():
        if not (end <= ct.start_time or start >= ct.end_time):
            raise HTTPException(status_code=409, detail=f"Teacher already booked {minutes_to_hhmm(ct.start_time)}-{minutes_to_hhmm(ct.end_time)} (class_time {ct.id})")


def check_break_overlap(db: Session, school_id: str, day_of_week: int, start: int, end: int, exclude_id: Optional[str] = None):
    q = select(BreakTime).where(
        BreakTime.school_id == school_id,
        BreakTime.day_of_week == day_of_week,
    )
    if exclude_id:
        q = q.where(BreakTime.id != exclude_id)
    for bt in db.execute(q).scalars():
        if not (end <= bt.start_time or start >= bt.end_time):
            raise HTTPException(status_code=409, detail=f"Overlap with break_time {bt.id} ({minutes_to_hhmm(bt.start_time)}-{minutes_to_hhmm(bt.end_time)})")


def _holidays_for_classroom(db: Session, school: str, classroom_id: str):
    """wyscolars parity: holidays linked via holiday_classroom PLUS global
    all_class holidays (HolidayType semantics: all_class applies everywhere,
    specific_class only when linked)."""
    hc_rows = db.execute(select(HolidayClassroom).where(HolidayClassroom.classroom_id == classroom_id, HolidayClassroom.school_id == school)).scalars().all()
    linked_ids = [hc.holiday_id for hc in hc_rows]
    q = select(Holiday).where(Holiday.school_id == school)
    holidays = db.execute(q).scalars().all()
    # keep global all_class holidays + linked specific ones
    out = [h for h in holidays if h.type == "all_class" or h.id in linked_ids]
    return out


# ---------- ClassTime ----------
@router.post("/api/v1/timetable/class-times", status_code=201)
def create_class_time(payload: ClassTimeCreate, db: Session = Depends(get_db)):
    if payload.startTime >= payload.endTime:
        raise HTTPException(400, "startTime must be before endTime")
    school = resolve_school(payload.schoolId)
    check_overlap(db, school, payload.classroomId, payload.dayOfWeek, payload.startTime, payload.endTime)
    check_teacher_overlap(db, school, payload.teacherId, payload.dayOfWeek, payload.startTime, payload.endTime)
    ct = ClassTime(
        school_id=school,
        classroom_id=payload.classroomId,
        subject_id=payload.subjectId,
        teacher_id=payload.teacherId,
        start_time=payload.startTime,
        end_time=payload.endTime,
        day_of_week=payload.dayOfWeek,
    )
    db.add(ct)
    db.commit()
    db.refresh(ct)
    return {"id": ct.id, "data": _serialize_class_time(ct)}


@router.get("/api/v1/timetable/class-times")
def list_class_times(
    classroomId: Optional[str] = None,
    teacherId: Optional[str] = None,
    subjectId: Optional[str] = None,
    schoolId: Optional[str] = None,
    db: Session = Depends(get_db),
):
    school = resolve_school(schoolId)
    q = select(ClassTime).where(ClassTime.school_id == school)
    if classroomId:
        q = q.where(ClassTime.classroom_id == classroomId)
    if teacherId:
        q = q.where(ClassTime.teacher_id == teacherId)
    if subjectId:
        q = q.where(ClassTime.subject_id == subjectId)
    q = q.order_by(ClassTime.day_of_week, ClassTime.start_time)
    items = db.execute(q).scalars().all()
    return {"data": [_serialize_class_time(x) for x in items]}


@router.get("/api/v1/timetable/class-times/{ct_id}")
def get_class_time(ct_id: str, db: Session = Depends(get_db)):
    ct = db.get(ClassTime, ct_id)
    if not ct:
        raise HTTPException(404, "class_time not found")
    return {"data": _serialize_class_time(ct)}


@router.patch("/api/v1/timetable/class-times/{ct_id}", status_code=200)
def update_class_time(ct_id: str, payload: ClassTimeUpdate, db: Session = Depends(get_db)):
    ct = db.get(ClassTime, ct_id)
    if not ct:
        raise HTTPException(404, "class_time not found")
    if payload.startTime >= payload.endTime:
        raise HTTPException(400, "startTime must be before endTime")
    check_overlap(db, ct.school_id, payload.classroomId, payload.dayOfWeek, payload.startTime, payload.endTime, exclude_id=ct_id)
    check_teacher_overlap(db, ct.school_id, payload.teacherId, payload.dayOfWeek, payload.startTime, payload.endTime, exclude_id=ct_id)
    ct.classroom_id = payload.classroomId
    ct.subject_id = payload.subjectId
    ct.teacher_id = payload.teacherId
    ct.start_time = payload.startTime
    ct.end_time = payload.endTime
    ct.day_of_week = payload.dayOfWeek
    ct.updated_at = datetime.utcnow()
    db.commit()
    return {"data": _serialize_class_time(ct)}


@router.delete("/api/v1/timetable/class-times/{ct_id}", status_code=204)
def delete_class_time(ct_id: str, db: Session = Depends(get_db)):
    ct = db.get(ClassTime, ct_id)
    if not ct:
        raise HTTPException(404, "class_time not found")
    db.delete(ct)
    db.commit()
    return None


def _serialize_class_time(ct: ClassTime):
    return {
        "id": ct.id,
        "schoolId": ct.school_id,
        "classroomId": ct.classroom_id,
        "subjectId": ct.subject_id,
        "teacherId": ct.teacher_id,
        "startTime": ct.start_time,
        "endTime": ct.end_time,
        "startTimeLabel": minutes_to_hhmm(ct.start_time),
        "endTimeLabel": minutes_to_hhmm(ct.end_time),
        "dayOfWeek": ct.day_of_week,
        "createdAt": ct.created_at.isoformat() if ct.created_at else None,
    }


# ---------- BreakTime ----------
@router.post("/api/v1/timetable/break-times", status_code=201)
def create_break_time(payload: BreakTimeCreate, db: Session = Depends(get_db)):
    if payload.startTime >= payload.endTime:
        raise HTTPException(400, "startTime must be before endTime")
    school = resolve_school(payload.schoolId)
    check_break_overlap(db, school, payload.dayOfWeek, payload.startTime, payload.endTime)
    bt = BreakTime(school_id=school, start_time=payload.startTime, end_time=payload.endTime, day_of_week=payload.dayOfWeek)
    db.add(bt)
    db.commit()
    db.refresh(bt)
    return {"id": bt.id, "data": _serialize_break_time(bt)}


@router.get("/api/v1/timetable/break-times")
def list_break_times(schoolId: Optional[str] = None, db: Session = Depends(get_db)):
    school = resolve_school(schoolId)
    items = db.execute(select(BreakTime).where(BreakTime.school_id == school).order_by(BreakTime.day_of_week, BreakTime.start_time)).scalars().all()
    return {"data": [_serialize_break_time(x) for x in items]}


@router.get("/api/v1/timetable/break-times/{bt_id}")
def get_break_time(bt_id: str, db: Session = Depends(get_db)):
    bt = db.get(BreakTime, bt_id)
    if not bt:
        raise HTTPException(404, "break_time not found")
    return {"data": _serialize_break_time(bt)}


@router.patch("/api/v1/timetable/break-times/{bt_id}")
def update_break_time(bt_id: str, payload: BreakTimeUpdate, db: Session = Depends(get_db)):
    bt = db.get(BreakTime, bt_id)
    if not bt:
        raise HTTPException(404, "break_time not found")
    if payload.startTime >= payload.endTime:
        raise HTTPException(400, "startTime must be before endTime")
    check_break_overlap(db, bt.school_id, payload.dayOfWeek, payload.startTime, payload.endTime, exclude_id=bt_id)
    bt.start_time = payload.startTime
    bt.end_time = payload.endTime
    bt.day_of_week = payload.dayOfWeek
    db.commit()
    return {"data": _serialize_break_time(bt)}


@router.delete("/api/v1/timetable/break-times/{bt_id}", status_code=204)
def delete_break_time(bt_id: str, db: Session = Depends(get_db)):
    bt = db.get(BreakTime, bt_id)
    if not bt:
        raise HTTPException(404, "not found")
    db.delete(bt)
    db.commit()
    return None


def _serialize_break_time(bt: BreakTime):
    return {"id": bt.id, "schoolId": bt.school_id, "startTime": bt.start_time, "endTime": bt.end_time, "startTimeLabel": minutes_to_hhmm(bt.start_time), "endTimeLabel": minutes_to_hhmm(bt.end_time), "dayOfWeek": bt.day_of_week}


# ---------- Holiday ----------
@router.post("/api/v1/timetable/holidays", status_code=201)
def create_holiday(payload: HolidayCreate, db: Session = Depends(get_db)):
    if payload.startAt > payload.endAt:
        raise HTTPException(400, "startAt must be <= endAt")
    school = resolve_school(payload.schoolId)
    h = Holiday(school_id=school, name=payload.name, start_at=payload.startAt, end_at=payload.endAt, type=payload.type)
    db.add(h)
    db.commit()
    db.refresh(h)
    return {"id": h.id, "data": _serialize_holiday(h)}


@router.get("/api/v1/timetable/holidays")
def list_holidays(schoolId: Optional[str] = None, db: Session = Depends(get_db)):
    school = resolve_school(schoolId)
    items = db.execute(select(Holiday).where(Holiday.school_id == school).order_by(Holiday.start_at)).scalars().all()
    return {"data": [_serialize_holiday(x) for x in items]}


@router.get("/api/v1/timetable/holidays/{hid}")
def get_holiday(hid: str, db: Session = Depends(get_db)):
    h = db.get(Holiday, hid)
    if not h:
        raise HTTPException(404, "holiday not found")
    return {"data": _serialize_holiday(h)}


@router.patch("/api/v1/timetable/holidays/{hid}")
def update_holiday(hid: str, payload: HolidayUpdate, db: Session = Depends(get_db)):
    h = db.get(Holiday, hid)
    if not h:
        raise HTTPException(404, "not found")
    h.name = payload.name
    h.start_at = payload.startAt
    h.end_at = payload.endAt
    h.type = payload.type
    db.commit()
    return {"data": _serialize_holiday(h)}


@router.delete("/api/v1/timetable/holidays/{hid}", status_code=204)
def delete_holiday(hid: str, db: Session = Depends(get_db)):
    h = db.get(Holiday, hid)
    if not h:
        raise HTTPException(404, "not found")
    db.delete(h)
    db.commit()
    return None


def _serialize_holiday(h: Holiday):
    return {"id": h.id, "schoolId": h.school_id, "name": h.name, "startAt": h.start_at.isoformat(), "endAt": h.end_at.isoformat(), "type": h.type}


# ---------- HolidayClassroom ----------
@router.post("/api/v1/timetable/holiday-classrooms", status_code=201)
def create_holiday_classroom(payload: HolidayClassroomCreate, db: Session = Depends(get_db)):
    school = resolve_school(payload.schoolId)
    # verify holiday exists
    if not db.get(Holiday, payload.holidayId):
        raise HTTPException(404, "holiday not found")
    hc = HolidayClassroom(school_id=school, holiday_id=payload.holidayId, classroom_id=payload.classroomId)
    db.add(hc)
    db.commit()
    db.refresh(hc)
    return {"id": hc.id}


@router.get("/api/v1/timetable/holiday-classrooms")
def list_holiday_classrooms(holidayId: Optional[str] = None, classroomId: Optional[str] = None, db: Session = Depends(get_db)):
    q = select(HolidayClassroom)
    if holidayId:
        q = q.where(HolidayClassroom.holiday_id == holidayId)
    if classroomId:
        q = q.where(HolidayClassroom.classroom_id == classroomId)
    items = db.execute(q).scalars().all()
    return {"data": [{"id": x.id, "holidayId": x.holiday_id, "classroomId": x.classroom_id} for x in items]}


@router.delete("/api/v1/timetable/holiday-classrooms/{hc_id}", status_code=204)
def delete_holiday_classroom(hc_id: str, db: Session = Depends(get_db)):
    hc = db.get(HolidayClassroom, hc_id)
    if not hc:
        raise HTTPException(404, "not found")
    db.delete(hc)
    db.commit()
    return None


# ---------- Occurrences ----------
@router.patch("/api/v1/timetable/class-times/{ct_id}/occurrences/{occ_date}/move")
def move_occurrence(ct_id: str, occ_date: date, payload: OccurrenceMove, db: Session = Depends(get_db)):
    ct = db.get(ClassTime, ct_id)
    if not ct:
        raise HTTPException(404, "class_time not found")
    if payload.startTime >= payload.endTime:
        raise HTTPException(400, "startTime < endTime")
    occ = db.execute(select(ClassTimeOccurrence).where(ClassTimeOccurrence.class_time_id == ct_id, ClassTimeOccurrence.occurrence_date == occ_date)).scalar_one_or_none()
    if occ:
        occ.status = "moved"
        occ.start_time = payload.startTime
        occ.end_time = payload.endTime
        occ.day_of_week = payload.dayOfWeek
    else:
        occ = ClassTimeOccurrence(school_id=ct.school_id, class_time_id=ct_id, occurrence_date=occ_date, status="moved", start_time=payload.startTime, end_time=payload.endTime, day_of_week=payload.dayOfWeek)
        db.add(occ)
    db.commit()
    return {"status": "moved"}


@router.patch("/api/v1/timetable/class-times/{ct_id}/occurrences/{occ_date}/cancel")
def cancel_occurrence(ct_id: str, occ_date: date, payload: OccurrenceCancel, db: Session = Depends(get_db)):
    ct = db.get(ClassTime, ct_id)
    if not ct:
        raise HTTPException(404, "class_time not found")
    occ = db.execute(select(ClassTimeOccurrence).where(ClassTimeOccurrence.class_time_id == ct_id, ClassTimeOccurrence.occurrence_date == occ_date)).scalar_one_or_none()
    if occ:
        occ.status = "cancelled"
        occ.reason = payload.reason
        occ.start_time = None
        occ.end_time = None
        occ.day_of_week = None
    else:
        occ = ClassTimeOccurrence(school_id=ct.school_id, class_time_id=ct_id, occurrence_date=occ_date, status="cancelled", reason=payload.reason)
        db.add(occ)
    db.commit()
    return {"status": "cancelled"}


@router.delete("/api/v1/timetable/class-times/{ct_id}/occurrences/{occ_date}")
def delete_occurrence(ct_id: str, occ_date: date, reason: Optional[str] = None, db: Session = Depends(get_db)):
    ct = db.get(ClassTime, ct_id)
    if not ct:
        raise HTTPException(404, "class_time not found")
    occ = db.execute(select(ClassTimeOccurrence).where(ClassTimeOccurrence.class_time_id == ct_id, ClassTimeOccurrence.occurrence_date == occ_date)).scalar_one_or_none()
    if occ:
        occ.status = "deleted"
        occ.reason = reason
    else:
        occ = ClassTimeOccurrence(school_id=ct.school_id, class_time_id=ct_id, occurrence_date=occ_date, status="deleted", reason=reason)
        db.add(occ)
    db.commit()
    return {"status": "deleted"}


@router.patch("/api/v1/timetable/class-times/{ct_id}/occurrences/{occ_date}/restore")
def restore_occurrence(ct_id: str, occ_date: date, db: Session = Depends(get_db)):
    occ = db.execute(select(ClassTimeOccurrence).where(ClassTimeOccurrence.class_time_id == ct_id, ClassTimeOccurrence.occurrence_date == occ_date)).scalar_one_or_none()
    if not occ:
        raise HTTPException(404, "occurrence not found")
    db.delete(occ)
    db.commit()
    return {"status": "restored"}


# ---------- Timetable generation (ported from ClassroomTimetableDbalService.php) ----------
@router.get("/api/v1/timetable/classroom/{classroom_id}/simulate")
def simulate_classroom(
    classroom_id: str,
    subjectId: Optional[str] = None,
    teacherId: Optional[str] = None,
    schoolId: Optional[str] = Query(None),
    weeks: int = Query(12, ge=1, le=52, description="number of weeks to generate from today"),
    db: Session = Depends(get_db),
):
    school = resolve_school(schoolId)
    q = select(ClassTime).where(ClassTime.classroom_id == classroom_id, ClassTime.school_id == school)
    if subjectId:
        q = q.where(ClassTime.subject_id == subjectId)
    if teacherId:
        q = q.where(ClassTime.teacher_id == teacherId)
    class_times = db.execute(q.order_by(ClassTime.day_of_week, ClassTime.start_time)).scalars().all()
    if not class_times:
        return {"data": {"classroomId": classroom_id, "weeks": []}}

    break_times = db.execute(select(BreakTime).where(BreakTime.school_id == school)).scalars().all()

    # holidays for this classroom (linked + global all_class, cf. _holidays_for_classroom)
    holidays = _holidays_for_classroom(db, school, classroom_id)

    # build date range
    today = date.today()
    # start on Monday
    start = today - timedelta(days=today.weekday())
    end = start + timedelta(weeks=weeks) - timedelta(days=1)

    # occurrences map
    ct_ids = [ct.id for ct in class_times]
    occ_rows = db.execute(select(ClassTimeOccurrence).where(ClassTimeOccurrence.class_time_id.in_(ct_ids), ClassTimeOccurrence.occurrence_date.between(start, end))).scalars().all() if ct_ids else []
    occ_map = {f"{o.class_time_id}|{o.occurrence_date.isoformat()}": o for o in occ_rows}

    weeks_data = []
    cursor = start
    week_start = None
    days = []
    while cursor <= end:
        dow = cursor.isoweekday()  # 1=Mon
        if week_start is None:
            week_start = cursor
        d_str = cursor.isoformat()
        holiday = _find_holiday(holidays, cursor)
        slots = []
        for ct in class_times:
            if ct.day_of_week != dow:
                continue
            key = f"{ct.id}|{d_str}"
            occ = occ_map.get(key)
            slot = _build_slot(ct, occ, holiday)
            if slot:
                slots.append(slot)
        for bt in break_times:
            if bt.day_of_week == dow:
                slots.append({"type": "break", "startTime": bt.start_time, "endTime": bt.end_time, "startTimeLabel": minutes_to_hhmm(bt.start_time), "endTimeLabel": minutes_to_hhmm(bt.end_time)})
        slots.sort(key=lambda s: s["startTime"])
        days.append({"date": d_str, "dayOfWeek": dow, "slots": slots})
        if dow == 7 or cursor == end:
            weeks_data.append({"weekStart": week_start.isoformat(), "days": days})
            week_start = None
            days = []
        cursor += timedelta(days=1)

    return {"data": {"classroomId": classroom_id, "classroomName": classroom_id, "weeks": weeks_data}}


@router.get("/api/v1/timetable/teacher/{teacher_id}/simulate")
def simulate_teacher(
    teacher_id: str,
    subjectId: Optional[str] = None,
    schoolId: Optional[str] = Query(None),
    weeks: int = Query(12, ge=1, le=52),
    db: Session = Depends(get_db),
):
    school = resolve_school(schoolId)
    q = select(ClassTime).where(ClassTime.teacher_id == teacher_id, ClassTime.school_id == school)
    if subjectId:
        q = q.where(ClassTime.subject_id == subjectId)
    class_times = db.execute(q.order_by(ClassTime.day_of_week, ClassTime.start_time)).scalars().all()
    if not class_times:
        return {"data": {"teacherId": teacher_id, "classrooms": []}}
    # group by classroom
    from collections import defaultdict
    grouped = defaultdict(list)
    for ct in class_times:
        grouped[ct.classroom_id].append(ct)

    result = []
    for cr_id, cr_times in grouped.items():
        # reuse classroom simulate logic per classroom
        # quick delegate to simulate_classroom but filtered to this teacher's slots only
        # holidays for cr (linked + global all_class)
        holidays = _holidays_for_classroom(db, school, cr_id)
        break_times = db.execute(select(BreakTime).where(BreakTime.school_id == school)).scalars().all()
        ct_ids = [ct.id for ct in cr_times]
        today = date.today()
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(weeks=weeks) - timedelta(days=1)
        occ_rows = db.execute(select(ClassTimeOccurrence).where(ClassTimeOccurrence.class_time_id.in_(ct_ids), ClassTimeOccurrence.occurrence_date.between(start, end))).scalars().all() if ct_ids else []
        occ_map = {f"{o.class_time_id}|{o.occurrence_date.isoformat()}": o for o in occ_rows}
        weeks_data = []
        cursor = start
        week_start = None
        days = []
        while cursor <= end:
            dow = cursor.isoweekday()
            if week_start is None:
                week_start = cursor
            d_str = cursor.isoformat()
            holiday = _find_holiday(holidays, cursor)
            slots = []
            for ct in cr_times:
                if ct.day_of_week != dow:
                    continue
                slot = _build_slot(ct, occ_map.get(f"{ct.id}|{d_str}"), holiday)
                if slot:
                    slots.append(slot)
            for bt in break_times:
                if bt.day_of_week == dow:
                    slots.append({"type": "break", "startTime": bt.start_time, "endTime": bt.end_time, "startTimeLabel": minutes_to_hhmm(bt.start_time), "endTimeLabel": minutes_to_hhmm(bt.end_time)})
            slots.sort(key=lambda s: s["startTime"])
            days.append({"date": d_str, "dayOfWeek": dow, "slots": slots})
            if dow == 7 or cursor == end:
                weeks_data.append({"weekStart": week_start.isoformat(), "days": days})
                week_start = None
                days = []
            cursor += timedelta(days=1)
        result.append({"classroomId": cr_id, "weeks": weeks_data})
    return {"data": {"teacherId": teacher_id, "classrooms": result}}


# ---------- Seed defaults (ported from wyscolars SessionCreateEventListener) ----------
@router.post("/api/v1/timetable/seed-defaults", status_code=201)
def seed_defaults(schoolId: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Create default breaks (10:00-10:15, 12:00-13:00, 15:00-15:15 Mon-Fri)
    and default holidays when none exist — same as wyscolars session-create listener."""
    school = resolve_school(schoolId)
    created = {"breaks": 0, "holidays": 0}
    existing_breaks = db.execute(select(BreakTime).where(BreakTime.school_id == school)).scalars().all()
    if not existing_breaks:
        defaults = [(600, 615), (720, 780), (900, 915)]  # 10:00, 12:00, 15:00
        for dow in range(1, 6):
            for s, e in defaults:
                db.add(BreakTime(school_id=school, start_time=s, end_time=e, day_of_week=dow))
                created["breaks"] += 1
    existing_holidays = db.execute(select(Holiday).where(Holiday.school_id == school)).scalars().all()
    if not existing_holidays:
        year = date.today().year
        for name, s, e in [
            ("Vacances de Noel", date(year, 12, 20), date(year + 1, 1, 5)),
            ("Conge de Paques", date(year, 4, 5), date(year, 4, 20)),
            ("Grandes vacances", date(year, 7, 5), date(year, 9, 1)),
        ]:
            db.add(Holiday(school_id=school, name=name, start_at=s, end_at=e, type="all_class"))
            created["holidays"] += 1
    db.commit()
    return {"data": created}


# ---------- Print pivot (ported from wyscolars print/classroom_timetable) ----------
@router.get("/api/v1/timetable/classroom/{classroom_id}/print")
def print_classroom_timetable(
    classroom_id: str,
    schoolId: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Pivot ClassTimes into {time: 'HH:MM - HH:MM', days: {1..6: slot}} for printing."""
    school = resolve_school(schoolId)
    class_times = db.execute(
        select(ClassTime).where(ClassTime.classroom_id == classroom_id, ClassTime.school_id == school).order_by(ClassTime.start_time)
    ).scalars().all()
    rows: dict[str, dict] = {}
    for ct in class_times:
        key = f"{minutes_to_hhmm(ct.start_time)} - {minutes_to_hhmm(ct.end_time)}"
        rows.setdefault(key, {"time": key, "days": {}})
        rows[key]["days"][ct.day_of_week] = _serialize_class_time(ct)
    return {"data": {"classroomId": classroom_id, "rows": list(rows.values())}}


def _find_holiday(holidays, cur: date):
    for h in holidays:
        if h.start_at <= cur <= h.end_at:
            return h
    return None


def _build_slot(ct: ClassTime, occ: Optional[ClassTimeOccurrence], holiday):
    slot = {
        "type": "class",
        "classTimeId": ct.id,
        "classroomId": ct.classroom_id,
        "subject": ct.subject_id,
        "subjectId": ct.subject_id,
        "teacher": ct.teacher_id,
        "teacherId": ct.teacher_id,
        "startTime": ct.start_time,
        "endTime": ct.end_time,
        "startTimeLabel": minutes_to_hhmm(ct.start_time),
        "endTimeLabel": minutes_to_hhmm(ct.end_time),
        "dayOfWeek": ct.day_of_week,
        "status": "scheduled",
    }
    if holiday:
        slot["status"] = "holiday"
        slot["holidayName"] = holiday.name
        return slot
    if occ is None:
        return slot
    if occ.status == "deleted":
        return None
    slot["status"] = occ.status
    if occ.status == "moved":
        slot["originalStartTime"] = slot["startTime"]
        slot["originalEndTime"] = slot["endTime"]
        slot["startTime"] = occ.start_time
        slot["endTime"] = occ.end_time
        slot["startTimeLabel"] = minutes_to_hhmm(occ.start_time or 0)
        slot["endTimeLabel"] = minutes_to_hhmm(occ.end_time or 0)
    if occ.status == "cancelled" and occ.reason:
        slot["reason"] = occ.reason
    return slot
