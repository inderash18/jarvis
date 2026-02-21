"""
Chief Agent — Main orchestrator for JARVIS.
────────────────────────────────────────────
Routes user commands to specialized agents via LLM.
"""

import json
import re
from typing import Any, Dict

from langchain_ollama import OllamaLLM

from app.config import settings
from utils.logger import log
from schemas.command_schema import AgentAction, AgentResponse

from .automation_agent import AutomationAgent
from .base import BaseAgent
from .canvas_agent import CanvasAgent
from .image_agent import ImageAgent
from .memory_agent import MemoryAgent
from .vision_agent import VisionAgent
from .voice_agent import VoiceAgent


class ChiefAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="ChiefAgent", description="Main orchestrator.")
        self.canvas_agent = CanvasAgent()
        self.automation_agent = AutomationAgent()
        self.memory_agent = MemoryAgent()
        self.image_agent = ImageAgent()
        self.voice_agent = VoiceAgent()
        self.vision_agent = VisionAgent()

        # Ollama LLM via LangChain
        self.llm = OllamaLLM(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.LLM_MODEL,
            temperature=0.1,
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
        4. VoiceAgent: Use when explicitly asked to speak or listen via backend.
           - speak(text)
           - listen(duration=5)
        5. VisionAgent: Use when asked to see or check the camera.
           - capture_frame()
           - detect_hands()

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

    # ── Agent Dispatcher ─────────────────────────────
    def _get_agent(self, name: str):
        """Map agent name string to the actual agent instance."""
        agents = {
            "CanvasAgent": self.canvas_agent,
            "AutomationAgent": self.automation_agent,
            "ImageAgent": self.image_agent,
            "VoiceAgent": self.voice_agent,
            "VisionAgent": self.vision_agent,
            "MemoryAgent": self.memory_agent,
        }
        return agents.get(name)

    # ── JSON Extraction ──────────────────────────────
    @staticmethod
    def _extract_json(text: str) -> str:
        """Extract JSON string from LLM response (handles code blocks)."""
        text = text.strip()
        if "```" in text:
            code_blocks = re.findall(r"```(?:json)?(.*?)```", text, re.DOTALL)
            if code_blocks:
                text = code_blocks[0].strip()
        try:
            start = text.index("{")
            end = text.rindex("}") + 1
            return text[start:end]
        except ValueError:
            return text

    # ── Streaming Request ────────────────────────────
    async def stream_request(self, command: str):
        log.info(f"ChiefAgent streaming: {command}")
        prompt = f"{self.system_prompt}\n\nUSER REQUEST: {command}"

        full_response = ""
        try:
            print("OLLAMA LIVE STREAM: ", end="", flush=True)
            async for chunk in self.llm.astream(prompt):
                print(chunk, end="", flush=True)
                yield chunk
                full_response += chunk
            print("\n[STREAM COMPLETE]")

            # Parse and execute actions
            results = await self._process_actions(full_response)
            if results:
                yield f"__EXECUTION_RESULTS__:{json.dumps(results)}"

        except Exception as e:
            log.error(f"Streaming error: {e}")
            yield f"\n[ERROR: {str(e)}]"

    # ── Action Processing ────────────────────────────
    async def _process_actions(self, response_text: str):
        log.debug("Processing actions from full response")
        results = []
        try:
            json_str = self._extract_json(response_text)
            parsed = json.loads(json_str)
            actions_data = parsed.get("actions", [])

            for action_data in actions_data:
                agent = self._get_agent(action_data.get("agent"))
                if agent:
                    res = await agent.process_request(
                        action_data.get("action"),
                        action_data.get("parameters", {}),
                    )
                    if res:
                        results.append(res)

            return results
        except Exception as e:
            log.error(f"Action processing error: {e}")
            return []

    # ── Synchronous Request (non-streaming) ──────────
    async def process_request(
        self, command: str, context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        log.info(f"ChiefAgent processing: {command}")

        prompt = f"{self.system_prompt}\n\nUSER REQUEST: {command}"
        response_text = self.llm.invoke(prompt)
        log.debug(f"LLM Response: {response_text}")

        try:
            json_str = self._extract_json(response_text)
            parsed = json.loads(json_str)
            actions_data = parsed.get("actions", [])

            results = []
            for action_data in actions_data:
                agent = self._get_agent(action_data.get("agent"))
                if agent:
                    res = await agent.process_request(
                        action_data.get("action"),
                        action_data.get("parameters", {}),
                    )
                    results.append(res)

            return {"original_response": parsed, "execution_results": results}

        except json.JSONDecodeError:
            log.error("Failed to parse LLM JSON response")
            return {"error": "Invalid JSON from LLM"}
        except Exception as e:
            log.error(f"Error executing actions: {e}")
            return {"error": str(e)}


chief_agent = ChiefAgent()
