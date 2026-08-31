from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class GradeCreate(BaseModel):
    student_id: str = Field(min_length=1, max_length=100)
    class_id: str = Field(min_length=1, max_length=100)
    period: str = Field(min_length=1, max_length=50)
    subject_id: str = Field(min_length=1, max_length=100)
    evaluation_id: Optional[str] = None
    score: float = Field(ge=0)
    max_score: float = Field(default=20.0, gt=0)
    weight: float = Field(default=1.0, gt=0)

    @model_validator(mode="after")
    def check_score_within_bounds(self):
        if self.score > self.max_score:
            raise ValueError("score ne peut pas depasser max_score")
        return self


class GradeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    student_id: str
    class_id: str
    period: str
    subject_id: str
    subject_name: str
    evaluation_id: Optional[str] = None
    score: float
    max_score: float
    weight: float
    teacher_id: Optional[str] = None
    created_at: datetime
