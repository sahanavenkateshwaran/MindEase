from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Dict, Any, List
import random
from bson import ObjectId
from app.auth import get_current_user
from app.database import get_collection
from app.services.recommendation_engine import recommendation_engine
from app.services.mood_state_service import record_current_mood, normalize_mood


def serialize_for_json(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): serialize_for_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [serialize_for_json(item) for item in value]
    if isinstance(value, tuple):
        return [serialize_for_json(item) for item in value]
    return value

router = APIRouter(prefix="/dashboard", tags=["Dashboard Core"])


class ManualMoodInput(BaseModel):
    mood: str


class RelaxationActivityInput(BaseModel):
    title: str


class CompleteRelaxationActivityInput(BaseModel):
    activity_id: str

QUOTES = [
    "What lies behind us and what lies before us are tiny matters compared to what lies within us. - Ralph Waldo Emerson",
    "You don't have to control your thoughts. You just have to stop letting them control you. - Dan Millman",
    "Slow down. Calm down. Don't worry. Don't hurry. Trust the process. - Alexandra Stoddard",
    "Healing takes time, and asking for help is a courageous step. - Unknown",
    "Mindfulness isn't difficult, we just need to remember to do it. - Sharon Salzberg",
    "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor. - Thich Nhat Hanh"
]

EMOTION_ICON_MAP = {
    "Happy": "😊",
    "Joy": "😁",
    "Sad": "😢",
    "Angry": "😠",
    "Neutral": "😐",
    "Fear": "😨",
    "Surprise": "😮",
    "Anxiety": "😟",
    "Stress": "😵",
    "Depression Indicator": "💭",
}

EMOTION_STRESS_MAP = {
    "Happy": -12,
    "Joy": -15,
    "Neutral": 0,
    "Sad": 14,
    "Angry": 28,
    "Fear": 24,
    "Surprise": 8,
    "Anxiety": 24,
    "Stress": 30,
    "Depression Indicator": 36,
}


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


def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def build_dashboard_metric_snapshot(
    current_emotion: str,
    stress_level: float,
    previous_stress: float,
    meditation_minutes: int = 0,
    exercise_minutes: int = 0,
    breathing_minutes: int = 0,
    journal_activity: bool = False,
    relaxation_sessions: int = 0,
    wellness_tasks: int = 0,
    recent_moods: List[str] | None = None,
    confidence: float = 0.8,
) -> Dict[str, Any]:
    emotion = (current_emotion or "Neutral").strip() or "Neutral"
    recent = recent_moods or [emotion]
    normalized_recent = [item if item in EMOTION_STRESS_MAP else "Neutral" for item in recent]
    if not normalized_recent:
        normalized_recent = [emotion]

    stress_followup = clamp(stress_level + EMOTION_STRESS_MAP.get(emotion, 0) + (5 if emotion == "Neutral" else 0), 0, 100)
    previous = clamp(float(previous_stress if previous_stress is not None else stress_followup), 0, 100)
    current_stress = clamp(float(stress_followup), 0, 100)
    delta = current_stress - previous
    if delta > 3:
        trend = "↑"
    elif delta < -3:
        trend = "↓"
    else:
        trend = "Stable"

    wellness_score = clamp(
        100 - current_stress
        + (meditation_minutes * 1.3)
        + (exercise_minutes * 0.9)
        + (breathing_minutes * 1.1)
        + (10 if journal_activity else 0)
        + (relaxation_sessions * 6)
        + (wellness_tasks * 2.5),
        0,
        100,
    )

    if wellness_score >= 75:
        status = "Improving"
    elif wellness_score <= 44:
        status = "Decreasing"
    else:
        status = "Stable"

    mood_counts = {}
    for item in normalized_recent:
        mood_counts[item] = mood_counts.get(item, 0) + 1
    most_frequent = max(mood_counts.items(), key=lambda kv: (kv[1], kv[0]))[0] if mood_counts else emotion

    return {
        "current_emotion": emotion,
        "confidence": clamp(float(confidence) * 100, 0, 100),
        "stress_level": round(current_stress, 1),
        "previous_stress": round(previous, 1),
        "trend": trend,
        "wellness_score": round(wellness_score, 1),
        "status": status,
        "most_frequent_mood": most_frequent,
        "mood_icon": EMOTION_ICON_MAP.get(emotion, "😐"),
    }


