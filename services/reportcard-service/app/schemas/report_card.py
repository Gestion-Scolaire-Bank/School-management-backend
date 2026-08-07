from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GenerateReportCardsRequest(BaseModel):
    class_id: str = Field(min_length=1, max_length=100)
    period: str = Field(min_length=1, max_length=50)


class ReportCardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    student_id: str
    class_id: str
    period: str
    average: float
    rank: int
    class_size: int
    pdf_url: str
    generated_at: datetime


class StudentSummary(BaseModel):
    student_id: str
    student_name: str
    average: float
    rank: int


class ClassSummaryOut(BaseModel):
    class_id: str
    period: str
    student_count: int
    class_average: float
    students: list[StudentSummary]
