from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime
from app.auth import get_current_user
from app.database import get_collection
from app.services.video_service import video_service
from app.services.mood_state_service import record_current_mood


def normalize_emotion(emotion: str) -> str:
    if not emotion:
        return "Neutral"
    cleaned = str(emotion).strip()
    normalized = {
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
    return normalized if normalized in valid else "Neutral"


router = APIRouter(prefix="/video", tags=["Webcam Video Analysis"])

class VideoFrameInput(BaseModel):
    frame: str # Base64 encoded JPEG/PNG frame

@router.post("/analyze-frame")
async def analyze_video_frame(input_data: VideoFrameInput, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") or current_user.get("_id") or "demo-user"
    frame_data = input_data.frame
    
    # 1. Analyze webcam frame
    analysis = await video_service.analyze_frame(user_id, frame_data)
    detected_emotion = normalize_emotion(analysis["detected_emotion"])
    behavior = analysis["behavior"]
    
    # 2. Write history to MongoDB
    # Write Video Emotion History
    video_history_coll = get_collection("video_history")
    await video_history_coll.insert_one({
        "user_id": user_id,
        "emotion": detected_emotion,
        "timestamp": datetime.utcnow()
    })
    
    # Write Behavior History
    behavior_history_coll = get_collection("behavior_history")
    await behavior_history_coll.insert_one({
        "user_id": user_id,
        "sleeping": behavior["sleeping"],
        "yawning": behavior["yawning"],
        "frequent_blinking": behavior["frequent_blinking"],
        "looking_away": behavior["looking_away"],
        "head_down": behavior["head_down"],
        "restlessness": behavior["restlessness"],
        "poor_posture": behavior["poor_posture"],
        "hand_on_face": behavior["hand_on_face"],
        "eye_contact": behavior["eye_contact"],
        "concentration_score": behavior["concentration_score"],
        "fatigue_score": behavior["fatigue_score"],
        "timestamp": datetime.utcnow()
    })
    
    # Write global emotion log (source="face")
    emotions_coll = get_collection("emotion_history")
    await emotions_coll.insert_one({
        "user_id": user_id,
        "source": "face",
        "emotion": detected_emotion,
        "confidence": 0.9,
        "timestamp": datetime.utcnow()
    })
    await record_current_mood(
        user_id,
        detected_emotion,
        "video",
        analysis["confidence"],
        stable=bool(analysis.get("stable", False)),
    )
    
    # 3. Dynamic adjustment of today's mood aggregation
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    mood_coll = get_collection("mood_history")
    
    stress_mapping = {
        "Happy": 10.0,
        "Neutral": 30.0,
        "Stress": 75.0,
        "Anxiety": 65.0,
        "Fear": 60.0,
        "Sad": 50.0,
        "Angry": 70.0
    }
    
    stress_val = stress_mapping.get(detected_emotion, 40.0)
    wellness_val = 100.0 - stress_val
    
    # Upsert a daily log
    await mood_coll.update_one(
        {"user_id": user_id, "date": today_str},
        {
            "$set": {
                "dominant_emotion": detected_emotion,
                "average_stress": stress_val,
                "average_wellness": wellness_val,
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
        "emotion": detected_emotion,
        "confidence": analysis["confidence"],
        "stable": bool(analysis.get("stable", False)),
        "behavior": behavior
    }
