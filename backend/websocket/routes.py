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
                    
                    result = await chief_agent.process_request(command)
                    
                    # Send result back
                    await manager.send_message(json.dumps({
                        "type": "result", 
                        "data": result
                    }), websocket)
                    
            except json.JSONDecodeError:
                await manager.send_message(json.dumps({"error": "Invalid JSON"}), websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        log.info("Client disconnected")
