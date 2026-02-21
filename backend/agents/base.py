"""
Base Agent — Abstract interface for all JARVIS agents.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List


class BaseAgent(ABC):
    """
    Abstract Base Class for all JARVIS Agents.
    Ensures a consistent interface for the ChiefAgent to orchestrate.
    """

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

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
