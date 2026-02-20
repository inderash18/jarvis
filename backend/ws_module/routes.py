import json

from agents.chief_agent import chief_agent
from core.logging import log
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .manager import manager

router = APIRouter()


@router.websocket("/ws/chief")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            log.info(f"Received from client: {data}")

            # Process with Chief Agent
            # Expecting data like {"command": "draw red circle"}
            try:
                request_data = json.loads(data)
                command = request_data.get("command")

                if command:
                    # Notify client processing started
                    await manager.broadcast(
                        json.dumps(
                            {"type": "status", "message": "Processing command..."}
                        )
                    )

                    full_response_text = ""
                    execution_results = []

                    # Stream chunks
                    async for chunk in chief_agent.stream_request(command):
                        if isinstance(chunk, str) and chunk.startswith(
                            "__EXECUTION_RESULTS__:"
                        ):
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

                    # Send completion signal for frontend logic if needed
                    # Try to parse the accumulated JSON to extract the real thought process
                    final_thought_process = full_response_text
                    try:
                        # Clean code blocks if present
                        import re

                        clean_text = full_response_text.strip()
                        if "```" in clean_text:
                            code_blocks = re.findall(
                                r"```(?:json)?(.*?)```", clean_text, re.DOTALL
                            )
                            if code_blocks:
                                clean_text = code_blocks[0].strip()

                        # Attempt to extract JSON object
                        start = clean_text.find("{")
                        end = clean_text.rfind("}") + 1

                        if start != -1 and end != -1:
                            try:
                                json_str = clean_text[start:end]
                                parsed = json.loads(json_str)
                                final_thought_process = parsed.get(
                                    "thought_process", full_response_text
                                )
                            except json.JSONDecodeError:
                                # If JSON extraction fails, fallback to cleaned text
                                final_thought_process = clean_text
                        else:
                            # If no JSON braces found, assume raw text response
                            final_thought_process = clean_text

                    except Exception as e:
                        log.error(f"Failed to parse final response for voice: {e}")
                        # Keep full_response_text as fallback

                    # Ensure we send the result message
                    log.info(
                        f"Sending final result with thought_process length: {len(final_thought_process)}"
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
