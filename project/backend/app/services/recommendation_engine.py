import logging
from typing import Dict, Any, List
from datetime import datetime
from app.database import get_collection

logger = logging.getLogger("uvicorn.error")


class RecommendationEngine:
    def combine_modalities(
        self,
        text_emotion: str,
        face_emotion: str,
        voice_emotion: str,
        behavior_data: Dict[str, Any]
    ) -> str:
        if text_emotion == "Depression Indicator":
            return "Depression Indicator"

        emotions = [e for e in [text_emotion, face_emotion, voice_emotion] if e]
        if not emotions:
            return "Neutral"

        counts = {}
        for e in emotions:
            counts[e] = counts.get(e, 0) + 1

        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        majority_emotion, freq = sorted_counts[0]
        if freq >= 2:
            return majority_emotion

        weights = {"face": 0.45, "voice": 0.35, "text": 0.20}
        score = {}
        if face_emotion:
            score[face_emotion] = score.get(face_emotion, 0.0) + weights["face"]
        if voice_emotion:
            score[voice_emotion] = score.get(voice_emotion, 0.0) + weights["voice"]
        if text_emotion:
            score[text_emotion] = score.get(text_emotion, 0.0) + weights["text"]

        final_emotion = max(score.items(), key=lambda x: x[1])[0]
        fatigue = behavior_data.get("fatigue_score", 0) if behavior_data else 0
        if final_emotion == "Neutral" and fatigue > 60:
            return "Stress"

        return final_emotion

    def get_relaxation_videos(self, emotion: str) -> List[Dict[str, str]]:
        videos = {
            "Stress": [
                {"title": "10-Minute Guided Meditation for Stress & Anxiety", "url": "https://www.youtube.com/embed/tuPW7oOudVc", "category": "Stress Relief", "description": "A gentle guided meditation to slow down and reduce stress.", "duration": "10 min", "icon": "self_improvement"},
                {"title": "10-Minute Meditation for Stress", "url": "https://www.youtube.com/embed/z6X5oEIg6Ak", "category": "Meditation", "description": "A short calming meditation for an overwhelmed mind.", "duration": "10 min", "icon": "spa"},
                {"title": "Guided Meditation for Stress Relief", "url": "https://www.youtube.com/embed/o94tvFUttco", "category": "Relaxation", "description": "A visual guided session designed to help stress soften.", "duration": "Guided session", "icon": "self_improvement"},
                {"title": "Ocean Waves for Deep Calm", "url": "https://www.youtube.com/embed/d1_vKv3lTYM", "category": "Nature Sounds", "description": "Slow ocean sounds for quiet reflection and relaxation.", "duration": "Live ambience", "icon": "waves"},
            ],
            "Sad": [
                {"title": "Positive Energy Guided Meditation", "url": "https://www.youtube.com/embed/DSP9nksqdFE", "category": "Emotional Uplift", "description": "A kind meditation for inviting ease and positive energy.", "duration": "10 min", "icon": "wb_sunny"},
                {"title": "Morning Positive Affirmations", "url": "https://www.youtube.com/embed/PdtSrwwBkeE", "category": "Affirmations", "description": "Gentle affirmations for a brighter, more hopeful mood.", "duration": "Morning session", "icon": "favorite"},
                {"title": "Positive Mindset Meditation", "url": "https://www.youtube.com/embed/rUNaAIeosXk", "category": "Mindfulness", "description": "A guided reset that encourages optimism and self-care.", "duration": "10 min", "icon": "lightbulb"},
                {"title": "Gratitude Meditation", "url": "https://www.youtube.com/embed/3mFVCX2wmqw", "category": "Self-Care", "description": "A quiet gratitude practice for supportive moments.", "duration": "Guided session", "icon": "volunteer_activism"},
            ],
            "Angry": [
                {"title": "Box Breathing for Emotional Reset", "url": "https://www.youtube.com/embed/XGKnQN7zUmw", "category": "Breathing", "description": "A paced breathing practice to create space before reacting.", "duration": "10 min", "icon": "air"},
                {"title": "Full-Body Stretch for Tension Release", "url": "https://www.youtube.com/embed/ZiFMgIWi5vM", "category": "Stretching", "description": "A low-intensity stretch to release physical tension safely.", "duration": "10 min", "icon": "accessibility_new"},
                {"title": "Guided Meditation for Stress Release", "url": "https://www.youtube.com/embed/KBWqBDMPMvk", "category": "Meditation", "description": "A calming visualization to settle a heated mind.", "duration": "Guided session", "icon": "self_improvement"},
                {"title": "Guided Meditation for Finding Peace", "url": "https://www.youtube.com/embed/W19PdslW7iw", "category": "Emotional Regulation", "description": "A steady meditation for returning to calm.", "duration": "15 min", "icon": "spa"},
            ],
            "Happy": [
                {"title": "Feel-Good Afrobeat Mix", "url": "https://www.youtube.com/embed/aO8CbSn_-bs", "category": "Good Vibes Music", "description": "Warm, uplifting rhythms for a positive moment.", "duration": "Music mix", "icon": "music_note"},
                {"title": "Happy Day Positive Chill Mix", "url": "https://www.youtube.com/embed/G-99nSj4iIA", "category": "Positive Music", "description": "Bright music to maintain an upbeat mood.", "duration": "Music mix", "icon": "sentiment_very_satisfied"},
                {"title": "Start the Day with Gratitude", "url": "https://www.youtube.com/embed/ECAHPNdeD_o", "category": "Gratitude", "description": "A gratitude practice to savor the present moment.", "duration": "13 min", "icon": "wb_sunny"},
                {"title": "Positive Gratitude Affirmations", "url": "https://www.youtube.com/embed/mxpTngbunN4", "category": "Positive Mindset", "description": "Positive affirmations for an optimistic outlook.", "duration": "12 min", "icon": "favorite"},
            ],
            "Anxiety": [
                {"title": "Guided Meditation for Anxiety Relief", "url": "https://www.youtube.com/embed/8_jcEpwKQXc", "category": "Anxiety Relief", "description": "A reassuring guided visualization for anxious thoughts.", "duration": "Guided session", "icon": "self_improvement"},
                {"title": "10-Minute Meditation for Anxiety", "url": "https://www.youtube.com/embed/O-6f5wQXSu8", "category": "Calming", "description": "A low-stimulation meditation for feeling settled.", "duration": "10 min", "icon": "spa"},
                {"title": "5-4-3-2-1 Grounding Exercise", "url": "https://www.youtube.com/embed/30VMIEmA114", "category": "Grounding", "description": "A sensory exercise for returning to the present.", "duration": "Short exercise", "icon": "my_location"},
                {"title": "Safe Sleep Meditation for Anxiety", "url": "https://www.youtube.com/embed/YGXvgqoaIDI", "category": "Comfort", "description": "A gentle session focused on safety and calm.", "duration": "Sleep meditation", "icon": "bedtime"},
            ],
            "Neutral": [
                {"title": "10-Minute Meditation for Beginners", "url": "https://www.youtube.com/embed/U9YKY7fdwyg", "category": "Mindfulness", "description": "A balanced mindfulness practice for the present.", "duration": "10 min", "icon": "self_improvement"},
                {"title": "5-Minute Meditation Anywhere", "url": "https://www.youtube.com/embed/inpok4MKVLM", "category": "Focus", "description": "A short guided pause to reset attention.", "duration": "5 min", "icon": "timer"},
                {"title": "One-Moment Mindfulness Exercise", "url": "https://www.youtube.com/embed/F6eFFCi12v8", "category": "Mindfulness", "description": "A simple practice for one calm focused moment.", "duration": "Short exercise", "icon": "center_focus_strong"},
                {"title": "Lo-Fi Music for Focus", "url": "https://www.youtube.com/embed/5qap5aO4i9A", "category": "Focus Music", "description": "A low-key soundscape for concentration and balance.", "duration": "Live ambience", "icon": "music_note"},
            ],
        }
        selected = videos.get("Anxiety" if emotion == "Fear" else emotion, videos["Neutral"])
        return [video for video in selected if video and video.get("url")]

    def get_music_tracks(self, emotion: str) -> List[Dict[str, str]]:
        music = {
            "Stress": [
                {"title": "Clair de Lune (Piano Classic)", "artist": "Debussy", "url": "https://open.spotify.com/embed/track/5u5A8ldPyxkK8MUwZEFE0g", "tag": "Piano"},
                {"title": "Raindrops on Glass", "artist": "Nature Soundscapes", "url": "https://open.spotify.com/embed/track/12345", "tag": "Rain"},
                {"title": "Late Night Coffee Shop (LoFi)", "artist": "Chill Beats", "url": "https://open.spotify.com/embed/track/67890", "tag": "LoFi"},
            ],
            "Sad": [
                {"title": "Soft Instrumental Acoustic", "artist": "Acoustic Dreams", "url": "https://open.spotify.com/embed/track/11111", "tag": "Soft Instrumental"},
                {"title": "Hope Resonates", "artist": "Therapeutic Sound", "url": "https://open.spotify.com/embed/track/22222", "tag": "Hope Music"},
            ],
            "Happy": [
                {"title": "Summer Vibes Workout", "artist": "Dance Club", "url": "https://open.spotify.com/embed/track/33333", "tag": "Workout Music"},
                {"title": "Electric Motivation", "artist": "Pop Beats", "url": "https://open.spotify.com/embed/track/44444", "tag": "Energetic Music"},
            ],
            "Anxiety": [
                {"title": "Deep Mindful Relaxation", "artist": "Zen Master", "url": "https://open.spotify.com/embed/track/55555", "tag": "Meditation Music"},
                {"title": "Whispering Forest Wind", "artist": "Nature Sounds", "url": "https://open.spotify.com/embed/track/66666", "tag": "Nature Sounds"},
            ],
            "Fear": [
                {"title": "Ocean Breathing Space", "artist": "Nature Soundscapes", "url": "https://open.spotify.com/embed/track/77777", "tag": "Ocean"},
                {"title": "Whispering Forest Wind", "artist": "Nature Sounds", "url": "https://open.spotify.com/embed/track/66666", "tag": "Nature Sounds"},
            ],
            "Angry": [
                {"title": "Slow Instrumental Reset", "artist": "Calm Instrumentals", "url": "https://open.spotify.com/embed/track/88888", "tag": "Soft Instrumental"},
                {"title": "Gentle Rain Shower Ambient", "artist": "Nature Soundscapes", "url": "https://open.spotify.com/embed/track/12345", "tag": "Rain"},
            ],
            "Neutral": [
                {"title": "Lo-Fi Focus Flow", "artist": "Chill Beats", "url": "https://open.spotify.com/embed/track/67890", "tag": "LoFi"},
                {"title": "Clair de Lune (Piano Classic)", "artist": "Debussy", "url": "https://open.spotify.com/embed/track/5u5A8ldPyxkK8MUwZEFE0g", "tag": "Piano"},
            ],
        }
        return music.get("Anxiety" if emotion == "Fear" else emotion, music["Neutral"])

    async def generate_wellness_session(self, user_id: str, emotion: str) -> Dict[str, Any]:
        meditation = {
            "title": f"Mindful Breathing for {emotion}",
            "duration_minutes": 10,
            "instruction": "Find a comfortable seated position. Keep your back straight, close your eyes, and focus strictly on the physical sensation of your breath going in and out."
        }

        exercise = {
            "title": "Restorative Mind-Body Flow",
            "duration_minutes": 15,
            "intensity": "Low",
            "instruction": "Gentle neck rolls, shoulder stretches, cat-cow pose, child's pose, and a final forward fold to release stored emotional tension."
        }

        if emotion in ["Stress", "Anxiety", "Depression Indicator"]:
            meditation["title"] = "Grounding Meditation"
            meditation["duration_minutes"] = 15
            meditation["instruction"] = "Count each breath up to 10. If your mind wanders, gently bring it back to 1. Imagine any stress dissolving away with each exhale."
            exercise["title"] = "Deep Muscle Relaxation Stretch"
            exercise["duration_minutes"] = 10
            exercise["intensity"] = "Very Low"
        elif emotion == "Happy":
            meditation["title"] = "Gratitude Meditation"
            meditation["duration_minutes"] = 5
            meditation["instruction"] = "Focus on three things you are deeply grateful for today. Let the warm feeling fill your heart."
            exercise["title"] = "Active Aerobic Boost"
            exercise["duration_minutes"] = 20
            exercise["intensity"] = "Medium"

        breathing = {
            "title": "4-4-6 Breathing",
            "instruction": "Inhale for 4, hold for 4, exhale for 6. Repeat this 6 times to settle your pace and calm your system."
        }
        grounding = {
            "title": "5-4-3-2-1 Grounding",
            "instruction": "Name 5 things you can see, 4 you can feel, 3 you can hear, 2 you can smell, and 1 you can taste."
        }
        pmr = {
            "title": "Progressive Muscle Release",
            "instruction": "Tense each muscle group for 5 seconds, then release slowly, beginning with your hands and shoulders."
        }

        mood_recommendations = {
            "Stress": ["Take a 5-minute reset break and sip water slowly.", "Try a breathing cycle before the next task.", "Choose a calming ambient soundscape and lower sensory stimulation."],
            "Sad": ["Expose yourself to natural light for a few minutes.", "Write down one thing that still feels manageable today.", "Play soothing instrumental music and keep your pace gentle."],
            "Angry": ["Move your shoulders and jaw slowly to release tension.", "Do a brief stretch and exhale longer than you inhale.", "Step away from the trigger for 60 seconds before responding."],
            "Fear": ["Use the 5-4-3-2-1 grounding exercise.", "Look around the room and name what is safe right now.", "Reduce stimulation and focus on one next action."],
            "Anxiety": ["Try a 4-4-6 breathing cycle.", "Limit doom-scrolling, and focus on one small task.", "Take a short walk or stretch to slow racing thoughts."],
            "Happy": ["Preserve the good mood with a short gratitude exercise.", "Share a kind message with someone who supports you.", "Channel this energy into a restorative movement break."],
            "Neutral": ["Take three slow breaths and notice what feels heavy or calm.", "Choose a gentle session that helps you settle into the day.", "Reflect briefly in your journal to check in with your mind."],
        }

        relaxation_tips = {
            "Stress": "Apply a warm compress to your neck and shoulders, and focus on the 4-4-6 animated breathing exercise.",
            "Sad": "Open the curtains to let natural light in. Drink a glass of cold water, and journal about what you feel.",
            "Angry": "Tense your hands into fists for 5 seconds, then completely release. Repeat this muscle relaxation three times.",
            "Fear": "Try the 5-4-3-2-1 sensory grounding technique. Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste.",
            "Happy": "Share this happy feeling! Send a warm text message to a friend or write down what made you smile.",
            "Anxiety": "Exhale longer than you inhale. Try our animated breathing bubble using the 4s in, 4s hold, 6s out method.",
            "Neutral": "Take 5 long, slow breaths and let your shoulders drop before you begin the next task."
        }

        books = [
            {"title": "The Things You Can See Only When You Slow Down", "author": "Haemin Sunim"},
            {"title": "Feeling Good: The New Mood Therapy", "author": "David D. Burns"},
        ]

        podcasts = [
            {"title": "The Mindful Podcast", "episode": "Finding Peace in Overwhelming Times"},
            {"title": "Ten Percent Happier", "episode": "Taming Anxiety with Science"},
        ]

        session = {
            "user_id": user_id,
            "emotion": emotion,
            "meditation": meditation,
            "exercise": exercise,
            "breathing": breathing,
            "grounding": grounding,
            "pmr": pmr,
            "mood_recommendations": mood_recommendations.get(emotion, mood_recommendations["Neutral"]),
            "relaxation_tip": relaxation_tips.get(emotion, relaxation_tips["Neutral"]),
            "recommendation_explanation": (
                f"Your current mood is {emotion}, so this session focuses on "
                f"{meditation['title'].lower()} and supportive, low-pressure activities."
            ),
            "music": self.get_music_tracks(emotion),
            "videos": self.get_relaxation_videos(emotion),
            "books": books,
            "podcasts": podcasts,
            "created_at": datetime.utcnow(),
        }

        recs_collection = get_collection("recommendations")
        await recs_collection.insert_one(session)

        if "_id" in session:
            session["_id"] = str(session["_id"])

        return session


recommendation_engine = RecommendationEngine()
