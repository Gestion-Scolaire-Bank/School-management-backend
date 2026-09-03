from datetime import date
from typing import Optional
from pydantic import BaseModel, field_validator


class ClassTimeCreate(BaseModel):
    classroomId: str
    subjectId: str
    teacherId: str
    startTime: int  # minutes or will accept HH:MM string and convert
    endTime: int
    dayOfWeek: int
    schoolId: Optional[str] = None

    @field_validator("startTime", "endTime", mode="before")
    @classmethod
    def parse_time(cls, v):
        if isinstance(v, str):
            # "08:00" or "08:00:00" -> minutes
            parts = v.split(":")
            if len(parts) >= 2:
                return int(parts[0]) * 60 + int(parts[1])
            return int(v)
        return v

    @field_validator("dayOfWeek")
    @classmethod
    def validate_dow(cls, v):
        iv = int(v)
        if not 1 <= iv <= 7:
            raise ValueError("dayOfWeek must be 1-7 (Mon=1)")
        return iv


class ClassTimeUpdate(ClassTimeCreate):
    pass


class BreakTimeCreate(BaseModel):
    startTime: int
    endTime: int
    dayOfWeek: int
    schoolId: Optional[str] = None

    @field_validator("startTime", "endTime", mode="before")
    @classmethod
    def parse_time(cls, v):
        if isinstance(v, str):
            parts = v.split(":")
            if len(parts) >= 2:
                return int(parts[0]) * 60 + int(parts[1])
            return int(v)
        return v


class BreakTimeUpdate(BreakTimeCreate):
    pass


class HolidayCreate(BaseModel):
    name: str
    startAt: date
    endAt: date
    type: str = "all_class"
    schoolId: Optional[str] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        if v not in ("all_class", "specific_class"):
            raise ValueError("type must be all_class or specific_class")
        return v


class HolidayUpdate(HolidayCreate):
    pass


class HolidayClassroomCreate(BaseModel):
    holidayId: str
    classroomId: str
    schoolId: Optional[str] = None


class OccurrenceMove(BaseModel):
    startTime: int
    endTime: int
    dayOfWeek: int

    @field_validator("startTime", "endTime", mode="before")
    @classmethod
    def parse_time(cls, v):
        if isinstance(v, str):
            parts = v.split(":")
            if len(parts) >= 2:
                return int(parts[0]) * 60 + int(parts[1])
            return int(v)
        return v


class OccurrenceCancel(BaseModel):
    reason: Optional[str] = None
