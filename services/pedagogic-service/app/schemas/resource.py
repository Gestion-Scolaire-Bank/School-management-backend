from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ResourceType(str, Enum):
    DOCUMENT = "DOCUMENT"
    VIDEO = "VIDEO"
    LESSON_PLAN = "LESSON_PLAN"
    EVALUATION = "EVALUATION"


class ResourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: Optional[str] = None
    resource_type: str
    class_id: Optional[str] = None
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    file_name: str
    file_url: str
    content_type: str
    size_bytes: int
    uploaded_by: Optional[str] = None
    created_at: datetime
