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
    log.info("WebSocket connection attempt on /ws/chief")
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Delegate all logic to the ChiefAgent
            await chief_agent.handle_ws_request(websocket, manager, data)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        log.info("Client disconnected")
    except Exception as e:
        log.error(f"WebSocket unexpected error: {e}")
        manager.disconnect(websocket)
