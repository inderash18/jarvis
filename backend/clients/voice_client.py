"""
JARVIS Voice Client — Standalone wake-word + voice interaction client
─────────────────────────────────────────────────────────────────────
Uses:
  • Whisper (faster-whisper) for speech-to-text
  • KittenTTS for text-to-speech (replaces pyttsx3)
  • WebSocket to communicate with the JARVIS backend

Run directly:
  python -m clients.voice_client
"""

import json
import queue
import threading
import time as time_module
import uuid
from typing import Optional

import numpy as np
import sounddevice as sd
from faster_whisper import WhisperModel
import pvporcupine
import struct
import os
from app.config import settings

# KittenTTS for high-quality voice synthesis
from services.tts_service import speak as tts_speak, generate_audio

# ─────────────────────────────────────────────
# Configuration (can also be pulled from app.config)
# ─────────────────────────────────────────────
WAKE_WORD = "hey jarvis"
SERVER_URL = "ws://localhost:8000/ws/chief"
SAMPLE_RATE = 16000
BLOCK_SIZE = 4096
SILENCE_THRESHOLD = 0.01
SILENCE_DURATION = 1.5
WHISPER_MODEL = "tiny.en"
TTS_VOICE = "Jasper"


class JarvisClient:
    def __init__(self):
        self.client_id = str(uuid.uuid4())[:8]
        print("=" * 50)
        print(f"   JARVIS Voice Client (ID: {self.client_id})")
        print("   TTS Engine: KittenTTS (15M params)")
        print("=" * 50)

        print(f"[INIT] Loading Whisper model '{WHISPER_MODEL}'...")
        self.model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
        print("[INIT] Whisper model loaded.")

        print("[INIT] KittenTTS will be loaded on first speak request (lazy load).")

        self.ws = None
        self.audio_queue = queue.Queue()
        self.is_speaking = False
        self.state = "WAITING_WAKE_WORD"
        self.command_buffer = []
        self.silence_start = None
        self.response_buffer = ""

        # --- Picovoice Porcupine Setup ---
        self.porcupine = None
        self.access_key = settings.PICOVOICE_ACCESS_KEY
        self.model_path = os.path.join(os.getcwd(), settings.PICOVOICE_MODEL_PATH)
        
        if self.access_key and os.path.exists(self.model_path):
            try:
                print(f"[INIT] Activating Porcupine Engine with model: {settings.PICOVOICE_MODEL_PATH}")
                self.porcupine = pvporcupine.create(
                    access_key=self.access_key,
                    keyword_paths=[self.model_path]
                )
                print("[INIT] Porcupine Wake Word Engine Active ✓")
            except Exception as e:
                print(f"[ERROR] Porcupine Init Failed: {e}. Falling back to Whisper.")
        else:
            print("[WARN] Picovoice Key or Model not found. Using Whisper fallback.")

    # ─────────────────────────────────────────
    # WebSocket Handlers
    # ─────────────────────────────────────────
    def on_message(self, ws, message):
        try:
            data = json.loads(message)
            msg_type = data.get("type")

            if msg_type == "stream_chunk":
                chunk = data.get("data", {}).get("chunk", "")
                self.response_buffer += chunk
                print(chunk, end="", flush=True)

            elif msg_type == "stream_end":
                print()
                self._speak_from_buffer()

            elif msg_type == "result":
                original = data.get("data", {}).get("original_response", {})
                source = original.get("source", "unknown")
                client_id = original.get("client_id", "unknown")
                
                # ONLY speak if this command came from THIS specific voice client!
                if source == "voice_client" and client_id == self.client_id:
                    text = original.get("response_to_user") or original.get("thought_process", "")
                    if text:
                        print(f"\nJARVIS: {text}")
                        self.speak(text)

        except Exception as e:
            print(f"[WS] Error parsing message: {e}")

    def _speak_from_buffer(self):
        """Extract thought_process from accumulated stream buffer and speak."""
        text = self.response_buffer.strip()
        self.response_buffer = ""

        try:
            start = text.index("{")
            end = text.rindex("}") + 1
            parsed = json.loads(text[start:end])
            thought = parsed.get("response_to_user") or parsed.get("thought_process", "")
            if thought:
                print(f"\nJARVIS: {thought}")
                self.speak(thought)
                return
        except Exception:
            pass

        if text:
            print(f"\nJARVIS: {text}")
            self.speak(text)

    def on_error(self, ws, error):
        print(f"[WS] Connection error: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        print("[WS] Connection closed. Reconnecting in 3s...")
        time_module.sleep(3)
        self._connect_websocket()

    def on_open(self, ws):
        print("[WS] Connected to JARVIS Backend ✓")
        print(f"\n🎙️  Listening for wake word: '{WAKE_WORD.upper()}'...\n")

    # ─────────────────────────────────────────
    # TTS (using KittenTTS)
    # ─────────────────────────────────────────
    def speak(self, text: str):
        """Speak text using KittenTTS (high quality, CPU-only)."""
        self.is_speaking = True

        try:
            tts_speak(text, voice=TTS_VOICE, blocking=True)
        except Exception as e:
            print(f"[TTS] KittenTTS error: {e}, falling back to print only.")

        self.is_speaking = False

        # Flush audio queue so we don't process our own voice
        with self.audio_queue.mutex:
            self.audio_queue.queue.clear()

        print(f"\n🎙️  Waiting for '{WAKE_WORD.upper()}'...\n")

    # ─────────────────────────────────────────
    # Audio Capture
    # ─────────────────────────────────────────
    def audio_callback(self, indata, frames, audio_time, status):
        if not self.is_speaking:
            self.audio_queue.put(indata.copy())

    # ─────────────────────────────────────────
    # Main Processing Loop
    # ─────────────────────────────────────────
    def process_loop(self):
        buffer = []
        last_transcribe_time = 0

        while True:
            if not self.audio_queue.empty():
                indata = self.audio_queue.get()
                energy = np.linalg.norm(indata) / len(indata)
                is_speech = energy > SILENCE_THRESHOLD

                # ── WAITING FOR WAKE WORD ──────────────────
                if self.state == "WAITING_WAKE_WORD":
                    # --- Porcupine Mode (Instant) ---
                    if self.porcupine:
                        # Convert float32 to int16 for Porcupine
                        pcm = (indata.flatten() * 32767).astype(np.int16)
                        # Porcupine expect frames of specific length
                        # But indata might be different from porcupine.frame_length
                        # For simplicity, we assume BLOCK_SIZE in config matches or we handle it
                        # The sounddevice streaming uses BLOCK_SIZE=4096, Porcupine usually 512
                        # We need to process in chunks of 512
                        for i in range(0, len(pcm), self.porcupine.frame_length):
                            frame = pcm[i:i + self.porcupine.frame_length]
                            if len(frame) == self.porcupine.frame_length:
                                keyword_index = self.porcupine.process(frame)
                                if keyword_index >= 0:
                                    print(f"\n✅ Wake word detected (Porcupine)!")
                                    self.speak("Yes, sir?")
                                    self._prepare_listening()
                                    break
                    
                    # --- Whisper Fallback (If porcupine failed or not used) ---
                    else:
                        buffer.append(indata)
                        max_blocks = int(SAMPLE_RATE * 2 / BLOCK_SIZE)
                        if len(buffer) > max_blocks:
                            buffer.pop(0)

                        now = time_module.time()
                        if buffer and (now - last_transcribe_time) >= 1.5:
                            last_transcribe_time = now
                            audio_data = np.concatenate(buffer).flatten()
                            segments, _ = self.model.transcribe(audio_data, beam_size=1)
                            text = " ".join([s.text for s in segments]).lower().strip()

                            if text:
                                print(f"[STT] Heard: {text}          ", end="\r")

                            if WAKE_WORD in text:
                                print(f"\n✅ Wake word detected (Whisper)!")
                                self.speak("Yes, sir?")
                                self._prepare_listening()
                                buffer = []
                                last_transcribe_time = 0

                # ── LISTENING FOR COMMAND ──────────────────
                elif self.state == "LISTENING_COMMAND":
                    self.command_buffer.append(indata)

                    if is_speech:
                        self.silence_start = None
                    else:
                        if self.silence_start is None:
                            self.silence_start = time_module.time()
                        elif time_module.time() - self.silence_start > SILENCE_DURATION:
                            print("\n[STT] Processing your command...")
                            audio_data = np.concatenate(self.command_buffer).flatten()
                            segments, _ = self.model.transcribe(audio_data, beam_size=1)
                            command = " ".join([s.text for s in segments]).strip()

                            if command:
                                print(f"[YOU]    {command}")
                                print(f"[JARVIS] Thinking...", end="\r")
                                if self.ws and self.ws.sock:
                                    self.ws.send(json.dumps({
                                        "command": command, 
                                        "source": "voice_client",
                                        "client_id": self.client_id
                                    }))
                                else:
                                    print("[WS] Not connected. Reconnecting...")
                                    self._connect_websocket()
                            else:
                                print("[STT] No command detected, resuming...")
                                print(f"\n🎙️  Waiting for '{WAKE_WORD.upper()}'...\n")

                            self.state = "WAITING_WAKE_WORD"
                            buffer = []
                            self.command_buffer = []
                            self.silence_start = None
            else:
                time_module.sleep(0.01)

    def _prepare_listening(self):
        """Prepare variables for command listening mode."""
        self.state = "LISTENING_COMMAND"
        self.command_buffer = []
        self.silence_start = None

    # ─────────────────────────────────────────
    # WebSocket Connection
    # ─────────────────────────────────────────
    def _connect_websocket(self):
        import websocket

        self.ws = websocket.WebSocketApp(
            SERVER_URL,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close,
        )
        wst = threading.Thread(target=self.ws.run_forever, daemon=True)
        wst.start()
        time_module.sleep(1)

    # ─────────────────────────────────────────
    # Entry Point
    # ─────────────────────────────────────────
    def start(self):
        self._connect_websocket()

        with sd.InputStream(
            callback=self.audio_callback,
            channels=1,
            samplerate=SAMPLE_RATE,
            blocksize=BLOCK_SIZE,
            dtype="float32",
        ):
            self.process_loop()


# ─────────────────────────────────────────────
if __name__ == "__main__":
    try:
        client = JarvisClient()
        client.start()
    except KeyboardInterrupt:
        print("\n[INFO] Jarvis Voice Client stopped.")
    except Exception as e:
        import traceback

        print(f"\n[CRITICAL ERROR] {e}")
        traceback.print_exc()
        input("\nPress Enter to exit...")
