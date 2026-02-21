"""
Image Agent — Fetch and display images from the web.
"""

from typing import Any, Dict

from utils.logger import log
from .base import BaseAgent


class ImageAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="ImageAgent",
            description="Fetch and display images from the web.",
        )

    async def process_request(
        self, action: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        if action == "fetch_image":
            query = parameters.get("query", "technology")
            return self.fetch_image(query)
        return {"error": "Unknown action"}

    def fetch_image(self, query: str) -> Dict[str, Any]:
        log.info(f"Fetching image for query: {query}")
        image_url = f"https://loremflickr.com/1920/1080/{query.replace(' ', ',')}"
        return {
            "status": "success",
            "image_url": image_url,
            "query": query,
            "message": f"Found an image for {query}",
        }


image_agent = ImageAgent()
