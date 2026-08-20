from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class JournalCreate(BaseModel):
    text: str

class JournalResponse(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    text: str
    summary: str
    emotion: str
    insights: List[str] = []
    created_at: datetime

    class Config:
        populate_by_name = True
