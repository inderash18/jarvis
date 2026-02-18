from .base import BaseAgent
from typing import Dict, Any
import importlib.util

# Lazy import cv2
cv2 = None
if importlib.util.find_spec("cv2"):
    import cv2

import mediapipe as mp
# import pytesseract
from core.logging import log

class VisionAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="VisionAgent", description="Analyze visual input.")
        self.camera_index = 0
        self.cap = None

    async def process_request(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        if cv2 is None:
            return {"error": "OpenCV (cv2) not installed."}
            
        if action == "capture_frame":
            return self.capture_frame()
        elif action == "analyze_screen":
            # Logic for screen capture using mss
            pass
        return {"error": "Unknown action"}

    def capture_frame(self):
        log.info("Capturing frame from webcam...")
        # Initialize if needed
        if self.cap is None or not self.cap.isOpened():
            self.cap = cv2.VideoCapture(self.camera_index)
        
        ret, frame = self.cap.read()
        if ret:
            # Save or process
            # cv2.imwrite("backend/images/capture.jpg", frame)
            self.cap.release() # Release for now to avoid locking
            return {"status": "success", "image_path": "backend/images/capture.jpg"}
        else:
            return {"status": "error", "message": "Could not read frame"}

vision_agent = VisionAgent()
