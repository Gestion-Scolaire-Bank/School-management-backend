from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CourseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    class_id: str = Field(min_length=1, max_length=100)
    subject_id: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1)


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    class_id: str
    subject_id: str
    subject_name: str
    content: str
    created_by: Optional[str] = None
    created_at: datetime
