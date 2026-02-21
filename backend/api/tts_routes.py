"""
TTS REST API Routes
───────────────────
Provides an HTTP endpoint for text-to-speech using KittenTTS.
The frontend calls this instead of using browser speechSynthesis.
"""

import io
import numpy as np

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from utils.logger import log
from services.tts_service import generate_audio, AVAILABLE_VOICES
from app.config import settings

router = APIRouter(prefix="/api", tags=["tts"])


@router.get("/tts")
async def text_to_speech(
    text: str = Query(..., description="Text to synthesize"),
    voice: str = Query(None, description="Voice name"),
):
    """
    Generate speech audio from text using KittenTTS.
    Returns a WAV audio stream that the frontend can play directly.
    """
    voice = voice or settings.TTS_DEFAULT_VOICE

    if voice not in AVAILABLE_VOICES:
        voice = settings.TTS_DEFAULT_VOICE

    log.info(f"TTS API: voice={voice}, text_len={len(text)}")

    audio = generate_audio(text, voice=voice)

    if audio is None:
        # Fallback: return silence (so frontend doesn't error)
        log.warning("TTS generation failed, returning silence")
        audio = np.zeros(settings.TTS_SAMPLE_RATE, dtype=np.float32)

    # Convert numpy array to WAV bytes
    wav_bytes = _numpy_to_wav(audio, settings.TTS_SAMPLE_RATE)

    return StreamingResponse(
        io.BytesIO(wav_bytes),
        media_type="audio/wav",
        headers={
            "Content-Disposition": "inline; filename=speech.wav",
            "Cache-Control": "no-cache",
        },
    )


@router.get("/tts/voices")
async def list_voices():
    """List all available KittenTTS voices."""
    return {
        "voices": AVAILABLE_VOICES,
        "default": settings.TTS_DEFAULT_VOICE,
        "engine": "KittenTTS",
        "model": settings.TTS_MODEL_ID,
        "sample_rate": settings.TTS_SAMPLE_RATE,
    }


def _numpy_to_wav(audio: np.ndarray, sample_rate: int) -> bytes:
    """Convert a numpy float32 audio array to WAV format bytes."""
    import struct

    # Ensure float32
    audio = audio.astype(np.float32)

    # Clamp to [-1, 1]
    audio = np.clip(audio, -1.0, 1.0)

    # Convert to 16-bit PCM
    pcm = (audio * 32767).astype(np.int16)
    pcm_bytes = pcm.tobytes()

    # Build WAV header
    num_channels = 1
    sample_width = 2  # 16-bit = 2 bytes
    data_size = len(pcm_bytes)
    file_size = 36 + data_size

    wav_header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        file_size,
        b"WAVE",
        b"fmt ",
        16,  # chunk size
        1,   # PCM format
        num_channels,
        sample_rate,
        sample_rate * num_channels * sample_width,  # byte rate
        num_channels * sample_width,  # block align
        sample_width * 8,  # bits per sample
        b"data",
        data_size,
    )

    return wav_header + pcm_bytes
