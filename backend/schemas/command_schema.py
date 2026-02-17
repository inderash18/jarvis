from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List, Union

class AgentAction(BaseModel):
    agent: str = Field(..., description="The name of the agent to execute the action (e.g., 'CanvasAgent')")
    action: str = Field(..., description="The specific function to call (e.g., 'draw_circle')")
    parameters: Dict[str, Any] = Field(..., description="Parameters required for the action")

class AgentResponse(BaseModel):
    actions: List[AgentAction]
    thought_process: Optional[str] = Field(None, description="The reasoning behind the actions")
    
class CanvasDrawCircle(BaseModel):
    radius_cm: float
    x: int
    y: int
    color: str = "blue"

class SystemCommand(BaseModel):
    command: str
    args: List[str] = []
