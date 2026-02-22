from abc import ABC, abstractmethod
from typing import Any, Dict, List
from utils.logger import log


class BaseAgent(ABC):
    """
    Abstract Base Class for all JARVIS Agents.
    Ensures a consistent interface for the ChiefAgent to orchestrate.
    """

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

    async def execute(self, command: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Wrapper with logging and error handling."""
        log.info(f"[{self.name}] Processing: {command[:50]}...")
        try:
            result = await self.process_request(command, context)
            log.success(f"[{self.name}] Processing complete.")
            return result
        except Exception as e:
            log.error(f"[{self.name}] Failed: {str(e)}")
            return {"error": str(e), "agent": self.name}

    @abstractmethod
    async def process_request(
        self, command: str, context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Process a user command and return a structured result."""
        pass

    @property
    def tools(self) -> List[Dict[str, Any]]:
        """Return list of tools this agent provides to the ChiefAgent/LLM."""
        return []

    def __repr__(self):
        return f"<Agent name='{self.name}'>"
