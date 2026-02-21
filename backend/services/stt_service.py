"""
Whisper STT Service — Speech-to-Text
───────────────────────────────────────
Uses faster-whisper for lightweight, CPU-optimized speech recognition.
"""

from typing import Optional

import numpy as np

from app.config import settings
from utils.logger import log

# Lazy-loaded model
_stt_model = None


def _get_model():
    """Lazy-load the Whisper model on first use."""
    global _stt_model
    if _stt_model is None:
        try:
            from faster_whisper import WhisperModel

            model_size = settings.WHISPER_MODEL_SIZE or "base"
            log.info(f"Loading Whisper STT model: {model_size}")
            _stt_model = WhisperModel(model_size, device="cpu", compute_type="int8")
            log.info("Whisper STT model loaded successfully ✓")
        except ImportError:
            log.error("faster-whisper not installed. Install with: pip install faster-whisper")
        except Exception as e:
            log.error(f"Failed to load Whisper model: {e}")
    return _stt_model


def transcribe(audio_data: np.ndarray, beam_size: int = 5) -> str:
    """
    Transcribe audio data to text.

    Args:
        audio_data: numpy array of audio samples (16 kHz, mono, float32).
        beam_size:  Beam size for transcription accuracy.

    Returns:
        Transcribed text string, or empty string on failure.
    """
    model = _get_model()
    if model is None:
        return ""

    try:
        segments, _ = model.transcribe(audio_data, beam_size=beam_size)
        text = " ".join(seg.text for seg in segments).strip()
        log.debug(f"Transcribed: {text}")
        return text
    except Exception as e:
        log.error(f"STT transcription error: {e}")
        return ""


def record_and_transcribe(duration: int = 5) -> str:
    """
    Record audio from microphone and transcribe.

    Args:
        duration: Recording duration in seconds.

    Returns:
        Transcribed text string.
    """
    try:
        import sounddevice as sd

        fs = settings.AUDIO_SAMPLE_RATE
        log.info(f"Recording for {duration}s at {fs} Hz...")
        recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype="float32")
        sd.wait()
        return transcribe(recording.flatten(), beam_size=5)
    except Exception as e:
        log.error(f"Recording error: {e}")
        return ""
