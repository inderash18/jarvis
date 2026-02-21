import queue
import threading
import time
from typing import Any, Dict

import numpy as np
import pyttsx3
import sounddevice as sd
from core.config import settings
from core.logging import log
from faster_whisper import WhisperModel

from .base import BaseAgent


class VoiceAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="VoiceAgent", description="Handle speech-to-text and text-to-speech."
        )

        # Initialize TTS
        try:
            self.tts_engine = pyttsx3.init()
            self.tts_engine.setProperty("rate", 150)
            self.tts_engine.setProperty("volume", 0.9)
        except Exception as e:
            log.error(f"Failed to initialize pyttsx3: {e}")
            self.tts_engine = None

        # Initialize STT (Lazy load might be better but let's init here)
        try:
            log.info("Loading Whisper Model...")
            # Use 'tiny' or 'base' for speed on CPU
            model_size = settings.WHISPER_MODEL_SIZE or "base"
            self.stt_model = WhisperModel(model_size, device="cpu", compute_type="int8")
            log.info("Whisper Model Loaded.")
        except Exception as e:
            log.error(f"Failed to initialize Whisper: {e}")
            self.stt_model = None

    async def process_request(
        self, action: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        if action == "speak":
            text = parameters.get("text")
            return self.speak(text)
        elif action == "listen":
            return self.listen()
        return {"error": "Unknown action"}

    def speak(self, text: str):
        if not text:
            return {"error": "No text provided"}

        log.info(f"Speaking: {text}")
        if self.tts_engine:
            try:
                # pyttsx3 runAndWait blocks, so we might want to run in a thread
                # But for now, let's just run it.
                self.tts_engine.say(text)
                self.tts_engine.runAndWait()
                return {"status": "success", "message": "Spoken"}
            except Exception as e:
                log.error(f"TTS Error: {e}")
                return {"error": str(e)}
        else:
            return {"error": "TTS engine not initialized"}

    def listen(self, duration: int = 5):
        log.info(f"Listening for {duration} seconds...")
        if not self.stt_model:
            return {"error": "STT model not initialized"}

        try:
            # Record audio
            fs = 16000  # Sample rate
            recording = sd.rec(
                int(duration * fs), samplerate=fs, channels=1, dtype="float32"
            )
            sd.wait()  # Wait until recording is finished

            # Transcribe
            # Faster-whisper expects a file path or a numpy array
            segments, info = self.stt_model.transcribe(recording, beam_size=5)

            text = ""
            for segment in segments:
                text += segment.text

            log.info(f"Transcribed: {text}")
            return {"text": text.strip()}

        except Exception as e:
            log.error(f"Listening Error: {e}")
            return {"error": str(e)}


voice_agent = VoiceAgent()