@router.get("/summary")
async def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") or current_user.get("_id") or "demo-user"
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    # 1. Fetch the single prioritized current-mood record.
    emotions_coll = get_collection("emotion_history")
    current_mood_doc = await get_collection("current_mood").find_one({"user_id": user_id})
    detected_mood = normalize_mood(current_mood_doc.get("mood")) if current_mood_doc else None
    current_emotion = detected_mood or "Neutral"
    latest_emotion_doc = await emotions_coll.find_one({"user_id": user_id}, sort=[("timestamp", -1)])

    # 2. Fetch today's mood aggregation
    mood_coll = get_collection("mood_history")
    today_mood = await mood_coll.find_one({"user_id": user_id, "date": today_str})

    stress_mapping = {
        "Happy": 15,
        "Joy": 12,
        "Neutral": 30,
        "Stress": 75,
        "Anxiety": 60,
        "Fear": 55,
        "Sad": 50,
        "Angry": 70,
        "Surprise": 35,
        "Depression Indicator": 85
    }

    default_stress = stress_mapping.get(current_emotion, 35)
    stress_level = today_mood.get("average_stress", default_stress) if today_mood else default_stress
    wellness_score = today_mood.get("average_wellness", 100 - stress_level) if today_mood else (100 - stress_level)
    meditation_minutes = today_mood.get("meditation_minutes", 0) if today_mood else 0
    exercise_minutes = today_mood.get("exercise_minutes", 0) if today_mood else 0
    breathing_minutes = today_mood.get("breathing_minutes", 0) if today_mood else 0
    relaxation_sessions = today_mood.get("relaxation_sessions", 0) if today_mood else 0
    journal_activity = bool(latest_journal := None)

    stress_level = clamp(max(0.0, stress_level - (meditation_minutes * 0.8) - (exercise_minutes * 0.4)), 0, 100)
    wellness_score = clamp(min(100.0, wellness_score + (meditation_minutes * 1.0) + (exercise_minutes * 0.5)), 0, 100)

    # 3. Fetch weekly mood trends (last 7 days)
    cursor = mood_coll.find({"user_id": user_id}).sort("date", -1).limit(7)
    trend_history = []
    async for doc in cursor:
        trend_history.append({
            "date": doc["date"],
            "stress": doc.get("average_stress", 40),
            "wellness": doc.get("average_wellness", 60),
            "emotion": doc.get("dominant_emotion", "Neutral")
        })
    trend_history.reverse()

    # 4. Fetch latest journal entry
    journals_coll = get_collection("journals")
    latest_journal = await journals_coll.find_one(
        {"user_id": user_id},
        sort=[("created_at", -1)]
    )
    recent_journal_summary = latest_journal["summary"] if latest_journal else "No journal written today. Let's record your thoughts!"
    journal_activity = bool(latest_journal)

    # 5. Fetch the shared mood-event history used by the current-mood card.
    recent_moods = []
    recent_confidence = []
    recent_mood_events = []
    recent_emotion_cursor = get_collection("mood_events").find({"user_id": user_id}).sort("timestamp", -1).limit(6)
    async for mood_doc in recent_emotion_cursor:
        recent_moods.append(mood_doc.get("mood", "Neutral"))
        recent_confidence.append(float(mood_doc.get("confidence", 0.8) or 0.8))
        recent_mood_events.append({
            "mood": mood_doc.get("mood"),
            "source": mood_doc.get("source"),
            "confidence": mood_doc.get("confidence"),
            "confirmed": mood_doc.get("confirmed", False),
            "timestamp": mood_doc.get("timestamp"),
        })
    recent_moods.reverse()
    current_confidence = recent_confidence[0] if recent_confidence else 0.8

    mood_journey = [
        {"type": "mood", "label": event.get("mood"), "source": event.get("source"), "timestamp": event.get("timestamp")}
        for event in reversed(recent_mood_events[:4])
    ]
    recent_activities = get_collection("wellness_activities").find({"user_id": user_id, "completed": True}).sort("completed_at", -1).limit(3)
    async for activity in recent_activities:
        mood_journey.append({
            "type": "activity",
            "label": activity.get("title", "Relaxation activity"),
            "source": "relaxation",
            "timestamp": activity.get("completed_at"),
        })
    mood_journey.sort(key=lambda item: item.get("timestamp") or datetime.min)

    previous_stress = trend_history[-2].get("stress", stress_level) if len(trend_history) > 1 else stress_level
    snapshot = build_dashboard_metric_snapshot(
        current_emotion=current_emotion,
        stress_level=stress_level,
        previous_stress=previous_stress,
        meditation_minutes=meditation_minutes,
        exercise_minutes=exercise_minutes,
        breathing_minutes=breathing_minutes,
        journal_activity=journal_activity,
        relaxation_sessions=relaxation_sessions,
        wellness_tasks=0,
        recent_moods=recent_moods,
        confidence=current_confidence,
    )

    # 6. Fetch recommended sessions
    recs_coll = get_collection("recommendations")
    latest_rec = await recs_coll.find_one(
        {"user_id": user_id, "emotion": current_emotion},
        sort=[("created_at", -1)]
    )
    if not latest_rec:
        latest_rec = await recommendation_engine.generate_wellness_session(user_id, current_emotion)

    # 7. Gamification & Streaks
    streak_count = 0
    all_dates_cursor = mood_coll.find({"user_id": user_id}).sort("date", -1)
    active_days = []
    async for doc in all_dates_cursor:
        if doc.get("meditation_minutes", 0) > 0 or doc.get("exercise_minutes", 0) > 0 or doc.get("relaxation_sessions", 0) > 0:
            active_days.append(doc["date"])
    active_set = set(active_days)
    curr_date = datetime.utcnow()
    while True:
        date_str = curr_date.strftime("%Y-%m-%d")
        if date_str in active_set:
            streak_count += 1
            curr_date -= timedelta(days=1)
        else:
            break

    badges = []
    if streak_count >= 1:
        badges.append({"name": "Self-Care Pioneer", "desc": "Started your first wellness activity", "icon": "emoji_events"})
    if streak_count >= 7:
        badges.append({"name": "Zen Master", "desc": "Logged a 7-day meditation/exercise streak", "icon": "self_improvement"})
    if latest_journal:
        badges.append({"name": "Reflective Mind", "desc": "Wrote your first AI journal reflection", "icon": "edit"})

    heatmap = {"Mon": 1, "Tue": 1, "Wed": 1, "Thu": 1, "Fri": 1, "Sat": 1, "Sun": 1}
    heatmap_cursor = emotions_coll.find({"user_id": user_id})
    async for e_doc in heatmap_cursor:
        ts = e_doc.get("timestamp", datetime.utcnow())
        day_name = ts.strftime("%a")
        if day_name in heatmap:
            heatmap[day_name] += 1

    daily_planner = [
        {"time": "08:00 AM", "task": "🌬 4-4-6 Breathing", "completed": breathing_minutes > 0},
        {"time": "11:30 AM", "task": "💬 AI Check-in", "completed": latest_emotion_doc is not None},
        {"time": "03:00 PM", "task": "🧘 Relaxation", "completed": relaxation_sessions > 0},
        {"time": "08:30 PM", "task": "📓 Journal", "completed": latest_journal is not None}
    ]

    average_confidence = sum(recent_confidence) / len(recent_confidence) if recent_confidence else 0.8
    insight_parts = []
    if current_emotion in ["Happy", "Joy"]:
        insight_parts.append("You have been feeling more positive today.")
    elif current_emotion in ["Sad", "Anxiety", "Fear", "Stress"]:
        insight_parts.append("Your recent patterns suggest a need for a calmer reset.")
    else:
        insight_parts.append("Your mood is currently steady and balanced.")
    if meditation_minutes >= 10 or exercise_minutes >= 10 or relaxation_sessions >= 1:
        insight_parts.append("Your wellness habits are supporting a healthier rhythm.")
    else:
        insight_parts.append("A short guided activity could help lift your recovery momentum.")
    insight = " ".join(insight_parts)

    payload = {
        "welcome_user": current_user["name"],
        "current_emotion": detected_mood or "Not detected yet",
        "mood_icon": EMOTION_ICON_MAP.get(detected_mood, ""),
        "mood_confidence": round(float(current_mood_doc.get("confidence", 0)) * 100, 1) if current_mood_doc else None,
        "mood_source": current_mood_doc.get("source") if current_mood_doc else None,
        "mood_confirmed": current_mood_doc.get("confirmed", False) if current_mood_doc else False,
        "last_updated": current_mood_doc.get("timestamp").isoformat() if current_mood_doc else None,
        "stress_level": round(snapshot["stress_level"], 1),
        "previous_stress": round(snapshot["previous_stress"], 1),
        "stress_trend": snapshot["trend"],
        "wellness_score": round(snapshot["wellness_score"], 1),
        "wellness_status": snapshot["status"],
        "meditation_minutes": meditation_minutes,
        "exercise_minutes": exercise_minutes,
        "breathing_minutes": breathing_minutes,
        "relaxation_sessions": relaxation_sessions,
        "journal_activity": journal_activity,
        "streak_count": streak_count,
        "badges": badges,
        "quote": random.choice(QUOTES),
        "recent_journal": recent_journal_summary,
        "recommended_session": latest_rec,
        "trends": trend_history,
        "heatmap": heatmap,
        "daily_planner": daily_planner,
        "mood_history": recent_moods[:8],
        "recent_mood_events": recent_mood_events,
        "mood_journey": mood_journey[-6:],
        "average_mood_confidence": round(average_confidence * 100, 1),
        "most_frequent_mood": snapshot["most_frequent_mood"],
        "ai_insight": insight,
        "stress_history": [
            {"label": item.get("date", "Day"), "value": clamp(float(item.get("stress", 0)), 0, 100)}
            for item in trend_history
        ],
        "weekly_summary": {
            "average_wellness": round(sum(item.get("wellness", 50) for item in trend_history) / len(trend_history), 1) if trend_history else 0,
            "average_stress": round(sum(item.get("stress", 30) for item in trend_history) / len(trend_history), 1) if trend_history else 0,
            "most_frequent_mood": snapshot["most_frequent_mood"],
            "meditation_minutes": meditation_minutes,
            "exercise_minutes": exercise_minutes,
            "relaxation_sessions": relaxation_sessions,
            "journal_entries": 1 if latest_journal else 0,
            "wellness_streak": streak_count,
        },
    }
    return serialize_for_json(payload)


