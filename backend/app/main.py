"""
JARVIS FastAPI Entry Point
─────────────────────────────
Main FastAPI application with CORS, WebSocket, and lifecycle events.
"""

import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from utils.logger import log
from websocket.routes import router as websocket_router
from services.system_monitor import system_monitor

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend for JARVIS — Advanced Local AI System",
)

# ── CORS ────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── WebSocket Router ────────────────────────────────
app.include_router(websocket_router)


# ── Lifecycle Events ────────────────────────────────
@app.on_event("startup")
async def startup_event():
    log.info("Starting JARVIS System...")
    asyncio.create_task(system_monitor.start_monitoring())


@app.on_event("shutdown")
async def shutdown_event():
    log.info("Shutting down JARVIS System...")
    system_monitor.stop()


# ── Health Routes ───────────────────────────────────
@app.get("/")
async def root():
    return {"message": "JARVIS System Online", "status": "running"}


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "components": {
            "database": "unknown",
            "llm": "unknown",
            "tts": settings.TTS_ENGINE,
        },
    }


# ── Direct Run ──────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
