"""
Memory Agent — Short-term and long-term memory management.
"""

from typing import Any, Dict

from services.vector_service import vector_service
from services.db_service import get_database
from .base import BaseAgent


class MemoryAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="MemoryAgent",
            description="Manage short-term and long-term memory.",
        )
        self.vector_service = vector_service

    async def process_request(
        self, action: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        if action == "save_memory":
            content = parameters.get("content")
            metadata = parameters.get("metadata", {})
            doc_id = self.vector_service.add_memory(content, metadata)
            return {"status": "success", "id": doc_id}

        elif action == "recall_memory":
            query = parameters.get("query")
            results = self.vector_service.search_memory(query)
            return {"status": "success", "results": results}

        return {"error": "Unknown action"}


memory_agent = MemoryAgent()
