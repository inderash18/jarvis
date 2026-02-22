"""
Video Agent — Search and fetch real videos from the internet.
Uses Pexels API.
"""

from typing import Any, Dict, List

from pexelsapi.pexels import Pexels as PexelsAPI

from app.config import settings
from utils.logger import log
from .base import BaseAgent


class VideoAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="VideoAgent",
            description="Search and fetch real videos from the internet.",
        )
        self.pexels = None
        if settings.PEXELS_API_KEY:
            try:
                self.pexels = PexelsAPI(settings.PEXELS_API_KEY)
                log.info("Pexels API initialized for VideoAgent.")
            except Exception as e:
                log.warning(f"Failed to init Pexels API for VideoAgent: {e}")

    async def process_request(
        self, action: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        if action == "fetch_video":
            query = parameters.get("query", "nature")
            return self.fetch_video(query)
        return {"error": "Unknown action"}

    def fetch_video(self, query: str) -> Dict[str, Any]:
        if not self.pexels:
            return {"error": "Pexels API key not configured for videos."}

        log.info(f"Searching Pexels for video: {query}")
        try:
            # search_videos returns a dict with 'videos' list
            results_dict = self.pexels.search_videos(query, page=1, per_page=5)
            videos = results_dict.get("videos", [])

            if videos:
                all_videos = []
                for vid in videos:
                    # Get the best link (usually the first one in video_files)
                    video_files = vid.get("video_files", [])
                    video_url = ""
                    if video_files:
                        # Prefer HD or high quality
                        video_url = video_files[0].get("link", "")
                    
                    all_videos.append({
                        "video_url": video_url,
                        "thumbnail": vid.get("image", ""),
                        "title": f"Video by {vid.get('user', {}).get('name', 'Pexels')}",
                        "source": vid.get("url", ""),
                        "duration": vid.get("duration", 0)
                    })

                best = all_videos[0]
                return {
                    "status": "success",
                    "video_url": best["video_url"],
                    "thumbnail": best["thumbnail"],
                    "title": best["title"],
                    "source": best["source"],
                    "all_videos": all_videos,
                    "query": query,
                    "message": f"Found {len(all_videos)} high-quality videos from Pexels",
                }
            else:
                return {
                    "status": "no_results",
                    "query": query,
                    "message": f"No videos found for '{query}'",
                }

        except Exception as e:
            log.error(f"Video search error: {e}")
            return {
                "status": "error",
                "query": query,
                "message": f"Error searching for videos: {str(e)}",
            }


video_agent = VideoAgent()
