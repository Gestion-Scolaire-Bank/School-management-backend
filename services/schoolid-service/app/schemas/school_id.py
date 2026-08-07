from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class GenerateCardRequest(BaseModel):
    student_id: str = Field(min_length=1, max_length=100)
    full_name: str = Field(min_length=1, max_length=255)
    class_name: Optional[str] = Field(default=None, max_length=50)
    date_of_birth: Optional[date] = None
    photo_url: Optional[str] = Field(default=None, max_length=1000)


class SchoolIdCardResponse(BaseModel):
    id: str
    student_id: str
    card_number: str
    full_name: str
    class_name: Optional[str] = None
    status: str
    version: int
    issued_at: datetime
    expires_at: date
    download_url: str
