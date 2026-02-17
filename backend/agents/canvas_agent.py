from .base import BaseAgent
from typing import Dict, Any

class CanvasAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="CanvasAgent", description="Control the drawing canvas.")

    async def process_request(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        result = {"status": "success", "agent": "CanvasAgent", "action": action, "output": {}}
        
        if action == "draw_circle":
            # Logic to handle drawing (e.g., emit WebSocket event)
            # cm to px conversion: 96 DPI -> 1 cm = 37.79 px
            radius_px = int(parameters.get("radius_cm", 0) * 37.79)
            result["output"] = {
                "type": "circle",
                "x": parameters.get("x"),
                "y": parameters.get("y"),
                "radius": radius_px
            }
        
        elif action == "draw_rectangle":
            result["output"] = {"type": "rect", **parameters}
            
        elif action == "insert_image":
            # Image handling logic
            pass
            
        return result
