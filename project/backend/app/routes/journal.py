from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime
from app.auth import get_current_user
from app.database import get_collection
from app.models.journal import JournalCreate
from app.services.mood_state_service import record_current_mood
from app.services.groq_service import groq_service


def normalize_emotion(emotion: str) -> str | None:
    if not emotion:
        return None
    cleaned = str(emotion).strip()
    mapped = {
        "joy": "Happy",
        "happy": "Happy",
        "sad": "Sad",
        "angry": "Angry",
        "neutral": "Neutral",
        "fear": "Fear",
        "surprise": "Surprise",
        "anxiety": "Anxiety",
        "stress": "Stress",
        "depression indicator": "Depression Indicator",
    }.get(cleaned.lower(), cleaned)
    valid = {"Happy", "Joy", "Sad", "Angry", "Neutral", "Fear", "Surprise", "Anxiety", "Stress", "Depression Indicator"}
    return mapped if mapped in valid else None


router = APIRouter(prefix="/journal", tags=["AI Journal"])

@router.post("/create")
async def create_journal_entry(entry: JournalCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    text = entry.text
    
    # 1. Groq analysis
    summary, insights, emotion = await groq_service.summarize_and_analyze_journal(text)
    analyzed_emotion = normalize_emotion(emotion)
    
    # 2. Log journal entry
    journals_collection = get_collection("journals")
    new_entry = {
        "user_id": user_id,
        "text": text,
        "summary": summary,
        "emotion": analyzed_emotion,
        "insights": insights,
        "created_at": datetime.utcnow()
    }
    result = await journals_collection.insert_one(new_entry)
    
    # 3. Log emotion in history
    emotions_collection = get_collection("emotion_history")
    await emotions_collection.insert_one({
        "user_id": user_id,
        "source": "journal",
        "emotion": analyzed_emotion,
        "confidence": 1.0,
        "timestamp": datetime.utcnow()
    })
    # Only a valid journal analysis may contribute to the shared current mood.
    if analyzed_emotion:
        await record_current_mood(current_user["id"], analyzed_emotion, "journal", 0.8)
    
    new_entry["_id"] = str(result.inserted_id)
    return new_entry

@router.get("/history")
async def get_journal_history(current_user: dict = Depends(get_current_user)):
    journals_collection = get_collection("journals")
    cursor = journals_collection.find({"user_id": current_user["id"]}).sort("created_at", -1)
    
    history = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["created_at"] = doc["created_at"].isoformat()
        history.append(doc)
        
    return history
