import base64
import logging
import os
from typing import Dict, Any

import cv2
import numpy as np

logger = logging.getLogger("uvicorn.error")

MEDIAPIPE_AVAILABLE = False
DEEPFACE_AVAILABLE = False

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    logger.warning("MediaPipe is not installed. Video behavior analysis will run in fallback mode.")

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    logger.warning("DeepFace is not installed. Facial emotion analysis will use OpenCV heuristics.")


class VideoService:
    VALID_EMOTIONS = ["Happy", "Sad", "Angry", "Surprise", "Neutral", "Stress", "Anxiety", "Fear", "Uncertain"]

    def __init__(self):
        self.mp_face_mesh = None
        self.mp_hands = None
        self.face_mesh = None
        self.hands = None
        self._recent_emotions = []

        cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
        if os.path.exists(cascade_path):
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
        else:
            self.face_cascade = None

        if MEDIAPIPE_AVAILABLE:
            try:
                self.mp_face_mesh = mp.solutions.face_mesh
                self.mp_hands = mp.solutions.hands
                self.face_mesh = self.mp_face_mesh.FaceMesh(
                    max_num_faces=1,
                    refine_landmarks=True,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5,
                )
                self.hands = self.mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.5)
                logger.info("MediaPipe FaceMesh and Hands initialized.")
            except Exception as e:
                logger.error(f"Error initializing MediaPipe: {e}")

    def decode_base64_frame(self, base64_str: str) -> np.ndarray:
        if not base64_str:
            return np.zeros((240, 320, 3), dtype=np.uint8)
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        try:
            img_data = base64.b64decode(base64_str)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return np.zeros((240, 320, 3), dtype=np.uint8)
            return img
        except Exception:
            return np.zeros((240, 320, 3), dtype=np.uint8)

    def calculate_ear(self, landmarks, eye_indices) -> float:
        p2_p6 = np.linalg.norm(landmarks[eye_indices[1]] - landmarks[eye_indices[5]])
        p3_p5 = np.linalg.norm(landmarks[eye_indices[2]] - landmarks[eye_indices[4]])
        p1_p4 = np.linalg.norm(landmarks[eye_indices[0]] - landmarks[eye_indices[3]])
        return float((p2_p6 + p3_p5) / (2.0 * p1_p4 + 1e-6))

    def calculate_mar(self, landmarks, mouth_indices) -> float:
        v1 = np.linalg.norm(landmarks[mouth_indices[1]] - landmarks[mouth_indices[5]])
        v2 = np.linalg.norm(landmarks[mouth_indices[2]] - landmarks[mouth_indices[4]])
        h = np.linalg.norm(landmarks[mouth_indices[0]] - landmarks[mouth_indices[3]])
        return float((v1 + v2) / (2.0 * h + 1e-6))

    def _face_crop(self, image: np.ndarray):
        if image is None or image.size == 0:
            return None, None

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        if self.face_cascade is not None:
            faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(60, 60))
            if len(faces) > 0:
                x, y, w, h = max(faces, key=lambda item: item[2] * item[3])
                padding = 0.15
                x1 = max(0, int(x - w * padding))
                y1 = max(0, int(y - h * padding))
                x2 = min(image.shape[1], int(x + w * (1 + padding)))
                y2 = min(image.shape[0], int(y + h * (1 + padding)))
                crop = image[y1:y2, x1:x2]
                if crop.size == 0:
                    return None, None
                return crop, (x1, y1, x2, y2)
        return None, None

    def _classify_mouth_shape(self, face_roi: np.ndarray):
        if face_roi is None or face_roi.size == 0:
            return "Uncertain"

        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        h, w = gray.shape

        mouth_region = gray[int(h * 0.55):, int(w * 0.15):int(w * 0.85)]
        if mouth_region.size == 0:
            return "Uncertain"

        mid_row = max(2, mouth_region.shape[0] // 2)
        upper = mouth_region[:mid_row]
        lower = mouth_region[mid_row:]

        if upper.size == 0 or lower.size == 0:
            return "Uncertain"

        threshold = float(np.mean(mouth_region)) - 25.0
        upper_dark_ratio = float(np.mean(upper < threshold)) if upper.size else 0.0
        lower_dark_ratio = float(np.mean(lower < threshold)) if lower.size else 0.0

        row_means = np.mean(mouth_region, axis=1)
        if row_means.size:
            darkest_row = int(np.argmin(row_means))
            relative_dark_row = darkest_row / max(1, row_means.shape[0] - 1)
            if relative_dark_row < 0.45:
                return "Happy"
            if relative_dark_row > 0.55:
                return "Sad"

        if upper_dark_ratio > lower_dark_ratio * 1.15:
            return "Happy"
        if lower_dark_ratio > upper_dark_ratio * 1.15:
            return "Sad"

        mouth_mean = float(np.mean(mouth_region))
        if mouth_mean > 150:
            return "Happy"
        if mouth_mean < 120:
            return "Sad"
        return "Uncertain"

    def _classify_face_geometry(self, face_roi: np.ndarray) -> Dict[str, float]:
        if face_roi is None or face_roi.size == 0:
            return {"Happy": 0.0, "Sad": 0.0, "Angry": 0.0, "Surprise": 0.0, "Neutral": 0.0, "Stress": 0.0, "Anxiety": 0.0, "Fear": 0.0}

        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        gray = cv2.equalizeHist(gray)

        h, w = gray.shape
        mouth_y = int(h * 0.62)
        eye_y = int(h * 0.35)
        mouth_region = gray[mouth_y:h, int(w * 0.2):int(w * 0.8)]
        eye_region = gray[int(eye_y * 0.5):int(h * 0.5), int(w * 0.1):int(w * 0.9)]

        mouth_mean = float(np.mean(mouth_region)) if mouth_region.size else 128.0
        eye_mean = float(np.mean(eye_region)) if eye_region.size else 128.0
        contrast = float(np.std(gray))

        mouth_tension = float(np.std(mouth_region)) if mouth_region.size else 0.0
        eye_tension = float(np.std(eye_region)) if eye_region.size else 0.0

        scores = {
            "Happy": max(0.0, (255.0 - mouth_mean) / 255.0) + max(0.0, mouth_tension / 35.0) + max(0.0, 20.0 - abs(eye_mean - 110.0)) / 40.0,
            "Sad": max(0.0, (128.0 - mouth_mean) / 128.0) + max(0.0, abs(eye_mean - 100.0) / 60.0) + max(0.0, (contrast - 20.0) / 40.0)
        }

        scores["Angry"] = max(0.0, (contrast - 18.0) / 40.0) + max(0.0, (eye_tension - 12.0) / 20.0) + max(0.0, (160.0 - mouth_mean) / 120.0)
        scores["Surprise"] = max(0.0, (120.0 - eye_mean) / 80.0) + max(0.0, (mouth_mean - 90.0) / 80.0) + max(0.0, (contrast - 12.0) / 25.0)
        scores["Fear"] = max(0.0, (eye_tension - 8.0) / 18.0) + max(0.0, (150.0 - eye_mean) / 90.0) + max(0.0, (contrast - 10.0) / 35.0)
        scores["Stress"] = max(0.0, (contrast - 20.0) / 60.0) + max(0.0, (eye_tension - 10.0) / 20.0) + max(0.0, (mouth_tension - 8.0) / 22.0)
        scores["Anxiety"] = max(0.0, (contrast - 12.0) / 50.0) + max(0.0, (120.0 - eye_mean) / 80.0) + max(0.0, (mouth_tension - 7.0) / 20.0)
        scores["Neutral"] = 0.5 + max(0.0, 65.0 - abs(mouth_mean - 120.0)) / 100.0 + max(0.0, 40.0 - abs(eye_mean - 110.0)) / 55.0

        return scores

    def detect_emotion_from_image(self, image: np.ndarray) -> Dict[str, Any]:
        if image is None or image.size == 0:
            return {"emotion": "Uncertain", "confidence": 0.05}

        if np.std(image) < 6:
            return {"emotion": "Neutral", "confidence": 0.18}

        face_roi, _ = self._face_crop(image)
        if face_roi is None:
            h, w = image.shape[:2]
            fallback = image[int(h * 0.18):int(h * 0.82), int(w * 0.18):int(w * 0.82)]
            if fallback.size == 0:
                return {"emotion": "Uncertain", "confidence": 0.12}
            face_roi = fallback

        mouth_shape = self._classify_mouth_shape(face_roi)
        if mouth_shape in {"Happy", "Sad"}:
            return {"emotion": mouth_shape, "confidence": 0.71}

        scores = self._classify_face_geometry(face_roi)
        best_emotion, best_score = max(scores.items(), key=lambda item: item[1])
        total = sum(scores.values())
        confidence = float(best_score / (total + 1e-6)) if total > 0 else 0.0
        confidence = max(0.1, min(0.98, round(confidence, 3)))

        if best_emotion in {"Happy", "Sad", "Angry", "Surprise", "Neutral", "Stress", "Anxiety", "Fear"} and confidence >= 0.20:
            return {"emotion": best_emotion, "confidence": confidence}

        return {"emotion": "Uncertain", "confidence": max(0.1, confidence)}

    def _smooth_emotion(self, predicted_emotion: str, confidence: float) -> Dict[str, Any]:
        self._recent_emotions.append((predicted_emotion, confidence))
        if len(self._recent_emotions) > 5:
            self._recent_emotions.pop(0)

        if len(self._recent_emotions) < 2:
            return {"emotion": predicted_emotion, "confidence": confidence, "stable": False}

        counts = {}
        for emotion, score in self._recent_emotions:
            if emotion == "Uncertain":
                continue
            counts[emotion] = counts.get(emotion, 0) + 1

        if not counts:
            return {"emotion": "Uncertain", "confidence": max(0.1, confidence), "stable": False}

        smoothed_emotion, count = max(counts.items(), key=lambda item: item[1])
        smoothed_conf = sum(score for e, score in self._recent_emotions if e == smoothed_emotion) / max(1, len([1 for e, _ in self._recent_emotions if e == smoothed_emotion]))

        if count >= 2 and smoothed_conf >= 0.35:
            return {"emotion": smoothed_emotion, "confidence": round(smoothed_conf, 3), "stable": True}

        return {"emotion": predicted_emotion, "confidence": max(0.15, confidence), "stable": False}

    async def analyze_frame(self, user_id: str, base64_frame: str) -> Dict[str, Any]:
        try:
            if not base64_frame or not isinstance(base64_frame, str):
                return self.get_mock_analysis()

            img = self.decode_base64_frame(base64_frame)
            if img is None or img.size == 0:
                return self.get_mock_analysis()

            detection = self.detect_emotion_from_image(img)
            smoothed = self._smooth_emotion(detection["emotion"], detection["confidence"])
            detected_emotion = smoothed["emotion"]
            confidence = smoothed["confidence"]
            stable = smoothed["stable"]

            if confidence < 0.35:
                detected_emotion = "Uncertain"

            h, w, _ = img.shape

            sleeping = False
            yawning = False
            frequent_blinking = False
            looking_away = False
            head_down = False
            restlessness = False
            poor_posture = False
            hand_on_face = False
            eye_contact = True

            if MEDIAPIPE_AVAILABLE and self.face_mesh:
                try:
                    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    results = self.face_mesh.process(rgb_img)
                    if results.multi_face_landmarks:
                        face_landmarks = results.multi_face_landmarks[0]
                        coords = np.array([[lm.x * w, lm.y * h, lm.z * w] for lm in face_landmarks.landmark])
                        left_eye = [362, 385, 387, 263, 373, 380]
                        right_eye = [33, 160, 158, 133, 153, 144]
                        ear_l = self.calculate_ear(coords, left_eye)
                        ear_r = self.calculate_ear(coords, right_eye)
                        avg_ear = (ear_l + ear_r) / 2.0
                        if avg_ear < 0.2:
                            sleeping = True
                            eye_contact = False
                        if 0.2 <= avg_ear < 0.24:
                            frequent_blinking = True
                        mouth_idx = [78, 81, 13, 308, 14, 87]
                        mar = self.calculate_mar(coords, mouth_idx)
                        if mar > 0.6:
                            yawning = True
                        nose = coords[1]
                        chin = coords[152]
                        if (chin[1] - nose[1]) < 0.25 * h:
                            head_down = True
                            eye_contact = False
                        eye_l_center = np.mean(coords[left_eye], axis=0)
                        eye_r_center = np.mean(coords[right_eye], axis=0)
                        face_center = (eye_l_center + eye_r_center) / 2.0
                        if abs(nose[0] - face_center[0]) > 0.05 * w:
                            looking_away = True
                            eye_contact = False
                        eye_slope = abs(eye_l_center[1] - eye_r_center[1]) / abs(eye_l_center[0] - eye_r_center[0] + 1e-5)
                        if eye_slope > 0.15:
                            poor_posture = True
                        if self.hands:
                            hand_res = self.hands.process(rgb_img)
                            if hand_res.multi_hand_landmarks:
                                face_min = np.min(coords[:, :2], axis=0)
                                face_max = np.max(coords[:, :2], axis=0)
                                for hand_lms in hand_res.multi_hand_landmarks:
                                    for lm in hand_lms.landmark:
                                        hx, hy = lm.x * w, lm.y * h
                                        if face_min[0] <= hx <= face_max[0] and face_min[1] <= hy <= face_max[1]:
                                            hand_on_face = True
                                            break
                except Exception as e:
                    logger.warning(f"MediaPipe frame analysis error: {e}. Using fallback heuristics.")

            concentration_score = 100.0
            if looking_away: concentration_score -= 30
            if head_down: concentration_score -= 40
            if sleeping: concentration_score -= 80
            if hand_on_face: concentration_score -= 10
            if poor_posture: concentration_score -= 15
            concentration_score = max(0.0, min(100.0, concentration_score))

            fatigue_score = 10.0
            if yawning: fatigue_score += 40
            if sleeping: fatigue_score += 70
            if frequent_blinking: fatigue_score += 15
            if head_down: fatigue_score += 20
            if poor_posture: fatigue_score += 15
            if restlessness: fatigue_score += 10
            fatigue_score = max(0.0, min(100.0, fatigue_score))

            if fatigue_score > 60 and detected_emotion == "Neutral":
                detected_emotion = "Stress"

            return {
                "detected_emotion": detected_emotion,
                "confidence": round(max(0.05, min(0.99, confidence)), 3),
                "stable": stable,
                "behavior": {
                    "sleeping": sleeping,
                    "yawning": yawning,
                    "frequent_blinking": frequent_blinking,
                    "looking_away": looking_away,
                    "head_down": head_down,
                    "restlessness": restlessness,
                    "poor_posture": poor_posture,
                    "hand_on_face": hand_on_face,
                    "eye_contact": eye_contact,
                    "concentration_score": round(concentration_score, 1),
                    "fatigue_score": round(fatigue_score, 1),
                },
            }
        except Exception as e:
            logger.error(f"Global video frame processing exception: {e}")
            return self.get_mock_analysis()

    def get_heuristic_emotion(self, img: np.ndarray) -> str:
        detection = self.detect_emotion_from_image(img)
        return detection["emotion"]

    def get_mock_analysis(self) -> Dict[str, Any]:
        return {
            "detected_emotion": "Neutral",
            "confidence": 0.5,
            "behavior": {
                "sleeping": False,
                "yawning": False,
                "frequent_blinking": False,
                "looking_away": False,
                "head_down": False,
                "restlessness": False,
                "poor_posture": False,
                "hand_on_face": False,
                "eye_contact": True,
                "concentration_score": 90.0,
                "fatigue_score": 20.0,
            },
        }


video_service = VideoService()
