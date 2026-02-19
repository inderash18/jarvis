import React, { useState, useEffect, useRef } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useVoice } from "../hooks/useVoice";
import { useSound } from "../hooks/useSound";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Activity,
  Database,
  Shield,
  Radio,
  Terminal,
  Zap,
} from "lucide-react";
import Canvas from "../components/Canvas";
import CommandInput from "../components/CommandInput";
import bgVideo from "../assets/LIVE_WALLPAPER_AI_JARVIS_-_IRON-MAN_STATUS_REALM_PC_DESKTOP_UPDATED_DOWNLOAD_LINK_1080P.mp4";

const MetricCard = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3 bg-jarvis-panel p-2 pr-4 hover:bg-white/5 transition-all group w-48 border-l-2 border-jarvis-primary/20 hover:border-jarvis-primary">
    <div
      className={`p-2 rounded bg-${color}-500/10 text-${color}-400 group-hover:text-${color}-300 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
    >
      <Icon size={14} />
    </div>
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-widest text-white/40">
        {label}
      </span>
      <span className="text-xs font-mono text-white/90 neon-text">{value}</span>
    </div>
  </div>
);

const Dashboard = () => {
  const { isConnected, status, messages, stats, sendMessage } = useWebSocket();
  const {
    speak,
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoice();
  const { playProcessing } = useSound();

  const [canvasCommands, setCanvasCommands] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  // System Stats
  const [metrics, setMetrics] = useState({
    cpu: 12,
    ram_percent: 45,
    ram_used: 4.2,
    ram_total: 16,
  });

  const [time, setTime] = useState(new Date());
  const logsEndRef = useRef(null);

  // Initialization State
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasWelcomed, setHasWelcomed] = useState(false);

  // Initial Interaction Overlay Handler
  const handleInitialize = () => {
    setIsInitialized(true);
    speak("Initializing systems... JARVIS is online.");
    setHasWelcomed(true);
  };

  // Update metrics from stats
  useEffect(() => {
    if (stats) {
      setMetrics({
        cpu: stats.cpu,
        ram_percent: stats.memory_percent,
        ram_used: stats.memory_used_gb,
        ram_total: stats.memory_total_gb,
      });
    }
  }, [stats]);

  // Simulate aliveness & Time
  useEffect(() => {
    const interval = setInterval(() => {
      if (!stats) {
        setMetrics((prev) => ({
          ...prev,
          cpu: Math.min(
            100,
            Math.max(0, prev.cpu + (Math.random() * 10 - 5)),
          ).toFixed(1),
          ram_percent: Math.min(
            100,
            Math.max(0, prev.ram_percent + (Math.random() * 2 - 1)),
          ).toFixed(1),
        }));
      }
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [stats]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Handle Messages
  useEffect(() => {
    if (!isInitialized) return;

    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last) {
        if (last.type === "status") {
          setIsProcessing(true);
          playProcessing();
          setStreamingText("");
        } else if (last.type === "assistant_response") {
          // Update streaming text from the aggregated content
          setStreamingText(last.content || "");

          // If streaming is done, trigger result logic
          if (!last.isStreaming && last.data) {
            setIsProcessing(false);
            if (last.data.execution_results) {
              setCanvasCommands((prev) => [
                ...prev,
                { type: "result", data: last.data },
              ]);
            }

            // Speak
            if (last.data.original_response?.thought_process) {
              const textToSpeak = last.data.original_response.thought_process;
              if (!textToSpeak.trim().startsWith("{")) {
                speak(textToSpeak);
              } else {
                try {
                  const parsed = JSON.parse(textToSpeak);
                  if (parsed.thought_process) speak(parsed.thought_process);
                } catch (e) {
                  speak("Command executed.");
                }
              }
            }
            setStreamingText("");
          }
        } else if (last.type === "result") {
          // Fallback for direct result messages if any
          setIsProcessing(false);
          if (last.data?.execution_results) {
            setCanvasCommands((prev) => [...prev, last]);
          }
          if (last.data?.original_response?.thought_process) {
            const textToSpeak = last.data.original_response.thought_process;
            speak(textToSpeak);
          }
          setStreamingText("");
        } else if (last.type === "error") {
          setIsProcessing(false);
          setStreamingText("");
          speak("An error occurred.");
        }
      }
    }
  }, [messages, speak, playProcessing, isInitialized]);

  // Safety Timeout for Processing State
  useEffect(() => {
    if (isProcessing) {
      const timer = setTimeout(() => {
        setIsProcessing(false);
        setStreamingText("");
      }, 30000); // 30s timeout
      return () => clearTimeout(timer);
    }
  }, [isProcessing]);
  const handleSendCommand = (cmd) => {
    if (cmd) {
      setIsProcessing(true);
      playProcessing();
      sendMessage(cmd);
      setStreamingText("");
    }
  };

  // Filter messages for display (hide raw stream tokens, show only completed or status)
  const displayMessages = messages.filter(
    (m) => m.type !== "stream_token" && m.type !== "status",
  );

  return (
    <div className="relative w-screen h-screen bg-jarvis-bg text-white font-mono overflow-hidden selection:bg-jarvis-primary/30">
      {/* Initialization Overlay */}
      {!isInitialized && (
        <div className="absolute inset-0 z-50 flex flex-col gap-4 items-center justify-center bg-black/90 backdrop-blur-sm">
          <button
            onClick={handleInitialize}
            className="px-8 py-4 border border-jarvis-primary text-jarvis-primary font-display tracking-[0.2em] hover:bg-jarvis-primary/10 transition-all shadow-[0_0_20px_rgba(0,243,255,0.3)] animate-pulse"
          >
            INITIALIZE SYSTEM
          </button>
          <button
            onClick={() =>
              speak("Audio check successful. Systems operational.")
            }
            className="text-xs text-white/40 hover:text-white underline"
          >
            Test Audio Output
          </button>
        </div>
      )}
      {/* Background & Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <video
          autoPlay
          loop
          muted
          className="w-full h-full object-cover opacity-30 mix-blend-screen grayscale contrast-125"
        >
          <source src={bgVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-jarvis-bg/60 to-jarvis-bg/95" />
        <div className="absolute inset-0 bg-scanlines opacity-20" />
      </div>

      {/* Canvas Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <Canvas
          commands={canvasCommands}
          isProcessing={isProcessing}
          isListening={isListening}
        />
      </div>

      {/* Main UI */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 pointer-events-none">
        {/* Header */}
        <div className="flex justify-between items-start pointer-events-auto">
          {/* Identity */}
          <div className="flex flex-col">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 border border-jarvis-primary rounded-full flex items-center justify-center bg-jarvis-primary/10 shadow-[0_0_15px_rgba(0,243,255,0.3)]">
                <Cpu size={20} className="text-jarvis-primary animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-[0.2em] font-display text-white drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]">
                  JARVIS
                </h1>
                <div className="flex items-center gap-2 text-[10px] text-jarvis-primary/70 tracking-widest">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500"}`}
                  />
                  <span>{status.toUpperCase()} // V.2.0.4</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-end gap-2"
          >
            <div className="text-5xl font-light tracking-widest text-white/90 font-display drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              {time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <MetricCard
                icon={Activity}
                label="CPU LOAD"
                value={`${metrics.cpu}%`}
                color="indigo"
              />
              <MetricCard
                icon={Database}
                label="MEMORY"
                value={`${metrics.ram_used}GB`}
                color="purple"
              />
              <MetricCard
                icon={Shield}
                label="SECURITY"
                value="MAXIMUM"
                color="green"
              />
            </div>
          </motion.div>
        </div>

        {/* Center Content Area */}
        <div className="flex-1 flex items-center justify-between px-8 py-4 pointer-events-none">
          {/* Left Panel: Neural Feed */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-[450px] h-[500px] flex flex-col pointer-events-auto"
          >
            <div className="bg-black/60 backdrop-blur-md border border-jarvis-primary/20 rounded-lg overflow-hidden flex flex-col h-full shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              {/* Terminal Header */}
              <div className="bg-jarvis-primary/10 p-2 border-b border-jarvis-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-jarvis-primary font-bold tracking-widest">
                  <Terminal size={12} /> NEURAL_LINK_ESTABLISHED
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                </div>
              </div>

              {/* Terminal Body */}
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar font-mono text-xs flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                  {displayMessages.slice(-5).map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="border-l-2 border-jarvis-primary/30 pl-3 py-1"
                    >
                      <div className="text-[10px] text-white/40 mb-1">
                        {new Date().toLocaleTimeString()}
                      </div>
                      <div className="text-white/80 whitespace-pre-wrap">
                        {msg.content ||
                          msg.data?.original_response?.thought_process ||
                          (typeof msg === "string" ? msg : JSON.stringify(msg))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Active Streaming Text */}
                {isProcessing && streamingText && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-l-2 border-jarvis-accent pl-3 py-1 bg-jarvis-accent/5"
                  >
                    <div className="text-[10px] text-jarvis-accent mb-1 animate-pulse">
                      PROCESSING...
                    </div>
                    <div className="text-jarvis-primary typing-cursor text-sm leading-relaxed">
                      {streamingText}
                    </div>
                  </motion.div>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </motion.div>

          {/* Right Panel: Agents Status */}
          <div className="flex flex-col gap-4 pointer-events-auto">
            {[
              "ChiefAgent",
              "CanvasAgent",
              "AutomationAgent",
              "VisionAgent",
            ].map((agent, i) => (
              <motion.div
                key={agent}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0, transition: { delay: i * 0.1 } }}
                className="flex items-center justify-end gap-4 group"
              >
                <div className="flex flex-col items-end">
                  <span className="text-[10px] tracking-[0.2em] text-white/40 group-hover:text-jarvis-primary transition-colors">
                    {agent.toUpperCase()}
                  </span>
                  <div
                    className={`text-[9px] tracking-widest ${isProcessing && agent === "ChiefAgent" ? "text-jarvis-accent animate-pulse" : "text-jarvis-primary/50"}`}
                  >
                    {isProcessing && agent === "ChiefAgent"
                      ? "PROCESSING"
                      : "ONLINE"}
                  </div>
                </div>
                <div
                  className={`w-10 h-10 rounded border ${isProcessing && agent === "ChiefAgent" ? "border-jarvis-accent bg-jarvis-accent/10" : "border-white/10 bg-black/40"} flex items-center justify-center group-hover:border-jarvis-primary/50 transition-colors shadow-[0_0_10px_rgba(0,0,0,0.3)]`}
                >
                  <Zap
                    size={16}
                    className={`text-white/20 group-hover:text-jarvis-primary ${i === 0 && isProcessing ? "text-jarvis-accent animate-spin" : ""}`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer Input */}
        <div className="w-full flex justify-center pointer-events-auto relative z-50">
          <CommandInput
            onSend={handleSendCommand}
            isProcessing={isProcessing}
            isListening={isListening}
            transcript={transcript}
            startListening={startListening}
            stopListening={stopListening}
            resetTranscript={resetTranscript}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
