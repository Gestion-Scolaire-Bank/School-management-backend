from datetime import datetime, date, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TimetableEntryCreate(BaseModel):
    class_id: str = Field(min_length=1, max_length=100)
    subject_id: str = Field(min_length=1, max_length=100)
    teacher_id: str = Field(min_length=1, max_length=100)
    day_of_week: str = Field(min_length=1, max_length=20)
    start_time: time
    end_time: time
    room: Optional[str] = None


class TimetableEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    class_id: str
    subject_id: str
    subject_name: str
    teacher_id: str
    day_of_week: str
    start_time: time
    end_time: time
    room: Optional[str] = None
    created_at: datetime
