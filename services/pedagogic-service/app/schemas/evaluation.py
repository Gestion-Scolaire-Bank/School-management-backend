from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class EvaluationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    class_id: str = Field(min_length=1, max_length=100)
    subject_id: str = Field(min_length=1, max_length=100)
    teacher_id: str = Field(min_length=1, max_length=100)
    evaluation_type: str = Field(min_length=1, max_length=50)
    max_score: float = Field(default=20.0, gt=0)
    weight: float = Field(default=1.0, gt=0)
    evaluation_date: date


class EvaluationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    class_id: str
    subject_id: str
    subject_name: str
    teacher_id: str
    evaluation_type: str
    max_score: float
    weight: float
    evaluation_date: date
    created_at: datetime
