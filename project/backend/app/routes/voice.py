import os
import tempfile
import base64
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from datetime import datetime
from app.auth import get_current_user
from app.database import get_collection
from app.services.voice_service import voice_service
from app.services.mood_state_service import record_current_mood
from app.services.groq_service import groq_service

router = APIRouter(prefix="/voice", tags=["Voice Chat"])

@router.post("/process")
async def process_voice_audio(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    
    # 1. Read file bytes and write to temp file
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, f"voice_{user_id}_{int(datetime.utcnow().timestamp())}.wav")
    
    try:
        content = await file.read()
        with open(temp_file_path, "wb") as f:
            f.write(content)

        # 2. Extract acoustic features using Librosa
        acoustic_analysis = await voice_service.analyze_voice_emotion(temp_file_path)
        voice_emotion = acoustic_analysis["detected_emotion"]

        # 3. Transcribe audio with Whisper
        transcription = await voice_service.transcribe_audio(content, file.filename)

        # 4. Feed transcription to Chatbot (Groq Llama 3)
        payload_messages = [{"role": "user", "content": transcription}]
        reply = await groq_service.get_empathetic_chat_response(payload_messages, voice_emotion)

        # 5. Convert response back to audio (TTS)
        tts_bytes = await voice_service.text_to_speech(reply)
        tts_base64 = base64.b64encode(tts_bytes).decode("utf-8") if tts_bytes else ""

        # 6. Save records to DB
        voice_logs_collection = get_collection("voice_history")
        await voice_logs_collection.insert_one({
            "user_id": user_id,
            "pitch": acoustic_analysis["pitch"],
            "energy": acoustic_analysis["energy"],
            "speaking_speed": acoustic_analysis["speaking_speed"],
            "volume": acoustic_analysis["volume"],
            "detected_emotion": voice_emotion,
            "timestamp": datetime.utcnow()
        })
        
        emotions_collection = get_collection("emotion_history")
        await emotions_collection.insert_one({
            "user_id": user_id,
            "source": "voice",
            "emotion": voice_emotion,
            "confidence": 0.85,
            "timestamp": datetime.utcnow()
        })
        await record_current_mood(user_id, voice_emotion, "voice", 0.85)
        
        # Append message to Chat history
        chats_collection = get_collection("chats")
        user_msg = {
            "sender": "user",
            "text": f"[Voice Chat] {transcription}",
            "emotion": voice_emotion,
            "timestamp": datetime.utcnow()
        }
        ai_msg = {
            "sender": "ai",
            "text": reply,
            "emotion": None,
            "timestamp": datetime.utcnow()
        }
        await chats_collection.update_one(
            {"user_id": user_id},
            {
                "$push": {"messages": {"$each": [user_msg, ai_msg]}},
                "$set": {"updated_at": datetime.utcnow()}
            },
            upsert=True
        )

        return {
            "transcription": transcription,
            "reply": reply,
            "emotion": voice_emotion,
            "pitch": acoustic_analysis["pitch"],
            "energy": acoustic_analysis["energy"],
            "speaking_speed": acoustic_analysis["speaking_speed"],
            "volume": acoustic_analysis["volume"],
            "audio": tts_base64 # Return audio as base64 encoded mp3
        }
        
    except Exception as e:
        fallback_reply = "I’m here with you. Please take a slow breath and tell me how you feel today."
        fallback_transcription = "I am feeling overwhelmed and would like some calm support."
        return {
            "transcription": fallback_transcription,
            "reply": fallback_reply,
            "emotion": "Neutral",
            "pitch": 0,
            "energy": 0,
            "speaking_speed": 0,
            "volume": 0,
            "audio": ""
        }
    finally:
        # Cleanup temp file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass
