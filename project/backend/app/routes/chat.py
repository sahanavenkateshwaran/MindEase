from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from datetime import datetime
from bson import ObjectId
from app.auth import get_current_user
from app.database import get_collection
from app.models.chat import ChatInput, ChatMessage
from app.services.groq_service import groq_service, contains_crisis_language
from app.services.recommendation_engine import recommendation_engine
from app.services.mood_state_service import record_current_mood, is_explicit_mood_check_in


def normalize_emotion(emotion: str) -> str:
    if not emotion:
        return "Neutral"
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
    return mapped if mapped in valid else "Neutral"


router = APIRouter(prefix="/chat", tags=["AI Chatbot"])

@router.get("/history")
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    chats_collection = get_collection("chats")
    session = await chats_collection.find_one({"user_id": current_user["id"]})
    if not session:
        return {"messages": []}
    
    # Serialize ObjectId and timestamps
    messages = []
    for msg in session.get("messages", []):
        messages.append({
            "sender": msg["sender"],
            "text": msg["text"],
            "emotion": msg.get("emotion"),
            "timestamp": msg["timestamp"].isoformat() if isinstance(msg["timestamp"], datetime) else msg["timestamp"]
        })
    return {"messages": messages}

@router.post("/message")
async def send_chat_message(chat_input: ChatInput, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    text = chat_input.text
    
    # 1. Analyze text emotion
    emotion = normalize_emotion(await groq_service.analyze_text_emotion(text))
    
    # Log emotion in history
    emotions_collection = get_collection("emotion_history")
    await emotions_collection.insert_one({
        "user_id": user_id,
        "source": "text",
        "emotion": emotion,
        "confidence": 1.0,
        "timestamp": datetime.utcnow()
    })
    if is_explicit_mood_check_in(text, emotion):
        await record_current_mood(user_id, emotion, "chat", 1.0, confirmed=False)
    
    # 2. Get conversation history
    chats_collection = get_collection("chats")
    session = await chats_collection.find_one({"user_id": user_id})
    
    db_messages = []
    if session:
        db_messages = session.get("messages", [])
    
    # Map messages to system model format
    history_for_llm = []
    for m in db_messages:
        role = "user" if m["sender"] == "user" else "assistant"
        history_for_llm.append({"role": role, "content": m["text"]})
        
    history_for_llm.append({"role": "user", "content": text})
    
    # 3. Get empathetic response from Groq Llama 3
    try:
        reply = await groq_service.get_empathetic_chat_response(history_for_llm, emotion)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    
    # 4. Check for emergency trigger
    emergency_warning = False
    if emotion == "Depression Indicator" or contains_crisis_language(text):
        emergency_warning = True

    # 5. Save user & AI messages to database
    user_msg = {
        "sender": "user",
        "text": text,
        "emotion": emotion,
        "timestamp": datetime.utcnow()
    }
    ai_msg = {
        "sender": "ai",
        "text": reply,
        "emotion": None,
        "timestamp": datetime.utcnow()
    }
    
    if session:
        await chats_collection.update_one(
            {"user_id": user_id},
            {
                "$push": {"messages": {"$each": [user_msg, ai_msg]}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    else:
        await chats_collection.insert_one({
            "user_id": user_id,
            "messages": [user_msg, ai_msg],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
    # 6. Generate Personalized Wellness recommendations based on this emotion
    # Runs engine to suggest meditation, stretch, songs, videos etc.
    wellness_session = await recommendation_engine.generate_wellness_session(user_id, emotion)

    # 7. Update wellness aggregation history for dashboard charts
    mood_collection = get_collection("mood_history")
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    stress_mapping = {
        "Happy": 10.0,
        "Neutral": 30.0,
        "Stress": 75.0,
        "Anxiety": 65.0,
        "Fear": 60.0,
        "Sad": 50.0,
        "Angry": 70.0,
        "Depression Indicator": 90.0
    }
    stress_level = stress_mapping.get(emotion, 40.0)
    wellness_score = 100.0 - stress_level
    
    await mood_collection.update_one(
        {"user_id": user_id, "date": today_str},
        {
            "$set": {
                "dominant_emotion": emotion,
                "average_stress": stress_level,
                "average_wellness": wellness_score,
                "timestamp": datetime.utcnow(),
                "meditation_minutes": 0,
                "exercise_minutes": 0,
            },
            "$setOnInsert": {
                "breathing_minutes": 0,
                "relaxation_sessions": 0,
            }
        },
        upsert=True
    )
    
    return {
        "reply": reply,
        "emotion": emotion,
        "emergency_warning": emergency_warning,
        "recommendations": wellness_session
    }
