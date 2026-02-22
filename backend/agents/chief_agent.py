"""
Chief Agent — Main orchestrator for JARVIS.
────────────────────────────────────────────
Routes user commands to specialized agents via LLM.
"""

import json
import re
from datetime import datetime
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
from .video_agent import VideoAgent
from .vision_agent import VisionAgent
from .voice_agent import VoiceAgent
from .search_agent import SearchAgent


class ChiefAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="ChiefAgent", description="Main orchestrator.")
        self.canvas_agent = CanvasAgent()
        self.automation_agent = AutomationAgent()
        self.memory_agent = MemoryAgent()
        self.image_agent = ImageAgent()
        self.voice_agent = VoiceAgent()
        self.vision_agent = VisionAgent()
        self.video_agent = VideoAgent()
        self.search_agent = SearchAgent()

        # Ollama LLM via LangChain
        self.llm = OllamaLLM(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.LLM_MODEL,
            temperature=0.1,
            stop=["\n{\"thought", "\n\n{", "\n\n\n"],
            num_predict=512,
        )

        self.system_prompt = """You are JARVIS, an intelligent AI assistant. You respond in JSON.

CRITICAL RULE: Most requests are CHAT. Only use agents when the user EXPLICITLY asks for a specific action.
If the user asks a question, wants a story, joke, explanation, opinion, or conversation — put your FULL answer in "thought_process" and set "actions" to [].

WHEN TO USE AGENTS (only these specific cases):
1. CanvasAgent — ONLY when user says "draw", "sketch", or "clear canvas"
   - draw_circle(radius_cm, x, y)
   - draw_rectangle(width, height, x, y)
   - clear_canvas()
2. AutomationAgent — ONLY when user says "open [app]" or "create folder"
   - open_application(app_name)
   - create_folder(folder_name)
3. ImageAgent — ONLY when user says "image", "picture", "photo", or "wallpaper".
   - fetch_image(query)
4. VideoAgent — ONLY when user says "video", "clip", "movie", or "visuals".
   - fetch_video(query)
5. VisionAgent — ONLY when user says "camera", "look", or "see".
   - capture_frame()
   - detect_hands()
6. SearchAgent — ALWAYS USE for info about people, facts, news, or general knowledge.
   - web_search(query)
7. UIAgent — Use for dashboard control (e.g. "play").
   - play_video(index)

WHEN TO USE EMPTY ACTIONS (just chat):
- "Tell me a story", "Explain X", "What is Y", "How are you", etc.

RESPONSE FORMAT (strict JSON only):
{"thought_process": "...", "actions": []}

Example 1 — User: "Tell me a short story"
{"thought_process": "Once upon a time...", "actions": []}

Example 2 — User: "Show me a picture of mountains"
{"thought_process": "Fetching mountain images, sir.", "actions": [{"agent": "ImageAgent", "action": "fetch_image", "parameters": {"query": "mountains"}}]}

Example 3 — User: "What is 10 + 25?"
{"thought_process": "35, sir.", "actions": []}

Example 4 — User: "Open notepad"
{"thought_process": "Opening Notepad.", "actions": [{"agent": "AutomationAgent", "action": "open_application", "parameters": {"app_name": "notepad"}}]}

Example 5 — User: "Play the first video"
{"thought_process": "Playing the video.", "actions": [{"agent": "UIAgent", "action": "play_video", "parameters": {"index": 0}}]}

Example 6 — User: "Find me a video of ocean waves"
{"thought_process": "Searching for ocean wave videos, sir.", "actions": [{"agent": "VideoAgent", "action": "fetch_video", "parameters": {"query": "ocean waves"}}]}

Example 7 — User: "Who is the actor Rajinikanth?"
{"thought_process": "Searching for information about Rajinikanth, sir.", "actions": [{"agent": "SearchAgent", "action": "web_search", "parameters": {"query": "Rajinikanth actor biography"}}]}

REMEMBER: BE STRICT. If they ask for information, use SearchAgent.
Return ONLY the JSON object. No extra text."""

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
            "VideoAgent": self.video_agent,
            "SearchAgent": self.search_agent,
        }
        return agents.get(name)

    # ── JSON Extraction ──────────────────────────────
    @staticmethod
    def _extract_json(text: str) -> str:
        """Extract FIRST valid JSON object from LLM response."""
        text = text.strip()
        if "```" in text:
            code_blocks = re.findall(r"```(?:json)?(.*?)```", text, re.DOTALL)
            if code_blocks:
                text = code_blocks[0].strip()
        try:
            start = text.index("{")
            # Find the matching closing brace (first complete JSON object)
            depth = 0
            for i in range(start, len(text)):
                if text[i] == "{":
                    depth += 1
                elif text[i] == "}":
                    depth -= 1
                    if depth == 0:
                        return text[start:i + 1]
            # Fallback: take from first { to last }
            end = text.rindex("}") + 1
            return text[start:end]
        except ValueError:
            return text

    # ── Build prompt with live context ────────────────
    def _build_prompt(self, command: str) -> str:
        now = datetime.now()
        context = (
            f"CURRENT INFO: Date: {now.strftime('%A, %B %d, %Y')} | "
            f"Time: {now.strftime('%I:%M %p')} | "
            f"Day: {now.strftime('%A')}\n\n"
        )
        return f"{self.system_prompt}\n\n{context}USER REQUEST: {command}"

    # ── Streaming Request ────────────────────────────
    async def stream_request(self, command: str):
        log.info(f"ChiefAgent streaming: {command}")
        prompt = self._build_prompt(command)

        full_response = ""
        brace_depth = 0
        json_started = False
        json_complete = False

        try:
            print("OLLAMA LIVE STREAM: ", end="", flush=True)
            async for chunk in self.llm.astream(prompt):
                print(chunk, end="", flush=True)
                yield chunk
                full_response += chunk

                # Track brace depth to detect when first JSON is complete
                for ch in chunk:
                    if ch == "{":
                        json_started = True
                        brace_depth += 1
                    elif ch == "}":
                        brace_depth -= 1
                        if json_started and brace_depth == 0:
                            json_complete = True

                # Stop streaming once we have a complete JSON object
                if json_complete:
                    break

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
                agent_name = action_data.get("agent")
                action_name = action_data.get("action")
                params = action_data.get("parameters", {})

                # Handle Virtual Agents (Frontend-only)
                if agent_name == "UIAgent":
                    results.append({
                        "status": "success",
                        "agent": agent_name,
                        "action": action_name,
                        "parameters": params,
                        "message": f"UI command {action_name} forwarded to dashboard."
                    })
                    continue

                agent = self._get_agent(agent_name)
                if agent:
                    res = await agent.process_request(action_name, params)
                    if res:
                        # Ensure agent/action info is preserved for frontend
                        if isinstance(res, dict):
                           res["agent"] = agent_name
                           res["action"] = action_name
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

        prompt = self._build_prompt(command)
        response_text = self.llm.invoke(prompt)
        log.debug(f"LLM Response: {response_text}")

        try:
            results = await self._process_actions(response_text)
            json_str = self._extract_json(response_text)
            parsed = json.loads(json_str)
            return {"original_response": parsed, "execution_results": results}

        except json.JSONDecodeError:
            log.error("Failed to parse LLM JSON response")
            return {"error": "Invalid JSON from LLM"}
        except Exception as e:
            log.error(f"Error executing actions: {e}")
            return {"error": str(e)}


chief_agent = ChiefAgent()
