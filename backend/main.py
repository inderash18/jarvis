"""
JARVIS Backend — Entry point (legacy compatibility).
Use `python run.py` for the recommended startup.
"""

# Re-export the FastAPI app for uvicorn compatibility
from app.main import app  # noqa: F401
