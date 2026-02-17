# JARVIS System Capabilities & Functionality

This document details the complete functional scope of the local JARVIS system.

## 🧠 Core Intelligence (The Brain)
- **Local LLM Execution**: Uses **Ollama (Mistral)** to process natural language commands locally without internet dependency.
- **Context Awareness**: Remembers past interactions using **ChromaDB** (Vector Memory) and **MongoDB** (Session Logs).
- **Multi-Agent Orchestration**: Breaks complex requests into sub-tasks delegated to specialized agents.
  - *Example*: "Research quantum computing and save a summary" -> ResearchAgent + MemoryAgent.

## 🎨 Interactive Canvas (The Visual Output)
- **Generative UI**: The system can draw diagrams, shapes, and layouts on a real-time React canvas.
- **Commands**:
  - "Draw a red circle with 5cm radius"
  - "Create a flowchart for a login process" (Planned)
  - "Show me the system architecture diagram"
- **Technical**: Maps physical units (cm) to pixels based on screen DPI.

## ⚙️ System Automation (The Hands)
- **App Control**: Opens and closes local applications (VS Code, Chrome, Spotify).
- **File Management**: Creates, organizes, and searches files/folders.
- **Shell Execution**: Runs terminal commands safely.
- **Keyboard/Mouse**: Can simulate input (e.g., typing text, clicking buttons).

## 👁️ Computer Vision (The Eyes)
- **Webcam Feed**: Real-time video analysis using **OpenCV**.
- **Object Detection**: Identifies objects (people, phones, cups) using **YOLO/MediaPipe**.
- **Screen Analysis**: Can "see" your screen to answer questions about what you're working on.
- *Status*: Basic capture implemented; advanced analysis in progress.

## 🔊 Voice Interaction (The Mouth & Ears)
- **Wake Word**: "Hey Jarvis" (Planned via Porcupine/OpenWakeWord).
- **Speech-to-Text**: High-performance local transcription using **Faster-Whisper**.
- **Text-to-Speech**: Natural sounding voice using **Coqui TTS** or **Bark**.
- *Status*: Basic pipeline structure ready.

## 🛡️ Security & Privacy
- **100% Local**: No data leaves your machine.
- **Permission System**: Critical system commands (delete files, execute code) require user confirmation.

## 🔄 Workflow Examples

### 1. "Design Mode"
> **User**: "Draw a prototype for a login screen."
> **JARVIS**: 
> 1. Activates `CanvasAgent`.
> 2. Renders a rectangle (phone frame).
> 3. Adds input fields and a button.

### 2. "Productivity Mode"
> **User**: "Open my project 'Titan' and find the latest logs."
> **JARVIS**:
> 1. `AutomationAgent` opens VS Code to `i:\Titan`.
> 2. `AutomationAgent` runs `grep` to find error logs.
> 3. Summarizes the errors using the LLM.

### 3. "Research Mode"
> **User**: "What did we discuss about the database schema yesterday?"
> **JARVIS**:
> 1. `MemoryAgent` queries the vector database for "database schema" + "yesterday".
> 2. Retrieves the relevant context.
> 3. Generates a summary answer.
