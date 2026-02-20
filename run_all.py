import os
import signal
import subprocess
import sys
import time
from pathlib import Path

# Platform specific creation flags
CREATION_FLAGS = 0
if sys.platform == "win32":
    CREATION_FLAGS = subprocess.CREATE_NEW_CONSOLE


def start_process(command, cwd, name):
    print(f"🚀 Starting {name}...")
    try:
        return subprocess.Popen(
            command,
            cwd=Path(cwd),
            shell=(
                sys.platform != "win32"
            ),  # Shell=True on non-windows often helps with PATH, but on Windows explicit executable is safer
            creationflags=CREATION_FLAGS,
        )
    except Exception as e:
        print(f"❌ Failed to start {name}: {e}")
        return None


def main():
    print("==================================================")
    print("       J.A.R.V.I.S. SYSTEM INITIALIZATION        ")
    print("==================================================")

    # 1. Start Backend
    backend_cmd = [sys.executable, "main.py"]
    backend_process = start_process(backend_cmd, "backend", "Backend API")

    if not backend_process:
        print("Critical Error: Backend failed to start.")
        sys.exit(1)

    print("⏳ Waiting 5s for Backend to initialize...")
    time.sleep(5)

    # 2. Start Frontend
    # Check if npm is available or use 'npm.cmd' on windows if needed
    npm_cmd = (
        ["npm.cmd", "run", "dev"] if sys.platform == "win32" else ["npm", "run", "dev"]
    )
    frontend_process = start_process(npm_cmd, "frontend", "Frontend Dashboard")

    # 3. Start Voice Client
    voice_cmd = [sys.executable, "voice_client.py"]
    voice_process = start_process(voice_cmd, "backend", "Voice Client")

    print("\n✅ All Systems Operational")
    print(f"Backend PID: {backend_process.pid}")
    if frontend_process:
        print(f"Frontend PID: {frontend_process.pid}")
    if voice_process:
        print(f"Voice Client PID: {voice_process.pid}")

    print("\nPress Ctrl+C to shutdown all services.")

    try:
        while True:
            time.sleep(1)
            # Check if processes are still alive
            if backend_process.poll() is not None:
                print("⚠️ Backend exited unexpectedly!")
                break
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
    finally:
        # Cleanup
        if backend_process:
            backend_process.terminate()
        if frontend_process:
            frontend_process.terminate()
        if voice_process:
            voice_process.terminate()
        sys.exit(0)


if __name__ == "__main__":
    main()
