"""
System Monitor Service
──────────────────────
Broadcasts CPU / Memory stats to all connected WebSocket clients.
"""

import asyncio
import json

import psutil

from utils.logger import log
from ws.manager import manager


class SystemMonitor:
    def __init__(self):
        self.running = False

    async def start_monitoring(self):
        self.running = True
        log.info("Starting System Monitor...")
        while self.running:
            try:
                cpu = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory()

                stats = {
                    "type": "system_stats",
                    "data": {
                        "cpu": cpu,
                        "memory_percent": memory.percent,
                        "memory_total_gb": round(memory.total / (1024 ** 3), 1),
                        "memory_used_gb": round(memory.used / (1024 ** 3), 1),
                    },
                }

                if manager.active_connections:
                    await manager.broadcast(json.dumps(stats))

                await asyncio.sleep(2)
            except Exception as e:
                log.error(f"Error in SystemMonitor: {e}")
                await asyncio.sleep(5)

    def stop(self):
        self.running = False


system_monitor = SystemMonitor()