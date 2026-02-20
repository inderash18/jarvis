import json
import re
from typing import Any, Dict

from core.config import settings
from core.logging import log

# from .voice_agent import VoiceAgent
# from .vision_agent import VisionAgent
from langchain_ollama import OllamaLLM
from schemas.command_schema import AgentAction, AgentResponse

from .automation_agent import AutomationAgent
from .base import BaseAgent
from .canvas_agent import CanvasAgent
from .image_agent import ImageAgent
from .memory_agent import MemoryAgent


class ChiefAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="ChiefAgent", description="Main orchestrator.")
        self.canvas_agent = CanvasAgent()
        self.automation_agent = AutomationAgent()
        self.memory_agent = MemoryAgent()
        self.image_agent = ImageAgent()

        # Using Ollama with LangChain
        self.llm = OllamaLLM(
            base_url=settings.OLLAMA_BASE_URL, model=settings.LLM_MODEL, temperature=0.1
        )

        self.system_prompt = """
        You are J.A.R.V.I.S, an advanced AI.

        AGENTS:
        1. CanvasAgent: Use for VISUAL requests (draw circle, rectangle, clear).
           - draw_circle(radius_cm, x, y)
           - draw_rectangle(width, height, x, y)
           - clear_canvas()
        2. AutomationAgent: Use ONLY for system control (open apps, create folders).
           - open_application(app_name)
           - create_folder(folder_name)
        3. ImageAgent: Use when asked to find or show images.
           - fetch_image(query)

        RULES:
        1. Return ONLY valid JSON.
        2. "thought_process": The text you speak to the user.
        3. "actions": List of commands.
        4. If the user asks a question (e.g., "What is 2+2?"), put the answer in "thought_process" and keep "actions" empty [].

        Example 1 (Drawing):
        User: "Draw a blue circle."
        {
          "thought_process": "Drawing a circle on the canvas, sir.",
          "actions": [
            {
              "agent": "CanvasAgent",
              "action": "draw_circle",
              "parameters": {"radius_cm": 5, "x": 960, "y": 540}
            }
          ]
        }

        Example 2 (Chat/Calculation):
        User: "What is 2 + 2?"
        {
          "thought_process": "The answer is 4, sir.",
          "actions": []
        }

        Example 3 (Image Search):
        User: "Show me a picture of Iron Man."
        {
          "thought_process": "Fetching an image of Iron Man for you, sir.",
          "actions": [
            {
              "agent": "ImageAgent",
              "action": "fetch_image",
              "parameters": {"query": "iron man"}
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
            results = await self._process_actions(full_response)

            # Yield the results as a special JSON string that the websocket handler can detect
            # Or better, we just rely on the websocket handler to parse the full response,
            # BUT the websocket handler doesn't run the actions! WE do.
            # So we must tell the websocket handler what the results were.
            # We will yield a special marker.
            if results:
                yield f"__EXECUTION_RESULTS__:{json.dumps(results)}"

        except Exception as e:
            log.error(f"Streaming error: {e}")
            yield f"\n[ERROR: {str(e)}]"

    async def _process_actions(self, response_text: str):
        log.debug(f"Processing actions from full response")
        results = []
        try:
            # Clean up response to extract JSON
            response_text = response_text.strip()
            if "```" in response_text:
                import re

                code_blocks = re.findall(
                    r"```(?:json)?(.*?)```", response_text, re.DOTALL
                )
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

                res = None
                if agent_name == "CanvasAgent":
                    res = await self.canvas_agent.process_request(action_name, params)
                elif agent_name == "AutomationAgent":
                    res = await self.automation_agent.process_request(
                        action_name, params
                    )
                elif agent_name == "ImageAgent":
                    res = await self.image_agent.process_request(action_name, params)

                if res:
                    results.append(res)

            return results

        except Exception as e:
            log.error(f"Action processing error: {e}")
            return []

    async def process_request(
        self, command: str, context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
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
                code_blocks = re.findall(
                    r"```(?:json)?(.*?)```", response_text, re.DOTALL
                )
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
                    res = await self.automation_agent.process_request(
                        action_name, params
                    )
                    results.append(res)
                elif agent_name == "ImageAgent":
                    res = await self.image_agent.process_request(action_name, params)
                    results.append(res)

            return {"original_response": parsed_response, "execution_results": results}

        except json.JSONDecodeError:
            log.error("Failed to parse LLM JSON response")
            return {"error": "Invalid JSON from LLM"}
        except Exception as e:
            log.error(f"Error executing actions: {e}")
            return {"error": str(e)}


chief_agent = ChiefAgent()
