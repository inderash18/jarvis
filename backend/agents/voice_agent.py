from .base import BaseAgent
from typing import Dict, Any
# from faster_whisper import WhisperModel
# import sounddevice as sd
from core.logging import log

class VoiceAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="VoiceAgent", description="Handle speech-to-text and text-to-speech.")
        # self.model = WhisperModel("base", device="cpu", compute_type="int8")

    async def process_request(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        if action == "speak":
            text = parameters.get("text")
            return self.speak(text)
        elif action == "listen":
            return self.listen()
        return {"error": "Unknown action"}

    def speak(self, text: str):
        log.info(f"Speaking: {text}")
        # TTS logic here (e.g., pyttsx3 or Coqui)
        return {"status": "success", "message": "Spoken"}

    def listen(self):
        log.info("Listening for command...")
        # STT logic here
        return {"text": "dummy input"}

voice_agent = VoiceAgent()
