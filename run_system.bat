@echo off
start cmd /k "cd backend && venv\Scripts\activate && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
start cmd /k "cd frontend && npm run dev"
echo J.A.R.V.I.S System Initiated...
