import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from .manager import manager
from agents.chief_agent import chief_agent
from core.logging import log

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
                    await manager.send_message(json.dumps({
                        "type": "status", 
                        "message": "Processing command..."
                    }), websocket)
                    
                    full_response_text = ""
                    # Stream chunks
                    async for chunk in chief_agent.stream_request(command):
                         full_response_text += chunk
                         await manager.send_message(json.dumps({
                             "type": "stream_token",
                             "token": chunk
                         }), websocket)
                    
                    # Send completion signal for frontend logic if needed
                    await manager.send_message(json.dumps({
                        "type": "result", 
                        "data": {"original_response": {"thought_process": full_response_text}}
                    }), websocket)
                    
            except json.JSONDecodeError:
                await manager.send_message(json.dumps({"error": "Invalid JSON"}), websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        log.info("Client disconnected")
