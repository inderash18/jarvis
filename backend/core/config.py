from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "JARVIS"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    # Database
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "jarvis_db"

    # Vector DB
    CHROMA_DB_PATH: str = "./chroma_db"

    # LLM
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "llama3.2:1b"

    # Voice
    WHISPER_MODEL_SIZE: str = "base"
    TTS_ENGINE: str = "coqui"  # or pyttsx3

    # Vision
    CAMERA_INDEX: int = 0

    # System
    ALLOW_ORIGINS: List[str] = ["*"]

    class Config:
        case_sensitive = True
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
