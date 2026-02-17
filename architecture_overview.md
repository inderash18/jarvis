# JARVIS System Architecture

## Core Components

### 1. Backend (Python/FastAPI)
- **Framework**: FastAPI (Async)
- **Orchestrator**: `ChiefAgent` (uses Ollama/LangChain)
- **Agents**:
  - `CanvasAgent`: Handles drawing commands.
  - `AutomationAgent`: Handles system commands (files, apps).
  - `MemoryAgent`: Handles vector storage/retrieval.
  - `VisionAgent`, `VoiceAgent`: Stubs for future expansion.
- **Database**: 
  - MongoDB (Metadata, Logs)
  - ChromaDB (Vector Embeddings)

### 2. Frontend (React/Vite)
- **Styling**: Tailwind CSS + Custom Neon Theme.
- **State**: React Hooks + WebSocket.
- **Components**:
  - `Dashboard`: Main HUD.
  - `Canvas`: Real-time drawing surface.
  - `CommandInput`: Chat interface.

### 3. Communication
- **Protocol**: WebSocket (`ws://localhost:8000/ws/chief`)
- **Format**: JSON Strict Mode via Pydantic Schemas.

## How to Run
1. **Start Backend**: `cd backend && python main.py` (or use `start_system.py`)
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Prerequisites**:
   - MongoDB running on port 27017.
   - Ollama running (`ollama serve`).

## Next Steps for User
- Install `ffmpeg` for audio processing.
- Install `CUDA` toolkit for faster inference if using NVIDIA GPU.
- Populate `MemoryAgent` with initial documents.
