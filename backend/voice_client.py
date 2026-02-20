import asyncio
import json
import os
import queue
import sys
import threading
import time

import numpy as np
import pyttsx3
import sounddevice as sd
import websocket
from faster_whisper import WhisperModel

# Configuration
WAKE_WORD = "jarvis"
SERVER_URL = "ws://localhost:8000/ws/chief"
SAMPLE_RATE = 16000
BLOCK_SIZE = 4096
SILENCE_THRESHOLD = 0.01  # Adjust based on mic sensitivity
SILENCE_DURATION = 1.0  # Seconds of silence to end command


class JarvisClient:
    def __init__(self):
        print("Initializing Jarvis Client...")
        self.model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
        self.engine = pyttsx3.init()
        self.ws = None
        self.audio_queue = queue.Queue()
        self.is_speaking = False
        self.state = "WAITING_WAKE_WORD"
        self.command_buffer = []
        self.silence_start = None

    def on_message(self, ws, message):
        try:
            data = json.loads(message)
            if data.get("type") == "result":
                original = data.get("data", {}).get("original_response", {})
                text = original.get("thought_process", "")
                if text:
                    print(f"\nJARVIS: {text}")
                    self.speak(text)
        except Exception as e:
            print(f"Error parsing message: {e}")

    def on_error(self, ws, error):
        print(f"WS Error: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        print("WS Closed")

    def on_open(self, ws):
        print("Connected to JARVIS Backend")

    def speak(self, text):
        self.is_speaking = True
        self.engine.say(text)
        self.engine.runAndWait()
        self.is_speaking = False
        # Clear queue after speaking to avoid hearing itself
        with self.audio_queue.mutex:
            self.audio_queue.queue.clear()

    def audio_callback(self, indata, frames, time, status):
        if not self.is_speaking:
            self.audio_queue.put(indata.copy())

    def process_loop(self):
        print(f"Status: {self.state}")

        buffer = []

        while True:
            if not self.audio_queue.empty():
                indata = self.audio_queue.get()
                energy = np.linalg.norm(indata) / len(indata)

                # Simple VAD logic
                is_speech = energy > SILENCE_THRESHOLD

                if self.state == "WAITING_WAKE_WORD":
                    buffer.append(indata)
                    # Keep buffer around 2 seconds
                    if len(buffer) * BLOCK_SIZE > SAMPLE_RATE * 2:
                        buffer.pop(0)

                    # Periodically transcribe buffer (every 1s approx)
                    if len(buffer) % 10 == 0:
                        audio_data = np.concatenate(buffer).flatten()
                        segments, _ = self.model.transcribe(audio_data, beam_size=1)
                        text = " ".join([s.text for s in segments]).lower().strip()
                        if WAKE_WORD in text:
                            print(f"\nWake Word Detected: '{text}'")
                            self.speak("Yes?")
                            self.state = "LISTENING_COMMAND"
                            buffer = []
                            self.command_buffer = []

                elif self.state == "LISTENING_COMMAND":
                    self.command_buffer.append(indata)

                    if is_speech:
                        self.silence_start = None
                    else:
                        if self.silence_start is None:
                            self.silence_start = time.time()
                        elif time.time() - self.silence_start > SILENCE_DURATION:
                            # Silence timeout - process command
                            print("Processing command...")
                            audio_data = np.concatenate(self.command_buffer).flatten()
                            segments, _ = self.model.transcribe(audio_data, beam_size=1)
                            command = " ".join([s.text for s in segments]).strip()
                            print(f"Command: {command}")

                            if command:
                                self.ws.send(json.dumps({"command": command}))

                            self.state = "WAITING_WAKE_WORD"
                            buffer = []
                            self.command_buffer = []
                            self.silence_start = None

            else:
                time.sleep(0.01)

    def start(self):
        # Start WebSocket
        self.ws = websocket.WebSocketApp(
            SERVER_URL,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close,
        )
        wst = threading.Thread(target=self.ws.run_forever)
        wst.daemon = True
        wst.start()

        # Start Audio
        with sd.InputStream(
            callback=self.audio_callback,
            channels=1,
            samplerate=SAMPLE_RATE,
            blocksize=BLOCK_SIZE,
        ):
            print("Microphone active. Waiting for 'Jarvis'...")
            self.process_loop()


if __name__ == "__main__":
    client = JarvisClient()
    client.start()