@router.post("/current-mood")
async def set_manual_current_mood(
    input_data: ManualMoodInput,
    current_user: dict = Depends(get_current_user),
):
    """Record an explicit user confirmation without creating another mood state."""
    user_id = current_user.get("id") or current_user.get("_id") or "demo-user"
    event = await record_current_mood(user_id, input_data.mood, "manual", 1.0, confirmed=True)
    if not event:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Please select a valid mood.")
    return serialize_for_json(event)


async def get_wellness_activity_snapshot(user_id: str) -> Dict[str, Any]:
    """Capture observed dashboard indicators without asserting a clinical outcome."""
    current = await get_collection("current_mood").find_one({"user_id": user_id})
    mood = normalize_mood(current.get("mood")) if current else None
    today = await get_collection("mood_history").find_one({
        "user_id": user_id,
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
    })
    activity_count = int(today.get("relaxation_sessions", 0) if today else 0)
    stress = float(today.get("average_stress", 30) if today else 30) - (activity_count * 2)
    wellness = float(today.get("average_wellness", 70) if today else 70) + (activity_count * 6)
    return {
        "mood": mood or "Not detected yet",
        "stress_level": round(clamp(stress), 1),
        "wellness_score": round(clamp(wellness), 1),
        "timestamp": datetime.utcnow(),
    }


