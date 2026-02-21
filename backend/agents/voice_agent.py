"""
Voice Agent — TTS + STT using KittenTTS and Whisper
───────────────────────────────────────────────────
Handles speak and listen requests using the centralized
TTS and STT services.
"""

from typing import Any, Dict

from utils.logger import log
from services.tts_service import speak as tts_speak, generate_audio, AVAILABLE_VOICES
from services.stt_service import record_and_transcribe

from .base import BaseAgent


class VoiceAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="VoiceAgent",
            description="Handle speech-to-text and text-to-speech via KittenTTS.",
        )
        log.info(f"VoiceAgent initialized (TTS voices: {', '.join(AVAILABLE_VOICES)})")

    async def process_request(
        self, action: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        if action == "speak":
            text = parameters.get("text")
            voice = parameters.get("voice")
            return self.speak(text, voice=voice)
        elif action == "listen":
            duration = parameters.get("duration", 5)
            return self.listen(duration=duration)
        return {"error": "Unknown action"}

    def speak(self, text: str, voice: str = None) -> Dict[str, Any]:
        if not text:
            return {"error": "No text provided"}

        log.info(f"Speaking: {text[:80]}...")
        success = tts_speak(text, voice=voice, blocking=True)

        if success:
            return {"status": "success", "message": "Spoken via KittenTTS"}
        else:
            return {"error": "TTS engine not available or failed"}

    def listen(self, duration: int = 5) -> Dict[str, Any]:
        log.info(f"Listening for {duration}s...")
        text = record_and_transcribe(duration=duration)

        if text:
            log.info(f"Transcribed: {text}")
            return {"text": text.strip()}
        else:
            return {"error": "Could not transcribe audio"}


voice_agent = VoiceAgent()
