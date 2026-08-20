import os
import json
import logging
import re
from typing import List, Dict, Tuple
from groq import Groq
from app.config import settings

logger = logging.getLogger("uvicorn.error")


def contains_crisis_language(text: str) -> bool:
    """Match safety phrases as words, avoiding false positives such as 'studied'."""
    return bool(re.search(
        r"\b(?:suicide|suicidal|kill\s+myself|end\s+my\s+life|want\s+to\s+die|self[\s-]?harm|cut\s+myself|die)\b",
        str(text),
        flags=re.IGNORECASE,
    ))

class GroqService:
    @staticmethod
    def _local_empathetic_response(messages: List[Dict], current_emotion: str) -> str:
        """Provide useful, context-aware support when the hosted model is unavailable."""
        latest = str(messages[-1].get("content", "")).strip() if messages else ""
        message = latest.casefold()
        prior_user_messages = [
            str(item.get("content", "")).casefold()
            for item in messages[:-1]
            if item.get("role") == "user"
        ]
        prior_context = " ".join(prior_user_messages[-3:])

        # Follow-ups should refer to the conversation, not restart it.
        if any(phrase in message for phrase in ["couldn't remember", "could not remember", "cant remember", "can't remember"]) and any(
            word in prior_context for word in ["exam", "failed", "study", "studied", "test"]
        ):
            return (
                "That can be really frustrating, especially after putting in so much effort. "
                "It may help to look at whether the challenge was revision, recalling under pressure, or exam anxiety. "
                "We can work through one of those together."
            )
        if any(phrase in message for phrase in ["failed my exam", "failed an exam", "failed the exam"]):
            return (
                "I'm sorry that happened. Failing one exam does not define your ability. "
                "Would you like to talk about what went wrong or make a small plan for your next attempt?"
            )

        if any(word in message for word in ["relax", "calm down", "unwind"]):
            return (
                "You could try a short breathing exercise, listen to calming music, take a brief walk, "
                "or spend a few minutes away from your screen. If you tell me how you're feeling right now, "
                "I can suggest something more suitable."
            )
        if current_emotion == "Happy":
            return (
                "That's wonderful to hear! What made you feel so happy today? "
                "You could also write about this moment in your journal so you can remember it later."
            )
        if current_emotion == "Sad":
            return (
                "I'm sorry you're having a difficult day. You don't have to solve everything at once. "
                "If you'd like, you can tell me what has been making you feel sad, and we can take it one step at a time."
            )
        if current_emotion in {"Stress", "Anxiety"}:
            return (
                "That sounds like a lot to carry. Try breaking the next step into one small, manageable task. "
                "If you'd like, I can guide you through a short breathing exercise before you continue."
            )
        if current_emotion == "Angry":
            return (
                "It sounds like something has really upset you. Before responding while you're angry, "
                "it may help to pause for a moment. If you want, tell me what happened and we can think through it calmly."
            )
        if current_emotion == "Fear":
            return (
                "That sounds unsettling. You do not have to face the whole situation at once—"
                "what feels like the safest small next step right now?"
            )
        return (
            "I'm here to listen. Tell me a little more about what is on your mind, "
            "and we can take it one step at a time."
        )

    @staticmethod
    def _fallback_emotion(text: str) -> str:
        """Local mood signal only; conversational replies always come from Groq/Llama."""
        text_lower = text.lower()
        if any(w in text_lower for w in ["sad", "cry", "grief", "depressed", "lonely", "hopeless", "unhappy"]):
            return "Sad"
        if any(w in text_lower for w in ["scared", "fear", "afraid", "terrified", "panic", "dread"]):
            return "Fear"
        if any(w in text_lower for w in ["stress", "overwhelmed", "pressure", "tired", "burnt out", "exhausted"]):
            return "Stress"
        if any(w in text_lower for w in ["anxious", "anxiety", "nervous", "worry", "uneasy", "jittery"]):
            return "Anxiety"
        if any(w in text_lower for w in ["happy", "glad", "joy", "excited", "wonderful", "great", "smile"]):
            return "Happy"
        if any(w in text_lower for w in ["angry", "mad", "furious", "hate", "pissed", "annoyed"]):
            return "Angry"
        return "Neutral"

    def _try_chat_completion(self, messages: List[Dict], max_tokens: int = 300, temperature: float = 0.7):
        if not self.client:
            return None

        model_candidates = [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "llama3-8b-8192",
        ]

        last_error = None
        for model_name in model_candidates:
            try:
                response = self.client.chat.completions.create(
                    messages=messages,
                    model=model_name,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return response
            except Exception as exc:
                last_error = exc
                logger.warning(f"Groq model {model_name} failed: {exc}")

        if last_error:
            logger.error(f"All Groq chat models failed: {last_error}")
        return None
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.client = None
        if self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
                logger.info("Groq client initialized successfully using Llama 3.")
            except Exception as e:
                logger.error(f"Error initializing Groq client: {e}")
        else:
            logger.warning("GROQ_API_KEY is not set. Using local mock empathetic engine for AI Chat.")

    async def analyze_text_emotion(self, text: str) -> str:
        """
        Detects one of: Happy, Sad, Fear, Stress, Anxiety, Depression Indicator, Neutral, Angry
        """
        text_lower = text.lower()
        
        # Check emergency keywords immediately
        if contains_crisis_language(text):
            return "Depression Indicator"

        # Clear emotional language should not depend on a network model. This
        # prevents a failed model request from labelling "I am happy" as Neutral.
        local_emotion = self._fallback_emotion(text)
        if local_emotion != "Neutral":
            return local_emotion

        if not self.client:
            return local_emotion

        try:
            prompt = (
                "You are an emotion detection assistant. Analyze the emotional sentiment of the following message. "
                "Classify it strictly into EXACTLY ONE of the following categories: Happy, Sad, Fear, Stress, Anxiety, "
                "Depression Indicator, Neutral, Angry. Return ONLY the category name. Do not explain your choice. "
                f"Message: \"{text}\""
            )
            chat_completion = self._try_chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=10,
                temperature=0.0,
            )
            if not chat_completion:
                return local_emotion
            result = chat_completion.choices[0].message.content.strip()
            # Clean up response in case model returned extra punctuation
            for emotion in ["Happy", "Sad", "Fear", "Stress", "Anxiety", "Depression Indicator", "Neutral", "Angry"]:
                if emotion.lower() in result.lower():
                    return emotion
            return local_emotion
        except Exception as e:
            logger.error(f"Groq API emotion analysis failed: {e}. Falling back to keyword search.")
            return local_emotion

    async def get_empathetic_chat_response(self, messages: List[Dict], current_emotion: str) -> str:
        """
        Generate empathetic Llama-3 response.
        - Remember conversation history (passed in messages)
        - EMPATHETIC responses
        - NEVER diagnose diseases
        - Recommend relaxation techniques
        - Recommend professional help when necessary
        """
        last_message = messages[-1]["content"] if messages else ""
        last_message_lower = str(last_message).lower()
        if contains_crisis_language(last_message):
            return (
                "EMERGENCY WARNING: I sense that you are going through a very difficult time, and I want you to be safe. "
                "I am an AI, not a doctor or crisis counselor. Please reach out immediately to a trusted professional or a hotline. "
                "You can call or text the Suicide & Crisis Lifeline at 988 (US) or contact your local emergency services. "
                "Please connect with your emergency contacts or a licensed mental health professional right away. You are not alone."
            )

        if not self.client:
            return self._local_empathetic_response(messages, current_emotion)

        try:
            system_prompt = (
                "You are MindEase, a warm mental-wellbeing companion. Respond directly to the user's latest message, "
                "using the prior conversation when it clarifies a follow-up. Be natural and specific: acknowledge feelings "
                "when they are expressed, answer direct questions directly, and ask one relevant follow-up when useful. "
                "Do not restart the conversation, repeat a generic reassurance, or force an emotion onto a neutral question. "
                "Offer practical, optional wellbeing ideas only when they fit the message. Never diagnose conditions, prescribe "
                "medication, or claim a wellness activity cures anything. For immediate safety concerns, encourage urgent support "
                "from trusted people, local emergency services, or qualified professionals. Keep the response concise and conversational. "
                f"The optional text mood signal for this turn is: {current_emotion}."
            )

            payload_messages = [{"role": "system", "content": system_prompt}]
            for msg in messages[-10:]:
                payload_messages.append({"role": msg["role"], "content": msg["content"]})

            chat_completion = self._try_chat_completion(payload_messages, max_tokens=300, temperature=0.7)
            if not chat_completion:
                raise RuntimeError("Groq could not generate a response. Please try again shortly.")
            response_text = (chat_completion.choices[0].message.content or "").strip()
            if not response_text:
                raise RuntimeError("Groq returned an empty response. Please try again shortly.")

            previous_assistant = next((item.get("content", "") for item in reversed(messages[:-1]) if item.get("role") == "assistant"), "")
            if previous_assistant and response_text.casefold() == previous_assistant.strip().casefold():
                retry_messages = payload_messages + [{
                    "role": "system",
                    "content": "Give a fresh response that addresses the latest user message specifically; do not repeat your prior wording.",
                }]
                retry = self._try_chat_completion(retry_messages, max_tokens=300, temperature=0.8)
                response_text = (retry.choices[0].message.content or "").strip() if retry else ""
                if not response_text:
                    raise RuntimeError("Groq could not generate a new response. Please try again shortly.")
            return response_text
        except Exception as e:
            logger.error(f"Groq API chat failed; using the local companion: {e}")
            return self._local_empathetic_response(messages, current_emotion)

    async def summarize_and_analyze_journal(self, journal_text: str) -> Tuple[str, List[str], str]:
        """
        Summarize a journal entry, extract 2-3 bulleted insights, and detect emotion.
        Returns: (summary, insights_list, emotion)
        """
        emotion = await self.analyze_text_emotion(journal_text)
        
        if not self.client:
            # Fallback logic
            summary = f"Summary: Reflection on current state. Expressing feelings related to {emotion.lower()} experiences."
            insights = [
                f"Focus on managing factors contributing to {emotion.lower()} feelings.",
                "Engage in wellness activities like meditation or exercise to stabilize mood.",
                "Track how your activities correspond to changes in your wellness score."
            ]
            return summary, insights, emotion

        try:
            # Generate Summary
            summary_prompt = (
                "Summarize the following journal entry in 2-3 clear, compassionate sentences:\n"
                f"\"{journal_text}\""
            )
            summary_res = self._try_chat_completion(
                messages=[{"role": "user", "content": summary_prompt}],
                max_tokens=100,
                temperature=0.5,
            )
            if not summary_res:
                return "Unable to generate summary due to connection issues.", ["Practice mindfulness.", "Keep recording your journal entries."], emotion
            summary = summary_res.choices[0].message.content.strip()

            # Generate Insights
            insights_prompt = (
                "Based on the following journal entry, provide exactly 3 actionable, empathetic mental wellness recommendations (insights) "
                "for the user. List them as plain sentences, one per line. Do not include numbers, bullet characters, or prefixes. "
                f"Entry: \"{journal_text}\""
            )
            insights_res = self._try_chat_completion(
                messages=[{"role": "user", "content": insights_prompt}],
                max_tokens=150,
                temperature=0.5,
            )
            if not insights_res:
                insights = ["Take a few moments to relax.", "Incorporate light movement today.", "Practice mindful breathing."]
                return summary, insights[:3], emotion
            insights_text = insights_res.choices[0].message.content.strip()
            insights = [line.strip("- *• \t0123456789.") for line in insights_text.split("\n") if line.strip()]
            if not insights:
                insights = ["Take a few moments to relax.", "Incorporate light movement today.", "Practice mindful breathing."]
            return summary, insights[:3], emotion
        except Exception as e:
            logger.error(f"Groq API journal processing failed: {e}")
            return "Unable to generate summary due to connection issues.", ["Practice mindfulness.", "Keep recording your journal entries."], emotion

groq_service = GroqService()
