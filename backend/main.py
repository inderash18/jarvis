from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.logging import log
from websocket.routes import router as websocket_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend for JARVIS - Advanced Local AI System",
)

# CORS Application
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(websocket_router)

from services.system_monitor import system_monitor
import asyncio

@app.on_event("startup")
async def startup_event():
    log.info("Starting JARVIS System...")
    # Initialize DB (TODO)
    # Start System Monitor loop
    asyncio.create_task(system_monitor.start_monitoring())

@app.on_event("shutdown")
async def shutdown_event():
    log.info("Shutting down JARVIS System...")
    system_monitor.stop()

@app.get("/")
async def root():
    return {"message": "JARVIS System Online", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "components": {"database": "unknown", "llm": "unknown"}}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
