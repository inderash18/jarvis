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
  Zap,
  Server,
  Clock,
  Wifi,
  ChevronRight,
  Sparkles,
  Command as CommandIcon,
  Mic,
  MessageSquare,
  Bot,
  Layers,
  Hexagon,
  Aperture,
  Code2,
  Image as ImageIcon,
} from "lucide-react";
import Canvas from "../components/Canvas";
import CommandInput from "../components/CommandInput";
import CenterHUD from "../components/CenterHUD";

// --- Custom "Tech" Components ---

const TechBorder = ({ children, className = "" }) => (
  <div
    className={`relative p-[1px] bg-gradient-to-br from-cyan-500/50 via-transparent to-violet-500/50 clip-tech ${className}`}
  >
    <div className="absolute inset-0 bg-jarvis-plate clip-tech -z-10" />
    <div className="relative bg-jarvis-plate/90 backdrop-blur-md clip-tech h-full w-full overflow-hidden">
      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-cyan-400" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-violet-400" />
      {children}
    </div>
  </div>
);

const HexStat = ({ label, value, icon: Icon, color = "text-cyan-400" }) => (
  <div className="flex flex-col items-center justify-center relative w-24 h-24 group">
    {/* Hexagon Shape SVG */}
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full text-jarvis-plate fill-current opacity-80 group-hover:opacity-100 transition-opacity"
    >
      <path
        d="M50 0 L93.3 25 L93.3 75 L50 100 L6.7 75 L6.7 25 Z"
        stroke="currentColor"
        strokeWidth="1"
        className={`${color} opacity-30`}
        fill="none"
      />
      <path
        d="M50 5 L88.3 27.5 L88.3 72.5 L50 95 L11.7 72.5 L11.7 27.5 Z"
        className="text-jarvis-plate/50 fill-current"
      />
    </svg>

    <div className="relative z-10 flex flex-col items-center">
      <Icon size={18} className={`${color} mb-1 group-hover:animate-pulse`} />
      <span className="text-xl font-display font-bold text-white tracking-widest">
        {value}
      </span>
      <span className="text-[8px] uppercase tracking-widest text-gray-500">
        {label}
      </span>
    </div>
  </div>
);

const ChatBlock = ({ msg }) => {
  const isUser = msg.role === "user";
  let content = msg.content;
  if (typeof content !== "string") content = JSON.stringify(content);

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex flex-col mb-4 ${isUser ? "items-end" : "items-start"}`}
    >
      <div
        className={`relative max-w-[300px] p-3 font-mono text-xs leading-relaxed border ${
          isUser
            ? "border-violet-500/30 bg-violet-900/20 text-violet-100"
            : "border-cyan-500/30 bg-cyan-900/20 text-cyan-100"
        }`}
        style={{
          clipPath: isUser
            ? "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)"
            : "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
        }}
      >
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </motion.div>
  );
};

// --- Main Dashboard ---

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
  const [activeImage, setActiveImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [time, setTime] = useState(new Date());

  const logsEndRef = useRef(null);
  const [metrics, setMetrics] = useState({
    cpu: 12,
    ram_percent: 45,
    ram_used: 4.2,
    ram_total: 16,
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last) {
        if (last.type === "status") {
          setIsProcessing(true);
          playProcessing();
          setStreamingText("");
        } else if (last.type === "assistant_response") {
          setStreamingText(last.content || "");
          if (!last.isStreaming && last.data) {
            setIsProcessing(false);
            if (last.data.execution_results) {
              // Check for Canvas commands
              setCanvasCommands((prev) => [
                ...prev,
                { type: "result", data: last.data },
              ]);

              // Check for Image results
              const results = last.data.execution_results;
              if (Array.isArray(results)) {
                results.forEach((res) => {
                  if (res && res.image_url) {
                    setActiveImage(res.image_url);
                  }
                });
              }
            }
            if (last.data.original_response?.thought_process) {
              const text = last.data.original_response.thought_process;
              speak(text.replace(/\{.*?\}/s, ""));
            }
            setStreamingText("");
          }
        } else if (last.type === "error") {
          setIsProcessing(false);
          setStreamingText("");
          speak("Error detected.");
        }
      }
    }
  }, [messages, speak, playProcessing]);

  useEffect(() => {
    if (isProcessing) {
      const timer = setTimeout(() => {
        setIsProcessing(false);
        setStreamingText("");
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isProcessing]);

  const handleSendCommand = (cmd) => {
    if (cmd) {
      setIsProcessing(true);
      playProcessing();
      sendMessage(cmd);
      setStreamingText("");
      setActiveImage(null); // Reset image on new command
    }
  };

  const displayMessages = messages.filter(
    (m) => m.type !== "stream_token" && m.type !== "status",
  );

  return (
    <div className="relative w-screen h-screen bg-jarvis-void overflow-hidden flex flex-col items-center justify-center">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-jarvis-cyan)_0%,_transparent_70%)] opacity-5" />
        <Canvas
          commands={canvasCommands}
          isProcessing={isProcessing}
          isListening={isListening}
        />
      </div>

      {/* Central HUD */}
      <div className="absolute z-10">
        <CenterHUD isListening={isListening} isProcessing={isProcessing} />
      </div>

      {/* Image Overlay */}
      <AnimatePresence>
        {activeImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
          >
            <TechBorder className="w-full h-full flex items-center justify-center bg-black/80">
              <img
                src={activeImage}
                alt="Fetched"
                className="max-w-full max-h-full object-contain"
              />
              <div className="absolute top-2 right-2 text-[10px] text-cyan-500 font-mono bg-black/50 px-2 py-1">
                IMG_SRC_01
              </div>
            </TechBorder>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Stats */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-30 pointer-events-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-display font-bold tracking-[0.2em] text-cyan-400 drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">
            JARVIS
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_lime]" />
            <span className="text-[10px] font-mono text-cyan-600 tracking-widest">
              SYSTEM READY
            </span>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="text-right">
            <div className="text-2xl font-mono text-cyan-100">
              {time.toLocaleTimeString([], { hour12: false })}
            </div>
            <div className="text-[10px] text-cyan-700 tracking-widest">
              T-MINUS MARK
            </div>
          </div>
        </div>
      </div>

      {/* Left Sidebar Stats */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-30 pointer-events-none hidden md:flex">
        <HexStat label="CPU" value={`${metrics.cpu}%`} icon={Cpu} />
        <HexStat
          label="RAM"
          value={`${metrics.ram_percent}%`}
          icon={Database}
          color="text-violet-400"
        />
        <HexStat label="PWR" value="98%" icon={Zap} color="text-amber-400" />
      </div>

      {/* Right Sidebar - Chat Log (Overlay) */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 w-80 h-[60vh] z-30 pointer-events-auto flex flex-col">
        <TechBorder className="flex-1 overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-jarvis-plate to-transparent z-10" />
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col-reverse">
            <div ref={logsEndRef} />
            {[...displayMessages].reverse().map((msg, i) => (
              <ChatBlock key={i} msg={msg} />
            ))}
          </div>
          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-jarvis-plate to-transparent z-10" />
        </TechBorder>
      </div>

      {/* Bottom Control Bar */}
      <div className="absolute bottom-8 w-full max-w-2xl px-6 z-40">
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
  );
};

export default Dashboard;
