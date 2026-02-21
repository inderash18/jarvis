"""
Command Schema — Pydantic models for agent actions and responses.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AgentAction(BaseModel):
    agent: str = Field(..., description="Agent to execute (e.g., 'CanvasAgent')")
    action: str = Field(..., description="Function to call (e.g., 'draw_circle')")
    parameters: Dict[str, Any] = Field(..., description="Parameters for the action")


class AgentResponse(BaseModel):
    actions: List[AgentAction]
    thought_process: Optional[str] = Field(
        None, description="The reasoning behind the actions"
    )


class CanvasDrawCircle(BaseModel):
    radius_cm: float
    x: int
    y: int
    color: str = "blue"


class SystemCommand(BaseModel):
    command: str
    args: List[str] = []
