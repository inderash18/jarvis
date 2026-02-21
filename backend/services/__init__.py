"""
JARVIS Services Package
─────────────────────────
Database, Vector DB, TTS, STT, and System Monitor services.
"""

from .tts_service import speak, generate_audio, save_audio, AVAILABLE_VOICES
from .stt_service import transcribe, record_and_transcribe
