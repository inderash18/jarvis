"""
JARVIS Backend — Quick Run Script
──────────────────────────────────
Usage:
  python run.py
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app", "agents", "services", "ws", "schemas", "utils"],
    )