@router.post("/relaxation-activity/start")
async def start_relaxation_activity(
    input_data: RelaxationActivityInput,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("_id") or "demo-user"
    activity = {
        "user_id": user_id,
        "title": input_data.title.strip()[:160] or "Relaxation activity",
        "before": await get_wellness_activity_snapshot(user_id),
        "started_at": datetime.utcnow(),
        "completed": False,
    }
    result = await get_collection("wellness_activities").insert_one(activity)
    activity["_id"] = str(result.inserted_id)
    return serialize_for_json(activity)


@router.post("/relaxation-activity/complete")
async def complete_relaxation_activity(
    input_data: CompleteRelaxationActivityInput,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("id") or current_user.get("_id") or "demo-user"
    try:
        activity_id = ObjectId(input_data.activity_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid activity.") from exc

    activities = get_collection("wellness_activities")
    activity = await activities.find_one({"_id": activity_id, "user_id": user_id})
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.")
    if not activity.get("completed"):
        await get_collection("mood_history").update_one(
            {"user_id": user_id, "date": datetime.utcnow().strftime("%Y-%m-%d")},
            {"$inc": {"relaxation_sessions": 1}, "$setOnInsert": {
                "average_stress": 30.0, "average_wellness": 70.0, "dominant_emotion": "Neutral",
                "meditation_minutes": 0, "exercise_minutes": 0, "breathing_minutes": 0,
            }},
            upsert=True,
        )
    after = await get_wellness_activity_snapshot(user_id)
    before = activity["before"]
    result = {
        "stress_indicator_changed_by": round(after["stress_level"] - float(before.get("stress_level", after["stress_level"])), 1),
        "wellness_score_changed_by": round(after["wellness_score"] - float(before.get("wellness_score", after["wellness_score"])), 1),
    }
    await activities.update_one({"_id": activity_id}, {"$set": {
        "completed": True, "completed_at": datetime.utcnow(), "after": after, "result": result,
    }})
    return serialize_for_json({"before": before, "after": after, "result": result})

@router.get("/recommendations")
async def get_relaxation_recommendations(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") or current_user.get("_id") or "demo-user"
    current_mood = await get_collection("current_mood").find_one({"user_id": user_id})
    mood = normalize_mood(current_mood.get("mood")) if current_mood else None
    mood = mood or "Neutral"
    valid_moods = {"Stress", "Sad", "Angry", "Happy", "Anxiety", "Fear", "Neutral"}
    mood = mood if mood in valid_moods else "Neutral"
    session = await recommendation_engine.generate_wellness_session(user_id, mood)

    return {
        "mood": mood,
        "videos": session.get("videos", [])[:4],
        "music": session.get("music", [])[:4],
        "breathing": session.get("breathing", {
            "title": "4-4-6 Breathing",
            "instruction": "Inhale for 4, hold for 4, exhale for 6. Repeat 6 rounds to settle the nervous system."
        }),
        "grounding": session.get("grounding", {
            "title": "5-4-3-2-1 Grounding",
            "instruction": "Name 5 things you see, 4 you can feel, 3 you hear, 2 you smell, and 1 you taste."
        }),
        "pmr": session.get("pmr", {
            "title": "Progressive Muscle Release",
            "instruction": "Tense each muscle group for 5 seconds and release slowly, beginning with your hands and shoulders."
        }),
        "activities": session.get("mood_recommendations", [
            "Take a 5-minute reset break.",
            "Have a glass of water and step outside for a brief reset.",
            "Do a short guided breathing cycle before your next task."
        ]),
        "explanation": session.get("recommendation_explanation"),
    }

@router.post("/track-meditation")
async def track_meditation(minutes: int = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") or current_user.get("_id") or "demo-user"
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    mood_coll = get_collection("mood_history")
    
    # Insert logs
    med_logs = get_collection("meditation_history")
    await med_logs.insert_one({
        "user_id": user_id,
        "minutes": minutes,
        "timestamp": datetime.utcnow()
    })
    
    # Update mood daily logs
    await mood_coll.update_one(
        {"user_id": user_id, "date": today_str},
        {
            "$inc": {"meditation_minutes": minutes},
            "$setOnInsert": {
                "average_stress": 40.0,
                "average_wellness": 60.0,
                "dominant_emotion": "Neutral"
            }
        },
        upsert=True
    )
    
    return {"status": "success", "added_minutes": minutes}

@router.post("/track-exercise")
async def track_exercise(minutes: int = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") or current_user.get("_id") or "demo-user"
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    mood_coll = get_collection("mood_history")
    
    # Insert logs
    exe_logs = get_collection("exercise_history")
    await exe_logs.insert_one({
        "user_id": user_id,
        "minutes": minutes,
        "timestamp": datetime.utcnow()
    })
    
    # Update mood daily logs
    await mood_coll.update_one(
        {"user_id": user_id, "date": today_str},
        {
            "$inc": {"exercise_minutes": minutes},
            "$setOnInsert": {
                "average_stress": 40.0,
                "average_wellness": 60.0,
                "dominant_emotion": "Neutral"
            }
        },
        upsert=True
    )
    
    return {"status": "success", "added_minutes": minutes}
