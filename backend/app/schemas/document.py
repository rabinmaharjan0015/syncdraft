import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class DocumentCreate(BaseModel):
    title: str = Field(default="Untitled document", min_length=1, max_length=200)

class DocumentUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    owner_id: uuid.UUID
    role: str
    schema_version: int
    created_at: datetime
    updated_at: datetime
