from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from bson import ObjectId
from app.auth import get_current_therapist
from app.database import get_collection

router = APIRouter(prefix="/therapist", tags=["Therapist Portal"])

@router.get("/patients")
async def get_patients(current_therapist: dict = Depends(get_current_therapist)):
    users_coll = get_collection("users")
    # Fetch all standard users
    cursor = users_coll.find({"role": "user"})
    patients = []
    async for patient in cursor:
        patients.append({
            "id": str(patient["_id"]),
            "name": patient["name"],
            "email": patient["email"],
            "age": patient["age"],
            "gender": patient["gender"],
            "emergency_contact": patient["emergency_contact"]
        })
    return patients

@router.get("/patient/{patient_id}/report")
async def get_patient_report(patient_id: str, current_therapist: dict = Depends(get_current_therapist)):
    users_coll = get_collection("users")
    patient = await users_coll.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Fetch emotion trends
    emotions_coll = get_collection("emotion_history")
    emotions_cursor = emotions_coll.find({"user_id": patient_id}).sort("timestamp", -1).limit(50)
    emotions_history = []
    async for item in emotions_cursor:
        emotions_history.append({
            "source": item.get("source"),
            "emotion": item.get("emotion"),
            "timestamp": item["timestamp"].isoformat()
        })
        
    # Fetch mood reports
    mood_coll = get_collection("mood_history")
    mood_cursor = mood_coll.find({"user_id": patient_id}).sort("date", -1).limit(30)
    mood_reports = []
    async for item in mood_cursor:
        mood_reports.append({
            "date": item["date"],
            "average_stress": item.get("average_stress", 40),
            "average_wellness": item.get("average_wellness", 60),
            "dominant_emotion": item.get("dominant_emotion", "Neutral")
        })
        
    # Fetch journal summaries
    journals_coll = get_collection("journals")
    journals_cursor = journals_coll.find({"user_id": patient_id}).sort("created_at", -1).limit(20)
    journals_history = []
    async for item in journals_cursor:
        journals_history.append({
            "text": item["text"],
            "summary": item["summary"],
            "emotion": item["emotion"],
            "insights": item.get("insights", []),
            "created_at": item["created_at"].isoformat()
        })
        
    # Fetch latest webcam video behavior logs
    behavior_coll = get_collection("behavior_history")
    behavior_cursor = behavior_coll.find({"user_id": patient_id}).sort("timestamp", -1).limit(30)
    behavior_history = []
    async for item in behavior_cursor:
        behavior_history.append({
            "sleeping": item.get("sleeping", False),
            "yawning": item.get("yawning", False),
            "frequent_blinking": item.get("frequent_blinking", False),
            "looking_away": item.get("looking_away", False),
            "head_down": item.get("head_down", False),
            "poor_posture": item.get("poor_posture", False),
            "eye_contact": item.get("eye_contact", True),
            "concentration_score": item.get("concentration_score", 0.0),
            "fatigue_score": item.get("fatigue_score", 0.0),
            "timestamp": item["timestamp"].isoformat()
        })

    # Fetch voice acoustic logs
    voice_coll = get_collection("voice_history")
    voice_cursor = voice_coll.find({"user_id": patient_id}).sort("timestamp", -1).limit(30)
    voice_history = []
    async for item in voice_cursor:
        voice_history.append({
            "pitch": item.get("pitch", 0.0),
            "energy": item.get("energy", 0.0),
            "speaking_speed": item.get("speaking_speed", 0.0),
            "volume": item.get("volume", 0.0),
            "detected_emotion": item.get("detected_emotion", "Neutral"),
            "timestamp": item["timestamp"].isoformat()
        })

    return {
        "patient": {
            "id": str(patient["_id"]),
            "name": patient["name"],
            "email": patient["email"],
            "age": patient["age"],
            "gender": patient["gender"],
            "emergency_contact": patient["emergency_contact"]
        },
        "emotions_history": emotions_history,
        "mood_reports": mood_reports,
        "journals_history": journals_history,
        "behavior_history": behavior_history,
        "voice_history": voice_history
    }
