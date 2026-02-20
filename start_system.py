import os
import subprocess
import sys
import time
from pathlib import Path


def start_backend():
    print("🚀 Starting Backend...")
    # Assumes venv is active or python is available
    return subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=Path("backend"),
        creationflags=subprocess.CREATE_NEW_CONSOLE,
    )


def start_frontend():
    print("🎨 Starting Frontend...")
    return subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=Path("frontend"),
        shell=True,
        creationflags=subprocess.CREATE_NEW_CONSOLE,
    )


def start_voice_client():
    print("🎤 Starting Voice Client...")
    return subprocess.Popen(
        [sys.executable, "voice_client.py"],
        cwd=Path("backend"),
        creationflags=subprocess.CREATE_NEW_CONSOLE,
    )


def main():
    print("==================================================")
    print("       J.A.R.V.I.S. SYSTEM INITIALIZATION        ")
    print("==================================================")

    # Check for .env
    if not os.path.exists("backend/.env"):
        print("⚠️  Warning: backend/.env not found. Creating default...")
        with open("backend/.env", "w") as f:
            f.write("MONGODB_URL=mongodb://localhost:27017\n")
            f.write("LOG_LEVEL=INFO\n")

    backend_process = start_backend()
    time.sleep(5)  # Wait for backend to warm up

    frontend_process = start_frontend()
    voice_process = start_voice_client()

    print("\n✅ System Operational")
    print("Backend: http://localhost:8000")
    print("Frontend: http://localhost:5173")
    print("Voice Client: Active")
    print("\nPress Ctrl+C to shutdown.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        backend_process.terminate()
        frontend_process.terminate()
        voice_process.terminate()
        sys.exit(0)


if __name__ == "__main__":
    main()
