from datetime import datetime
from typing import Any, Dict, Optional

from app.database import get_collection


VALID_MOODS = {"Happy", "Sad", "Angry", "Neutral", "Fear", "Surprise", "Anxiety", "Stress", "Depression Indicator"}
SOURCE_PRIORITIES = {
    "manual": 5,
    "chat": 4,
    "journal": 3,
    "voice": 2,
    "video": 1,
}


def normalize_mood(mood: str) -> Optional[str]:
    if not mood:
        return None
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
    }.get(str(mood).strip().lower(), str(mood).strip())
    return normalized if normalized in VALID_MOODS else None


def is_explicit_mood_check_in(text: str, mood: Optional[str]) -> bool:
    """Only treat a chat inference as confirmed when the user states their feeling."""
    if not mood or not text:
        return False
    message = str(text).strip().lower()
    aliases = {
        "Happy": ("happy", "joyful", "joy"),
        "Sad": ("sad", "down", "unhappy"),
        "Angry": ("angry", "mad", "furious"),
        "Neutral": ("neutral", "okay", "fine"),
        "Fear": ("afraid", "scared", "fearful"),
        "Surprise": ("surprised",),
        "Anxiety": ("anxious", "anxiety", "worried"),
        "Stress": ("stressed", "stress", "overwhelmed"),
        "Depression Indicator": ("depressed", "hopeless"),
    }
    has_mood_word = any(word in message for word in aliases.get(mood, ()))
    confirmation_phrases = ("i feel", "i'm feeling", "i am feeling", "i feel so", "feeling ", "i am ", "i'm ", "actually")
    return has_mood_word and any(phrase in message for phrase in confirmation_phrases)


async def record_current_mood(
    user_id: str,
    mood: str,
    source: str,
    confidence: float,
    confirmed: bool = False,
    stable: bool = True,
) -> Optional[Dict[str, Any]]:
    """Persist a valid mood event and update the single current-mood record by priority."""
    normalized_mood = normalize_mood(mood)
    priority = SOURCE_PRIORITIES.get(source)
    if not normalized_mood or priority is None:
        return None

    confidence = max(0.0, min(1.0, float(confidence)))
    if source == "video" and (confidence < 0.65 or not stable):
        return None

    timestamp = datetime.utcnow()
    event = {
        "user_id": user_id,
        "mood": normalized_mood,
        "source": source,
        "confidence": confidence,
        "confirmed": confirmed,
        "timestamp": timestamp,
    }
    await get_collection("mood_events").insert_one(event)

    current_collection = get_collection("current_mood")
    current = await current_collection.find_one({"user_id": user_id})
    current_priority = SOURCE_PRIORITIES.get(current.get("source"), 0) if current else 0

    if current is None or priority >= current_priority:
        # insert_one adds MongoDB's immutable _id to ``event``.  Do not include
        # it in $set when using the same event to update the current-mood record.
        current_mood_payload = {key: value for key, value in event.items() if key != "_id"}
        await current_collection.update_one(
            {"user_id": user_id},
            {"$set": current_mood_payload},
            upsert=True,
        )
        return event
    return current
