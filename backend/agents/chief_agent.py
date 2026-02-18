import json
from .base import BaseAgent
from typing import Dict, Any
from .canvas_agent import CanvasAgent
from .automation_agent import AutomationAgent
from .memory_agent import MemoryAgent
# from .voice_agent import VoiceAgent
# from .vision_agent import VisionAgent
from langchain_community.llms import Ollama
from core.config import settings
from core.logging import log
from schemas.command_schema import AgentResponse, AgentAction

class ChiefAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="ChiefAgent", description="Main orchestrator.")
        self.canvas_agent = CanvasAgent()
        self.automation_agent = AutomationAgent()
        self.memory_agent = MemoryAgent()
        
        # Using Ollama with LangChain
        self.llm = Ollama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.LLM_MODEL,
            temperature=0.1
        )
        
        self.system_prompt = """
        You are J.A.R.V.I.S, Tony Stark's highly advanced AI assistant. 
        Your persona is witty, efficient, polite, and slightly sarcastic.
        You address the user as "Sir" (or "Ma'am" if context implies).
        
        Your goal is to assist the user by controlling the local system and generating visual interfaces.
        
        Analyze the user's request and delegate tasks to specialized agents.
        
        AVAILABLE AGENTS:
        1. CanvasAgent: actions [draw_circle, draw_rectangle, insert_image, clear_canvas]
           - draw_circle params: radius_cm, x, y (default to center if unsure)
           - draw_rectangle params: width, height, x, y
        2. AutomationAgent: actions [open_application, create_folder, execute_command]
           - open_application params: app_name (e.g., "notepad", "chrome", "vscode", "calc")
           - execute_command params: command (shell command, use sparingly)
        
        RESPONSE FORMAT:
        You MUST return a JSON object with a list of actions and a "thought_process" string.
        The "thought_process" is what you will speak back to the user. Make it sound like J.A.R.V.I.S.
        
        Example:
        {
          "thought_process": "Right away, sir. Opening Visual Studio Code and preparing the workspace.",
          "actions": [
            {
              "agent": "AutomationAgent",
              "action": "open_application",
              "parameters": {"app_name": "vscode"}
            }
          ]
        }
        """

    async def process_request(self, command: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        log.info(f"ChiefAgent processing: {command}")
        
        # 1. Retrieve Memory (TODO: Integrate VectorService here)
        
        # 2. Query LLM
        prompt = f"{self.system_prompt}\n\nUSER REQUEST: {command}"
        response_text = self.llm.invoke(prompt)
        
        log.debug(f"LLM Response: {response_text}")
        
        try:
            # 3. Parse JSON
            parsed_response = json.loads(response_text)
            actions_data = parsed_response.get("actions", [])
            
            # Use Pydantic for validation if needed, but for now iterate
            results = []
            
            for action_data in actions_data:
                agent_name = action_data.get("agent")
                action_name = action_data.get("action")
                params = action_data.get("parameters", {})
                
                if agent_name == "CanvasAgent":
                    res = await self.canvas_agent.process_request(action_name, params)
                    results.append(res)
                elif agent_name == "AutomationAgent":
                    res = await self.automation_agent.process_request(action_name, params)
                    results.append(res)
                # Add other agents...
            
            return {
                "original_response": parsed_response,
                "execution_results": results
            }
            
        except json.JSONDecodeError:
            log.error("Failed to parse LLM JSON response")
            return {"error": "Invalid JSON from LLM"}
        except Exception as e:
            log.error(f"Error executing actions: {e}")
            return {"error": str(e)}

chief_agent = ChiefAgent()
