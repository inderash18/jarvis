import json
import re
from .base import BaseAgent
from typing import Dict, Any
from .canvas_agent import CanvasAgent
from .automation_agent import AutomationAgent
from .memory_agent import MemoryAgent
# from .voice_agent import VoiceAgent
# from .vision_agent import VisionAgent
from langchain_ollama import OllamaLLM
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
        self.llm = OllamaLLM(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.LLM_MODEL,
            temperature=0.1
        )
        
        self.system_prompt = """
        You are J.A.R.V.I.S, a highly advanced AI assistant. 
        Persona: Witty, efficient, polite, slightly sarcastic. Address user as "Sir".
        
        Goal: Control local system and generate UI.
        
        AVAILABLE AGENTS:
        1. CanvasAgent: [draw_circle(radius_cm, x, y), draw_rectangle(width, height, x, y), insert_image, clear_canvas]
        2. AutomationAgent: [open_application(app_name), create_folder(folder_name), execute_command(command)]
        
        RESPONSE RULES:
        1. You MUST return ONLY a VALID JSON object. No markdown, no conversational text outside JSON.
        2. The JSON must have "thought_process" (string) and "actions" (list).
        3. "thought_process": Your spoken response to the user.
        4. "actions": List of objects with "agent", "action", "parameters".
        
        Example:
        {
          "thought_process": "Right away, sir. Opening Visual Studio Code.",
          "actions": [
            {
              "agent": "AutomationAgent",
              "action": "open_application",
              "parameters": {"app_name": "vscode"}
            }
          ]
        }
        """

    async def stream_request(self, command: str):
        log.info(f"ChiefAgent streaming: {command}")
        prompt = f"{self.system_prompt}\n\nUSER REQUEST: {command}"
        
        # Stream response
        full_response = ""
        try:
            # Use astrap to handle async streaming if verifyable, else iterate standard stream in thread or async wrapper
            # Langchain's Ollama supports stream() but it is synchronous generator usually, 
            # or astandard stream. We will use astream.
            print("OLLAMA LIVE STREAM: ", end="", flush=True)
            async for chunk in self.llm.astream(prompt):
                print(chunk, end="", flush=True)
                yield chunk
                full_response += chunk
            print("\n[STREAM COMPLETE]")
                
            # After streaming, parse actions
            await self._process_actions(full_response)
            
        except Exception as e:
            log.error(f"Streaming error: {e}")
            yield f"\n[ERROR: {str(e)}]"

    async def _process_actions(self, response_text: str):
        log.debug(f"Processing actions from full response")
        try:
            # Clean up response to extract JSON
            response_text = response_text.strip()
            if "```" in response_text:
                import re
                code_blocks = re.findall(r"```(?:json)?(.*?)```", response_text, re.DOTALL)
                if code_blocks:
                    json_str = code_blocks[0].strip()
                else:
                    json_str = response_text
            else:
                json_str = response_text

            # Try to find JSON object bounds if not clean
            try:
                start = json_str.index("{")
                end = json_str.rindex("}") + 1
                json_str = json_str[start:end]
            except ValueError:
                pass 
            
            parsed_response = json.loads(json_str)
            actions_data = parsed_response.get("actions", [])
            
            for action_data in actions_data:
                agent_name = action_data.get("agent")
                action_name = action_data.get("action")
                params = action_data.get("parameters", {})
                
                if agent_name == "CanvasAgent":
                    await self.canvas_agent.process_request(action_name, params)
                elif agent_name == "AutomationAgent":
                    await self.automation_agent.process_request(action_name, params)
                # We do not return anything here as the stream is the response
                
        except Exception as e:
            log.error(f"Action processing error: {e}")

    async def process_request(self, command: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        log.info(f"ChiefAgent processing: {command}")
        
        # 1. Retrieve Memory (TODO: Integrate VectorService here)
        
        # 2. Query LLM
        prompt = f"{self.system_prompt}\n\nUSER REQUEST: {command}"
        response_text = self.llm.invoke(prompt)
        
        log.debug(f"LLM Response: {response_text}")
        
        try:
            # Clean up response to extract JSON
            response_text = response_text.strip()
            if "```" in response_text:
                # Extract code block content
                code_blocks = re.findall(r"```(?:json)?(.*?)```", response_text, re.DOTALL)
                if code_blocks:
                    json_str = code_blocks[0].strip()
                else:
                    json_str = response_text
            else:
                json_str = response_text

            # Try to find JSON object bounds if not clean
            try:
                start = json_str.index("{")
                end = json_str.rindex("}") + 1
                json_str = json_str[start:end]
            except ValueError:
                pass  # Let json.loads fail naturally if no braces found
            
            # 3. Parse JSON
            parsed_response = json.loads(json_str)
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
