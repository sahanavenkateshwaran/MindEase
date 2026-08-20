from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class EmotionLog(BaseModel):
    user_id: str
    source: str  # text, voice, face, multimodal
    emotion: str  # Happy, Sad, Fear, Stress, Anxiety, Neutral, Angry, Depression Indicator
    confidence: float = 1.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class VoiceLog(BaseModel):
    user_id: str
    pitch: float
    energy: float
    speaking_speed: float
    volume: float
    detected_emotion: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class VideoLog(BaseModel):
    user_id: str
    emotion: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class BehaviorLog(BaseModel):
    user_id: str
    sleeping: bool = False
    yawning: bool = False
    frequent_blinking: bool = False
    looking_away: bool = False
    head_down: bool = False
    restlessness: bool = False
    poor_posture: bool = False
    hand_on_face: bool = False
    eye_contact: bool = False
    concentration_score: float = 0.0 # 0 to 100
    fatigue_score: float = 0.0 # 0 to 100
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MoodLog(BaseModel):
    user_id: str
    date: str # YYYY-MM-DD
    average_stress: float # 0 to 100
    average_wellness: float # 0 to 100
    dominant_emotion: str
    meditation_minutes: int = 0
    exercise_minutes: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)
