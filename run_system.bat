@echo off
echo ═══════════════════════════════════════════
echo    J.A.R.V.I.S System Starting...
echo    TTS Engine: KittenTTS (15M params)
echo ═══════════════════════════════════════════
start cmd /k ".venv\Scripts\activate && cd backend && python run.py"
start cmd /k "cd frontend && npm run dev"
echo.
echo [SYSTEM] Backend:  http://localhost:8000
echo [SYSTEM] Frontend: http://localhost:5173
echo [SYSTEM] WebSocket: ws://localhost:8000/ws/chief
