"""
Search Agent — Search the web for real-time information.
Uses DuckDuckGo Search (no API key required).
"""

from typing import Any, Dict, List
from ddgs import DDGS
from utils.logger import log
from .base import BaseAgent


class SearchAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="SearchAgent",
            description="Search the web for real-time information.",
        )

    async def process_request(
        self, action: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        if action == "web_search":
            query = parameters.get("query", "")
            return self.web_search(query)
        return {"error": "Unknown action"}

    def web_search(self, query: str) -> Dict[str, Any]:
        log.info(f"Searching internet (DDG) for info: {query}")
        try:
            with DDGS() as ddgs:
                # Text search
                results = list(ddgs.text(
                    query,
                    max_results=5,
                    safesearch="moderate",
                ))

            if results:
                formatted_results = [
                    {
                        "title": r.get("title", ""),
                        "snippet": r.get("body", ""),
                        "url": r.get("href", ""),
                    }
                    for r in results
                ]

                # Create a summarized text of the results
                summary = "\n".join([f"- {r['title']}: {r['snippet']}" for r in formatted_results])

                return {
                    "status": "success",
                    "agent": "SearchAgent",
                    "action": "web_search",
                    "results": formatted_results,
                    "summary": summary,
                    "query": query,
                    "message": f"Found {len(results)} search results.",
                }
            else:
                return {
                    "status": "no_results",
                    "query": query,
                    "message": f"No information found for '{query}'",
                }

        except Exception as e:
            log.error(f"Web search error: {e}")
            return {
                "status": "error",
                "query": query,
                "message": f"Error searching for information: {str(e)}",
            }


search_agent = SearchAgent()
