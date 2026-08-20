from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ChatMessage(BaseModel):
    sender: str  # "user" or "ai"
    text: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    emotion: Optional[str] = None # text emotion analysis for this specific turn

class ChatSession(BaseModel):
    user_id: str
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ChatInput(BaseModel):
    text: str
