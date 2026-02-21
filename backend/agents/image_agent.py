"""
Image Agent — Search and fetch real images from the internet.
Uses DuckDuckGo Image Search (no API key required).
"""

from typing import Any, Dict, List

from ddgs import DDGS

from utils.logger import log
from .base import BaseAgent


class ImageAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="ImageAgent",
            description="Search and fetch real images from the internet.",
        )

    async def process_request(
        self, action: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        if action == "fetch_image":
            query = parameters.get("query", "technology")
            return self.fetch_image(query)
        return {"error": "Unknown action"}

    def fetch_image(self, query: str) -> Dict[str, Any]:
        log.info(f"Searching internet for image: {query}")
        try:
            with DDGS() as ddgs:
                results = list(ddgs.images(
                    query,
                    max_results=5,
                    safesearch="moderate",
                ))

            if results:
                # Return the best (first) result + extras
                best = results[0]
                image_url = best.get("image", "")
                thumbnail = best.get("thumbnail", "")
                title = best.get("title", "")
                source = best.get("url", "")

                # Collect all image URLs for the frontend
                all_images = [
                    {
                        "image_url": r.get("image", ""),
                        "thumbnail": r.get("thumbnail", ""),
                        "title": r.get("title", ""),
                        "source": r.get("url", ""),
                    }
                    for r in results
                ]

                log.info(f"Found {len(results)} images for '{query}'")
                return {
                    "status": "success",
                    "image_url": image_url,
                    "thumbnail": thumbnail,
                    "title": title,
                    "source": source,
                    "all_images": all_images,
                    "query": query,
                    "message": f"Found {len(results)} images for '{query}' from the internet",
                }
            else:
                log.warning(f"No images found for: {query}")
                return {
                    "status": "no_results",
                    "query": query,
                    "message": f"No images found for '{query}'",
                }

        except Exception as e:
            log.error(f"Image search error: {e}")
            return {
                "status": "error",
                "query": query,
                "message": f"Error searching for images: {str(e)}",
            }


image_agent = ImageAgent()
