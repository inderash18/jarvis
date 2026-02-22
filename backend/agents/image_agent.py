"""
Image Agent — Search and fetch real images from the internet.
Uses DuckDuckGo Image Search (no API key required).
"""

from typing import Any, Dict, List

from duckduckgo_search import DDGS
from pexelsapi.pexels import Pexels as PexelsAPI

from app.config import settings
from utils.logger import log
from .base import BaseAgent


class ImageAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="ImageAgent",
            description="Search and fetch real images from the internet.",
        )
        self.pexels = None
        if settings.PEXELS_API_KEY:
            try:
                self.pexels = PexelsAPI(settings.PEXELS_API_KEY)
                log.info("Pexels API initialized for ImageAgent.")
            except Exception as e:
                log.warning(f"Failed to init Pexels API: {e}")

    async def process_request(
        self, action: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        if action == "fetch_image":
            query = parameters.get("query", "technology")
            return self.fetch_image(query)
        return {"error": "Unknown action"}

    def fetch_image(self, query: str) -> Dict[str, Any]:
        # Try Pexels first if available
        if self.pexels:
            try:
                log.info(f"Searching Pexels for: {query}")
                # search_photos returns a dict
                results_dict = self.pexels.search_photos(query, page=1, per_page=5)
                photos = results_dict.get("photos", [])

                if photos:
                    all_images = []
                    for photo in photos:
                        # Extract urls dict which has 'large', 'medium', etc.
                        urls = photo.get("src", {})
                        all_images.append({
                            "image_url": urls.get("large", ""),
                            "thumbnail": urls.get("medium", ""),
                            "title": f"Photo by {photo.get('photographer', 'Pexels')}",
                            "source": photo.get("url", "")
                        })

                    best = all_images[0]
                    return {
                        "status": "success",
                        "image_url": best["image_url"],
                        "thumbnail": best["thumbnail"],
                        "title": best["title"],
                        "source": best["source"],
                        "all_images": all_images,
                        "query": query,
                        "message": f"Found {len(all_images)} high-quality images from Pexels",
                    }
            except Exception as e:
                log.warning(f"Pexels search failed, falling back to DDG: {e}")

        # Fallback to DuckDuckGo
        log.info(f"Searching internet (DDG) for image: {query}")
        try:
            with DDGS() as ddgs:
                results = list(ddgs.images(
                    query,
                    max_results=5,
                    safesearch="moderate",
                ))

            if results:
                all_images = [
                    {
                        "image_url": r.get("image", ""),
                        "thumbnail": r.get("thumbnail", ""),
                        "title": r.get("title", ""),
                        "source": r.get("url", ""),
                    }
                    for r in results
                ]

                best = all_images[0]
                return {
                    "status": "success",
                    "image_url": best["image_url"],
                    "thumbnail": best["thumbnail"],
                    "title": best["title"],
                    "source": best["source"],
                    "all_images": all_images,
                    "query": query,
                    "message": f"Found {len(results)} images from the internet",
                }
            else:
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
