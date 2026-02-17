import psutil
import asyncio
from websocket.manager import manager
from core.logging import log
import json

class SystemMonitor:
    def __init__(self):
        self.running = False

    async def start_monitoring(self):
        self.running = True
        log.info("Starting System Monitor...")
        while self.running:
            try:
                # Collect stats
                cpu = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory()
                
                stats = {
                    "type": "system_stats",
                    "data": {
                        "cpu": cpu,
                        "memory_percent": memory.percent,
                        "memory_total_gb": round(memory.total / (1024**3), 1),
                        "memory_used_gb": round(memory.used / (1024**3), 1),
                    }
                }
                
                # Broadcast to all connected clients
                if manager.active_connections:
                    await manager.broadcast(json.dumps(stats))
                
                await asyncio.sleep(2) # Update every 2 seconds
            except Exception as e:
                log.error(f"Error in SystemMonitor: {e}")
                await asyncio.sleep(5)

    def stop(self):
        self.running = False

system_monitor = SystemMonitor()
