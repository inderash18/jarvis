"""
Vision Agent — Camera capture and hand detection.
"""

import importlib.util
import os
from typing import Any, Dict

from utils.logger import log
from .base import BaseAgent

# Lazy-import cv2
cv2 = None
if importlib.util.find_spec("cv2"):
    import cv2

try:
    import mediapipe as mp
    from mediapipe.python.solutions import hands as mp_hands
    HAS_MEDIAPIPE = True
except ImportError:
    HAS_MEDIAPIPE = False

class VisionAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="VisionAgent", description="Analyze visual input.")
        self.camera_index = 0
        self.hands = None
        self.mp_hands = None

        if HAS_MEDIAPIPE:
            try:
                self.mp_hands = mp_hands
                self.hands = mp_hands.Hands(
                    static_image_mode=True,
                    max_num_hands=2,
                    min_detection_confidence=0.5,
                )
            except Exception as e:
                log.warning(f"MediaPipe Hands init failed: {e}")
        else:
            log.warning("MediaPipe not installed. Hand detection will be disabled.")

    async def process_request(
        self, action: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        if cv2 is None:
            return {"error": "OpenCV (cv2) not installed."}

        if action == "capture_frame":
            return self.capture_frame()
        elif action == "detect_hands":
            return self.detect_hands()
        return {"error": "Unknown action"}

    def capture_frame(self):
        log.info("Capturing frame from webcam...")
        cap = cv2.VideoCapture(self.camera_index)
        if not cap.isOpened():
            return {"error": "Could not open camera"}

        for _ in range(5):
            cap.read()

        ret, frame = cap.read()
        cap.release()

        if ret:
            os.makedirs("data/images", exist_ok=True)
            path = "data/images/capture.jpg"
            cv2.imwrite(path, frame)
            return {"status": "success", "image_path": path}
        else:
            return {"status": "error", "message": "Could not read frame"}

    def detect_hands(self):
        if not self.hands:
            return {"error": "Hand detection model not initialized"}

        log.info("Detecting hands...")
        cap = cv2.VideoCapture(self.camera_index)
        if not cap.isOpened():
            return {"error": "Could not open camera"}

        ret, frame = cap.read()
        cap.release()

        if not ret:
            return {"error": "Could not capture frame"}

        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(image_rgb)

        hand_count = 0
        details = []

        if results.multi_hand_landmarks:
            hand_count = len(results.multi_hand_landmarks)
            for hand_landmarks in results.multi_hand_landmarks:
                thumb_tip = hand_landmarks.landmark[self.mp_hands.HandLandmark.THUMB_TIP]
                index_tip = hand_landmarks.landmark[self.mp_hands.HandLandmark.INDEX_FINGER_TIP]
                details.append({"thumb_y": thumb_tip.y, "index_y": index_tip.y})

        return {
            "status": "success",
            "hand_count": hand_count,
            "message": f"Detected {hand_count} hands.",
            "details": details,
        }


vision_agent = VisionAgent()
