from typing import Any, Dict

from .base import BaseAgent


class CanvasAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="CanvasAgent", description="Control the drawing canvas.")

    async def process_request(
        self, action: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        result = {
            "status": "success",
            "agent": "CanvasAgent",
            "action": action,
            "output": {},
        }

        # Default center of screen (1920x1080)
        default_x = 960
        default_y = 540

        if action == "draw_circle":
            # cm to px conversion: 96 DPI -> 1 cm = 37.79 px
            radius_cm = parameters.get("radius_cm", 5)  # Default 5cm
            radius_px = int(radius_cm * 37.79)

            x = parameters.get("x", default_x)
            y = parameters.get("y", default_y)

            result["output"] = {"type": "circle", "x": x, "y": y, "radius": radius_px}

        elif action == "draw_rectangle":
            width_cm = parameters.get("width_cm", 10)
            height_cm = parameters.get("height_cm", 5)

            width_px = int(width_cm * 37.79)
            height_px = int(height_cm * 37.79)

            x = parameters.get("x", default_x - (width_px // 2))  # Center it
            y = parameters.get("y", default_y - (height_px // 2))

            result["output"] = {
                "type": "rect",
                "x": x,
                "y": y,
                "width": width_px,
                "height": height_px,
            }

        elif action == "clear_canvas":
            result["status"] = "cleared"
            result["output"] = {"type": "clear"}

        elif action == "insert_image":
            # Image handling logic
            pass

        return result
