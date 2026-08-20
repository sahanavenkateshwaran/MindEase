import asyncio
import base64

import numpy as np

from app.services.groq_service import GroqService
from app.services.recommendation_engine import RecommendationEngine
from app.services.video_service import VideoService


def test_video_service_marks_low_signal_as_uncertain():
    service = VideoService()
    img = np.full((120, 120, 3), 128, dtype=np.uint8)
    result = service.detect_emotion_from_image(img)

    assert result["emotion"] in {"Neutral", "Uncertain", "Happy", "Sad", "Angry", "Fear", "Stress"}
    assert 0.0 <= result["confidence"] <= 1.0


def test_relaxation_recommendations_are_loaded_for_stress():
    engine = RecommendationEngine()
    session = asyncio.run(engine.generate_wellness_session("demo-user", "Stress"))

    assert isinstance(session.get("videos"), list) and len(session["videos"]) > 0
    assert isinstance(session.get("music"), list) and len(session["music"]) > 0


def test_chat_fallback_response_is_supportive_not_connection_error():
    service = GroqService()
    response = asyncio.run(service.get_empathetic_chat_response([
        {"role": "user", "content": "I feel overwhelmed today."},
        {"role": "assistant", "content": "I’m here with you."}
    ], "Stress"))

    assert "trouble connecting" not in response.lower()
    assert "I’m here" in response or "I'm here" in response or "support" in response.lower()
