"""
KittenTTS Service — Lightweight Text-to-Speech
───────────────────────────────────────────────────
Provides high-quality voice synthesis using the KittenTTS model
(~15M parameters, CPU-optimized, <25MB).

Available voices: Bella, Jasper, Luna, Bruno, Rosie, Hugo, Kiki, Leo
"""

import io
from typing import Optional

import numpy as np
import sounddevice as sd

from app.config import settings
from utils.logger import log

# Lazy-loaded model instance
_tts_model = None


AVAILABLE_VOICES = ["Bella", "Jasper", "Luna", "Bruno", "Rosie", "Hugo", "Kiki", "Leo"]


def _get_model():
    """Lazy-load the KittenTTS model on first use."""
    global _tts_model
    if _tts_model is None:
        try:
            from kittentts import KittenTTS

            log.info(f"Loading KittenTTS model: {settings.TTS_MODEL_ID}")
            _tts_model = KittenTTS(settings.TTS_MODEL_ID)
            log.info("KittenTTS model loaded successfully ✓")
        except ImportError:
            log.error(
                "kittentts not installed. Install with:\n"
                "  pip install https://github.com/KittenML/KittenTTS/releases/download/0.8/kittentts-0.8.0-py3-none-any.whl"
            )
        except Exception as e:
            log.error(f"Failed to load KittenTTS model: {e}")
    return _tts_model


def generate_audio(
    text: str,
    voice: Optional[str] = None,
) -> Optional[np.ndarray]:
    """
    Generate audio waveform from text using KittenTTS.

    Args:
        text:  The text to synthesize.
        voice: One of the available voices. Defaults to settings.TTS_DEFAULT_VOICE.

    Returns:
        numpy array of audio samples at 24 kHz, or None on failure.
    """
    model = _get_model()
    if model is None:
        log.warning("TTS model not available — skipping generation")
        return None

    voice = voice or settings.TTS_DEFAULT_VOICE
    if voice not in AVAILABLE_VOICES:
        log.warning(f"Unknown voice '{voice}', falling back to '{settings.TTS_DEFAULT_VOICE}'")
        voice = settings.TTS_DEFAULT_VOICE

    try:
        log.debug(f"Generating speech: voice={voice}, text_len={len(text)}")
        audio = model.generate(text, voice=voice)
        return audio
    except Exception as e:
        log.error(f"TTS generation error: {e}")
        return None


def speak(text: str, voice: Optional[str] = None, blocking: bool = True) -> bool:
    """
    Generate and immediately play audio through the default speaker.

    Args:
        text:     Text to speak.
        voice:    Voice name (optional).
        blocking: If True, wait until playback finishes.

    Returns:
        True if successfully played, False otherwise.
    """
    audio = generate_audio(text, voice=voice)
    if audio is None:
        return False

    try:
        sd.play(audio, settings.TTS_SAMPLE_RATE)
        if blocking:
            sd.wait()
        return True
    except Exception as e:
        log.error(f"Audio playback error: {e}")
        return False


def save_audio(text: str, filepath: str, voice: Optional[str] = None) -> bool:
    """
    Generate audio and save to a WAV file.

    Args:
        text:     Text to synthesize.
        filepath: Output WAV file path.
        voice:    Voice name (optional).

    Returns:
        True on success, False on failure.
    """
    audio = generate_audio(text, voice=voice)
    if audio is None:
        return False

    try:
        import soundfile as sf

        sf.write(filepath, audio, settings.TTS_SAMPLE_RATE)
        log.info(f"Audio saved to {filepath}")
        return True
    except ImportError:
        log.error("soundfile not installed. Install with: pip install soundfile")
        return False
    except Exception as e:
        log.error(f"Failed to save audio: {e}")
        return False
