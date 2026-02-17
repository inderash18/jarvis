@echo off
cd backend
echo 🚀 Starting JARVIS Backend...
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
