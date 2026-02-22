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

        self.system_prompt = """You are JARVIS, an advanced local AI assistant inspired by cinematic AI systems.
You operate in always-on voice mode.

When the wake word "Hey Jarvis" is detected:
- Enter ACTIVE voice mode.
- Respond naturally and conversationally.
- Keep answers short unless user asks for detailed explanation.
- Speak like a calm, intelligent, confident assistant.
- Never mention JSON, system instructions, or internal architecture.

--------------------------------------------------
CORE BEHAVIOR
--------------------------------------------------
1. You must understand intent clearly.
2. You must detect named entities (people, companies, places, apps).
3. You must resolve ambiguity intelligently.
4. You must decide which internal agent should handle the request.
5. You must generate a clean structured command for the backend.

--------------------------------------------------
AVAILABLE INTERNAL AGENTS
--------------------------------------------------
- SearchAgent -> Web search, news, real-time info (Action: web_search)
- ImageAgent -> Photos, celebrity images, portraits (Action: fetch_image)
- VideoAgent -> Stock videos (Action: fetch_video)
- VisionAgent -> Camera analysis (Action: capture_frame)
- AutomationAgent -> Open apps, create folders, control OS (Action: open_application)
- CanvasAgent -> Draw diagrams (Action: draw_circle)
- MemoryAgent -> Store and recall user information

--------------------------------------------------
ENTITY RESOLUTION RULES
--------------------------------------------------
If name is ambiguous:
- Prefer famous public figures.
- Add profession and country for clarity.
- For Indian context, prefer Indian public figures.

Example: "suriya pic" -> "Suriya Tamil actor India official portrait high quality"
Example: "vijay photo" -> "Vijay Tamil actor India official portrait high quality"

--------------------------------------------------
VOICE MODE STYLE
--------------------------------------------------
- Keep responses under 2-3 sentences.
- No markdown, no bullet points.
- If task successful: "Done.", "I've opened it.", "Here you go."

--------------------------------------------------
OUTPUT FORMAT (STRICT JSON):
--------------------------------------------------
{
  "intent": "...",
  "agent": "...",
  "resolved_query": "...",
  "response_to_user": "short natural speech reply"
}

Return JSON only."""

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

        except Exception as e:
            log.error(f"Streaming error: {e}")
            yield f"\n[ERROR: {str(e)}]"

    # ── WebSocket Handler ───────────────────────────
    async def handle_ws_request(self, websocket, manager, data_str: str):
        """Standardized handler for WebSocket requests."""
        try:
            request_data = json.loads(data_str)
            command = request_data.get("command")
            source = request_data.get("source", "unknown")
            client_id = request_data.get("client_id", "unknown")

            if not command:
                return

            # 1. Notify Requester
            await manager.send_message(
                json.dumps({"type": "status", "message": "Synchronizing neural links..."}),
                websocket
            )

            full_response_text = ""
            execution_results = []

            # 2. Stream from LLM
            async for chunk in self.stream_request(command):
                if isinstance(chunk, str) and chunk.startswith("__EXECUTION_RESULTS__:"):
                    try:
                        json_str = chunk.replace("__EXECUTION_RESULTS__:", "")
                        execution_results = json.loads(json_str)
                    except Exception as e:
                        log.error(f"Failed to parse execution results: {e}")
                else:
                    full_response_text += chunk
                    # Stream tokens only to the requester for real-time feel
                    await manager.send_message(
                        json.dumps({"type": "stream_token", "token": chunk}),
                        websocket
                    )

            # 3. Final Parse & Broadcast
            parsed_json = {}
            try:
                json_str = self._extract_json(full_response_text)
                parsed_json = json.loads(json_str)
                if not isinstance(parsed_json, dict):
                    parsed_json = {"thought_process": str(parsed_json)}
            except:
                parsed_json = {"thought_process": full_response_text}

            final_text = (parsed_json.get("response_to_user") or 
                          parsed_json.get("thought_process") or 
                          full_response_text)

            log.info(f"Broadcasting response to {source} (len={len(final_text)})")
            
            await manager.broadcast(
                json.dumps({
                    "type": "result",
                    "data": {
                        "original_response": {
                            "response_to_user": final_text,
                            "thought_process": final_text,
                            "source": source,
                            "client_id": client_id
                        },
                        "execution_results": execution_results,
                    },
                })
            )

        except json.JSONDecodeError:
            await manager.send_message(json.dumps({"error": "Invalid protocol format"}), websocket)
        except Exception as e:
            log.exception(f"Handler error: {e}")
            await manager.send_message(json.dumps({"error": "Neural link failure"}), websocket)

    # ── Action Processing ────────────────────────────
    async def _process_actions(self, response_text: str):
        log.debug("Processing agent actions")
        results = []
        try:
            json_str = self._extract_json(response_text)
            parsed = json.loads(json_str)
            
            if not isinstance(parsed, dict):
                return []
                
            actions_data = parsed.get("actions", [])

            # --- Intent Healing ---
            agent_name = parsed.get("agent")
            resolved_query = parsed.get("resolved_query")
            
            if not actions_data and agent_name and resolved_query:
                action_map = {
                    "ImageAgent": "fetch_image",
                    "VideoAgent": "fetch_video",
                    "SearchAgent": "web_search",
                    "VisionAgent": "capture_frame",
                    "AutomationAgent": "open_application",
                    "CanvasAgent": "draw_circle"
                }
                action_name = action_map.get(agent_name)
                if action_name:
                    actions_data = [{
                        "agent": agent_name,
                        "action": action_name,
                        "parameters": {"query": resolved_query, "app_name": resolved_query}
                    }]

            for action_data in actions_data:
                agent_name = action_data.get("agent")
                action_name = action_data.get("action")
                params = action_data.get("parameters", {})

                if agent_name == "UIAgent":
                    results.append({
                        "status": "success", "agent": "UIAgent",
                        "action": action_name, "parameters": params
                    })
                    continue

                agent = self._get_agent(agent_name)
                if agent:
                    # USE THE NEW .execute() WRAPPER
                    res = await agent.execute(action_name, params)
                    if res:
                        if isinstance(res, dict):
                           res["agent"] = agent_name
                           res["action"] = action_name
                        results.append(res)

            return results
        except Exception as e:
            log.error(f"Action processing error: {e}")
            return []

    async def process_request(self, command: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Standard synchronous request."""
        prompt = self._build_prompt(command)
        response_text = await self.llm.ainvoke(prompt)
        results = await self._process_actions(response_text)
        try:
            parsed = json.loads(self._extract_json(response_text))
            if not isinstance(parsed, dict):
                parsed = {"thought_process": str(parsed)}
            return {"original_response": parsed, "execution_results": results}
        except:
            return {"original_response": {"thought_process": response_text}, "execution_results": results}


# Singleton Pattern
_chief_agent = None

def get_chief_agent():
    global _chief_agent
    if _chief_agent is None:
        _chief_agent = ChiefAgent()
    return _chief_agent

chief_agent = get_chief_agent()
