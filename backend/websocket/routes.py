"""
WebSocket Routes
────────────────
Handles the /ws/chief WebSocket endpoint.
Streams LLM responses and executes agent actions.
"""

import json
import re

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from agents.chief_agent import chief_agent
from utils.logger import log
from .manager import manager

router = APIRouter()


@router.websocket("/ws/chief")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            log.info(f"Received from client: {data}")

            try:
                request_data = json.loads(data)
                command = request_data.get("command")

                if command:
                    # Notify client
                    await manager.broadcast(
                        json.dumps({"type": "status", "message": "Processing command..."})
                    )

                    full_response_text = ""
                    execution_results = []

                    # Stream chunks from ChiefAgent
                    async for chunk in chief_agent.stream_request(command):
                        if isinstance(chunk, str) and chunk.startswith("__EXECUTION_RESULTS__:"):
                            try:
                                json_str = chunk.replace("__EXECUTION_RESULTS__:", "")
                                execution_results = json.loads(json_str)
                            except Exception as e:
                                log.error(f"Failed to parse execution results: {e}")
                        else:
                            full_response_text += chunk
                            await manager.broadcast(
                                json.dumps({"type": "stream_token", "token": chunk})
                            )

                    # Parse final thought_process from accumulated text
                    final_thought_process = full_response_text
                    try:
                        clean_text = full_response_text.strip()
                        if "```" in clean_text:
                            code_blocks = re.findall(
                                r"```(?:json)?(.*?)```", clean_text, re.DOTALL
                            )
                            if code_blocks:
                                clean_text = code_blocks[0].strip()

                        start = clean_text.find("{")
                        end = clean_text.rfind("}") + 1

                        if start != -1 and end > 0:
                            try:
                                parsed = json.loads(clean_text[start:end])
                                final_thought_process = parsed.get(
                                    "thought_process", full_response_text
                                )
                            except json.JSONDecodeError:
                                final_thought_process = clean_text
                        else:
                            final_thought_process = clean_text

                    except Exception as e:
                        log.error(f"Failed to parse final response: {e}")

                    # Send final result
                    log.info(
                        f"Sending result (thought_process len={len(final_thought_process)})"
                    )
                    await manager.broadcast(
                        json.dumps(
                            {
                                "type": "result",
                                "data": {
                                    "original_response": {
                                        "thought_process": final_thought_process
                                    },
                                    "execution_results": execution_results,
                                },
                            }
                        )
                    )

            except json.JSONDecodeError:
                await manager.send_message(
                    json.dumps({"error": "Invalid JSON"}), websocket
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        log.info("Client disconnected")
