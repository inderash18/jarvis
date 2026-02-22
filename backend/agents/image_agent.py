"""
Image Agent — Search and fetch real images from the internet.
Uses DuckDuckGo Image Search (no API key required).
"""

from typing import Any, Dict, List

from ddgs import DDGS
from pexelsapi.pexels import Pexels as PexelsAPI
import wikipediaapi
import httpx
import re

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
        
        # Init Wikipedia API
        self.wiki = wikipediaapi.Wikipedia(
            user_agent="JARVIS/2.0 (contact: support@jarvis.ai)",
            language="en",
            extract_format=wikipediaapi.ExtractFormat.WIKI
        )

    async def process_request(
        self, action: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        if action == "fetch_image":
            query = parameters.get("query", "technology")
            # personality checks
            personality_keywords = ["actor", "actress", "singer", "director", "player", "person", "man", "woman", "leader", "vijay", "rajini", "samantha", "dhoni", "kohli", "modi"]
            is_personality = any(word in query.lower() for word in personality_keywords)

            # Try sources in order based on type
            if is_personality:
                # 1. Try Wikipedia (best for specific real people)
                res = self._try_wikipedia(query)
                if res["status"] == "success": return res
                # 2. Try DDG (better for news/current faces)
                res = self._try_ddg(query)
                if res["status"] == "success": return res
                # 3. Try Pexels (fallback)
                res = self._try_pexels(query)
                if res["status"] == "success": return res
            else:
                # 1. Try Pexels (high quality stock)
                res = self._try_pexels(query)
                if res["status"] == "success": return res
                # 2. Try Wikipedia (maybe it's a famous object?)
                res = self._try_wikipedia(query)
                if res["status"] == "success": return res
                # 3. Try DDG (fallback)
                res = self._try_ddg(query)
                if res["status"] == "success": return res

            return {"status": "error", "message": "Could not find any images, sir."}
        return {"error": "Unknown action"}

    def _try_pexels(self, query: str) -> Dict[str, Any]:
        if not self.pexels:
            return {"status": "error", "message": "Pexels not configured"}
        try:
            log.info(f"Trying Pexels for: {query}")
            results_dict = self.pexels.search_photos(query, page=1, per_page=5)
            photos = results_dict.get("photos", [])
            if photos:
                all_images = []
                for photo in photos:
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
                    "all_images": all_images,
                    "query": query,
                    "source_name": "Pexels",
                    "message": f"Found a high-quality photo related to {query} from Pexels."
                }
        except Exception as e:
            log.warning(f"Pexels failed: {e}")
        return {"status": "error"}

    def _try_wikipedia(self, query: str) -> Dict[str, Any]:
        log.info(f"Trying Wikipedia for: {query}")
        try:
            # 1. Search for the correct Page Title first
            search_api = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={query}&format=json&srlimit=1"
            search_resp = httpx.get(search_api).json()
            search_results = search_resp.get("query", {}).get("search", [])
            
            if not search_results:
                log.warning(f"No Wikipedia search results for: {query}")
                return {"status": "error"}
            
            correct_title = search_results[0]["title"]
            log.info(f"Wiki Found Correct Title: {correct_title}")

            # 2. Pull the 'original' image from Wikipedia API via httpx
            api_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={correct_title}&prop=pageimages&format=json&pithumbsize=1000"
            resp = httpx.get(api_url).json()
            pages = resp.get("query", {}).get("pages", {})
            for pid in pages:
                pdata = pages[pid]
                if "thumbnail" in pdata:
                    img_url = pdata["thumbnail"]["source"]
                    return {
                        "status": "success",
                        "image_url": img_url,
                        "thumbnail": img_url,
                        "all_images": [{"image_url": img_url, "thumbnail": img_url, "title": correct_title, "source": f"https://en.wikipedia.org/wiki/{correct_title.replace(' ', '_')}"}],
                        "query": query,
                        "source_name": "Wikipedia",
                        "message": f"Found an official portrait and article for {correct_title} on Wikipedia."
                    }
        except Exception as e:
            log.warning(f"Wikipedia failed for {query}: {e}")
        return {"status": "error"}

    def _try_ddg(self, query: str) -> Dict[str, Any]:
        log.info(f"Trying DDG for: {query}")
        try:
            # Refine query for personalities to get better results
            refined_query = query
            if any(word in query.lower() for word in ["actor", "actress", "singer", "person", "vijay", "samantha"]):
                refined_query = f"{query} official portrait high quality"

            with DDGS() as ddgs:
                results = list(ddgs.images(refined_query, max_results=5, safesearch="moderate"))
            
            if results:
                all_images = [
                    {
                        "image_url": r.get("image", ""),
                        "thumbnail": r.get("thumbnail", "") or r.get("image", ""),
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
                    "all_images": all_images,
                    "query": query,
                    "source_name": "Internet",
                    "message": f"Fetched the most relevant image for {query} from the web."
                }
        except Exception as e:
            log.warning(f"DDG failed (likely 403 or rate limit): {e}")
        return {"status": "error"}

    def fetch_image(self, query: str) -> Dict[str, Any]:
        # Legacy support for internal calls
        import asyncio
        return asyncio.run(self.process_request("fetch_image", {"query": query}))


image_agent = ImageAgent()
