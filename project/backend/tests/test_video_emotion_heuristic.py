import cv2
import numpy as np
from app.services.video_service import VideoService


def _make_smile_face():
    img = np.full((240, 320, 3), 220, dtype=np.uint8)
    cv2.ellipse(img, (160, 120), (80, 90), 0, 0, 360, (220, 200, 180), -1)
    cv2.ellipse(img, (130, 112), (18, 24), 0, 0, 360, (80, 80, 80), -1)
    cv2.ellipse(img, (190, 112), (18, 24), 0, 0, 360, (80, 80, 80), -1)
    cv2.ellipse(img, (160, 150), (42, 18), 0, 0, 180, (60, 60, 60), -1)
    return img


def _make_sad_face():
    img = np.full((240, 320, 3), 180, dtype=np.uint8)
    cv2.ellipse(img, (160, 120), (80, 90), 0, 0, 360, (200, 180, 170), -1)
    cv2.ellipse(img, (130, 112), (18, 24), 0, 0, 360, (80, 80, 80), -1)
    cv2.ellipse(img, (190, 112), (18, 24), 0, 0, 360, (80, 80, 80), -1)
    cv2.ellipse(img, (160, 170), (42, 22), 0, 180, 360, (70, 70, 70), -1)
    return img


def test_heuristic_emotion_returns_supported_label():
    service = VideoService()
    img = np.zeros((240, 320, 3), dtype=np.uint8)
    emotion = service.get_heuristic_emotion(img)
    assert emotion in {"Neutral", "Happy", "Sad", "Angry", "Fear", "Stress", "Surprise", "Anxiety", "Uncertain"}


def test_smile_face_is_detected_as_happy():
    service = VideoService()
    emotion = service.get_heuristic_emotion(_make_smile_face())
    assert emotion == "Happy"


def test_sad_face_is_detected_as_sad():
    service = VideoService()
    emotion = service.get_heuristic_emotion(_make_sad_face())
    assert emotion == "Sad"
