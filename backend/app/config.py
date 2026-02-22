"""
JARVIS Configuration Module
─────────────────────────────
Centralized settings management using Pydantic BaseSettings.
All config is driven by environment variables / .env file.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Project ──────────────────────────────────────
    PROJECT_NAME: str = "JARVIS"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    # ── Database ─────────────────────────────────────
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "jarvis_db"

    # ── Vector DB ────────────────────────────────────
    CHROMA_DB_PATH: str = "./data/chroma_db"

    # ── LLM (Ollama) ────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "llama3.2:1b"

    # ── Voice / TTS ──────────────────────────────────
    WHISPER_MODEL_SIZE: str = "base"
    TTS_ENGINE: str = "kitten"  # KittenTTS (lightweight, 15M params)
    TTS_MODEL_ID: str = "KittenML/kitten-tts-mini-0.8"
    TTS_DEFAULT_VOICE: str = "Jasper"
    TTS_SAMPLE_RATE: int = 24000

    # ── Vision ───────────────────────────────────────
    CAMERA_INDEX: int = 0

    # ── System ───────────────────────────────────────
    ALLOW_ORIGINS: List[str] = ["*"]

    # ── Audio / Voice Client ─────────────────────────
    WAKE_WORD: str = "hey jarvis"
    AUDIO_SAMPLE_RATE: int = 16000
    AUDIO_BLOCK_SIZE: int = 4096
    SILENCE_THRESHOLD: float = 0.01
    SILENCE_DURATION: float = 1.5

    # ── External APIs ────────────────────────────────
    PEXELS_API_KEY: str = ""
    PICOVOICE_ACCESS_KEY: str = ""
    PICOVOICE_MODEL_PATH: str = "hey-jarvis_en_windows_v4_0_0/hey-jarvis_en_windows_v4_0_0.ppn"

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"  # Allow extra fields in .env without crashing


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
