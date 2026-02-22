@echo off
echo ═══════════════════════════════════════════
echo    J.A.R.V.I.S System Starting...
echo    TTS Engine: KittenTTS (15M params)
echo ═══════════════════════════════════════════
start cmd /k "title JARVIS_BACKEND && .venv\Scripts\activate && cd backend && python run.py"
start cmd /k "title JARVIS_FRONTEND && cd frontend && npm run dev"

echo [SYSTEM] Waiting for backend neural links...
timeout /t 8 > nul

start cmd /k "title JARVIS_VOICE && .venv\Scripts\activate && cd backend && python -m clients.voice_client"
echo.
echo [SYSTEM] Backend:  http://localhost:8000
echo [SYSTEM] Frontend: http://localhost:5173
echo [SYSTEM] Voice:    Active (Standalone Client)
echo.
echo 💡 Tip: Wait for the [MIC] bar to appear in the Voice terminal.
