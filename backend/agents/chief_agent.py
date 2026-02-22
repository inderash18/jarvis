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

        # Ollama LLM via LangChain (Deterministic)
        self.llm = OllamaLLM(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.LLM_MODEL,
            temperature=0.0,
            stop=["\n\n", "User:", "###"],
            num_predict=256,
        )

        self.system_prompt = """You are JARVIS, a world-class AI system controller (Project AVALON).
[BEHAVIOR]
- Respond in a calm, professional, and intelligent tone.
- Keep spoken responses (response_to_user) short (1-2 sentences).
- If a task is successful, say things like "Done.", "I've fetched that for you.", or "Opening it now."

[STRICT PROTOCOL]
- You MUST respond with a JSON object.
- Never output conversational text outside the JSON.

[AGENTS]
- SearchAgent (web_search): For news, facts, and general knowledge.
- ImageAgent (fetch_image): For photos, portraits, and pictures.
- VideoAgent (fetch_video): For video clips.
- AutomationAgent (open_application): To open apps like Chrome, Notepad, VSCode.
- VisionAgent (capture_frame): To analyze the camera feed.
- CanvasAgent: To draw shapes.

[ENTITY RESOLUTION]
- For images of people, include country and profession.
- Example: "suriya pic" -> ImageAgent, resolved_query: "Suriya Tamil actor India official portrait"

[SCHEMA]
{
  "intent": "Search/Image/Video/App/Draw/Chat",
  "agent": "AgentName",
  "resolved_query": "Optimized parameters",
  "response_to_user": "Your spoken reply"
}"""

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
        return f'{self.system_prompt}\n\nUser: "{command}"\n{{'

    # ── Streaming Request ────────────────────────────
    async def stream_request(self, command: str):
        log.info(f"ChiefAgent streaming: {command}")
        prompt = self._build_prompt(command)

        # We start with { but we only yield it if the model doesn't provide it
        full_response = "{"
        brace_depth = 0
        json_started = False
        json_complete = False
        
        try:
            print("OLLAMA LIVE STREAM: ", end="", flush=True)
            is_first_chunk = True
            async for chunk in self.llm.astream(prompt):
                if is_first_chunk:
                    is_first_chunk = False
                    # If model starts with {, we don't need to yield another one
                    if chunk.strip().startswith("{"):
                        yield chunk
                        full_response = chunk # Use the model's full JSON
                    else:
                        yield "{"
                        yield chunk
                        full_response = "{" + chunk
                else:
                    yield chunk
                    full_response += chunk

                # Track brace depth
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

            # 🔥 NEW: Process actions and yield results for handle_ws_request
            results = await self._process_actions(full_response)
            yield f"__EXECUTION_RESULTS__:{json.dumps(results)}"

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
                
                # Normalize response keys (Handle variations like 'response', 'reply', etc.)
                resp_keys = ["response_to_user", "response", "reply", "text", "message"]
                for k in resp_keys:
                    val = parsed_json.get(k)
                    if val and isinstance(val, str):
                        parsed_json["response_to_user"] = val
                        break
            except:
                parsed_json = {"thought_process": full_response_text}

            # Final speaker text with aggressive fallbacks
            speaker_text = parsed_json.get("response_to_user")
            
            # If explicit null or placeholder, use default
            if speaker_text is None or str(speaker_text).strip().lower() in ["null", "none", "reply"]:
                speaker_text = "Hello Sir. I'm ready to assist." if "hi" in command.lower() else "I've processed your request, Sir."

            final_text = (speaker_text or 
                          parsed_json.get("thought_process") or 
                          full_response_text)
            
            # Final sanity check: if it still looks like raw JSON, don't show the code
            if final_text.strip().startswith("{"):
                 final_text = "I've handled that, Sir."

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

            # 4. Supplemental Briefing (Explanation after display)
            explanation = await self._explain_results(command, execution_results)
            if explanation:
                log.info(f"Broadcasting supplemental briefing")
                await manager.broadcast(
                    json.dumps({
                        "type": "result",
                        "data": {
                            "original_response": {
                                "response_to_user": explanation,
                                "thought_process": "Supplemental Briefing",
                                "source": source,
                                "client_id": client_id
                            },
                            "execution_results": [],
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
        parsed = {}
        try:
            json_str = self._extract_json(response_text)
            parsed = json.loads(json_str)
        except:
            # --- Last Resort: Pattern Matching for conversational output ---
            log.warning("JSON Parse failed, trying pattern matching...")
            lower_text = response_text.lower()
            if any(w in lower_text for w in ["image", "pic", "photo", "picture"]):
                # Extract query after 'show' or 'of'
                match = re.search(r"(?:show|find|get)\s+(?:me\s+)?(?:a\s+)?(?:pic|image|photo)?\s*(?:of|for)?\s+([^.!?,]+)", lower_text)
                query = match.group(1).strip() if match else response_text
                parsed = {"agent": "ImageAgent", "resolved_query": query}
            elif any(w in lower_text for w in ["open", "launch", "start"]):
                match = re.search(r"(?:open|launch|start)\s+([^.!?,]+)", lower_text)
                app = match.group(1).strip() if match else response_text
                parsed = {"agent": "AutomationAgent", "resolved_query": app}
            elif any(w in lower_text for w in ["search", "tell me about", "what is"]):
                parsed = {"agent": "SearchAgent", "resolved_query": response_text}

        try:
            if not isinstance(parsed, dict):
                return []
                
            # Clean hallucinations
            if parsed.get("response_to_user") in ["Reply", None]:
                parsed["response_to_user"] = "I've handled that for you, Sir."
            if parsed.get("resolved_query") == "Query":
                parsed["resolved_query"] = ""

            # Normalization within agent processing too
            if "response" in parsed and not parsed.get("response_to_user"):
                parsed["response_to_user"] = parsed["response"]

            actions_data = parsed.get("actions", [])

            # --- Intent Healing (Auto-Action Detection) ---
            agent_name = parsed.get("agent")
            resolved_query = parsed.get("resolved_query")
            
            # Fuzzy match agent name if it's slightly off or smarter
            if agent_name and "Image" in agent_name: agent_name = "ImageAgent"
            if agent_name and "Search" in agent_name: agent_name = "SearchAgent"
            if agent_name and "Auto" in agent_name: agent_name = "AutomationAgent"

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
                    log.info(f"[HEALER] Auto-triggering {action_name} for {agent_name}")
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

    async def _explain_results(self, original_query: str, execution_results: list) -> str:
        """Generate a natural explanation based on agent findings."""
        if not execution_results:
            return None
            
        # Combine all summaries/messages
        context_data = ""
        for res in execution_results:
            if isinstance(res, dict):
                # Check for summary first (SearchAgent), then message (ImageAgent)
                data = res.get("summary") or res.get("message")
                if data and len(data) > 10: # Only explain if there's actual content
                    context_data += f"\n- Findings: {data}"
                    
        if not context_data:
            return None
            
        log.info("Generating supplemental briefing...")
        prompt = (
            f"You are JARVIS. Briefly explain the following result for '{original_query}'. "
            f"Keep it to one smooth sentence of spoken dialogue. "
            f"Current findings: {context_data}"
        )
        
        try:
            explanation = await self.llm.ainvoke(prompt)
            # Remove any JSON artifacts or headers if model hallucinates
            explanation = explanation.strip().replace('"', '').split('\n')[0]
            return explanation
        except Exception as e:
            log.warning(f"Supplemental briefing failed: {e}")
            return None

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
