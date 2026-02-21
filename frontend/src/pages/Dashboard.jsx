import React, { useState, useEffect, useRef } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useVoice } from "../hooks/useVoice";
import { useSound } from "../hooks/useSound";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Database,
  Zap,
  Mic,
  MicOff,
  Send,
  Loader2,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Bot,
  User,
  Sparkles,
  Volume2,
  VolumeX,
  Maximize2,
  Clock,
  Wifi,
  WifiOff,
  Trash2,
  Download,
  ExternalLink,
} from "lucide-react";
import Canvas from "../components/Canvas";

/* ═══════════════════════════════════════════════════════════
   JARVIS — Advanced AI Command Dashboard
   ═══════════════════════════════════════════════════════════ */

// ── Image Viewer Modal ──────────────────────────────────────
const ImageViewer = ({ images, activeIndex, onClose, onSelect }) => {
  const [current, setCurrent] = useState(activeIndex || 0);

  useEffect(() => setCurrent(activeIndex || 0), [activeIndex]);

  if (!images || images.length === 0) return null;
  const img = images[current];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />

      {/* Content */}
      <motion.div
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 30 }}
        transition={{ type: "spring", damping: 25 }}
        className="relative z-10 w-[90vw] max-w-5xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <ImageIcon size={14} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white truncate max-w-md">
                {img?.title || "Image Preview"}
              </h3>
              <p className="text-[10px] text-gray-500 font-mono">
                {current + 1} / {images.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {img?.source && (
              <a
                href={img.source}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Main Image */}
        <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
          <img
            src={img?.image_url || img?.thumbnail}
            alt={img?.title || "Image"}
            className="max-w-full max-h-[65vh] object-contain"
            onError={(e) => {
              e.target.src = img?.thumbnail || "";
            }}
          />

          {/* Nav Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrent((p) => (p > 0 ? p - 1 : images.length - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrent((p) => (p < images.length - 1 ? p + 1 : 0))}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails Row */}
        {images.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 px-1">
            {images.map((im, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === current
                    ? "border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                    : "border-white/10 opacity-50 hover:opacity-80"
                  }`}
              >
                <img
                  src={im.thumbnail || im.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ── Chat Message Bubble ─────────────────────────────────────
const ChatMessage = ({ msg, onImageClick }) => {
  const isUser = msg.role === "user";
  let content = msg.content;
  if (typeof content !== "string") content = JSON.stringify(content, null, 2);

  // Parse thought_process from JSON content
  let displayText = content;
  let images = null;

  try {
    if (!isUser && content.includes("thought_process")) {
      const parsed = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, ""));
      displayText = parsed.thought_process || content;
    }
  } catch {
    displayText = content;
  }

  // Check for image data
  if (msg.images && msg.images.length > 0) {
    images = msg.images;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${isUser
            ? "bg-violet-500/15 border border-violet-500/30"
            : "bg-cyan-500/15 border border-cyan-500/30"
          }`}
      >
        {isUser ? (
          <User size={14} className="text-violet-400" />
        ) : (
          <Bot size={14} className="text-cyan-400" />
        )}
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser
              ? "bg-violet-500/15 border border-violet-500/20 text-violet-100 rounded-tr-md"
              : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-md"
            }`}
        >
          <p className="whitespace-pre-wrap break-words">{displayText}</p>
        </div>

        {/* Image Grid */}
        {images && images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
            {images.slice(0, 4).map((img, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onImageClick(images, i)}
                className="relative aspect-video rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/40 transition-all group"
              >
                <img
                  src={img.thumbnail || img.image_url}
                  alt={img.title || ""}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <Maximize2 size={12} className="text-white/80" />
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-gray-600 font-mono px-1">
          {msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : ""}
        </span>
      </div>
    </motion.div>
  );
};

// ── System Stat Pill ─────────────────────────────────────────
const StatPill = ({ label, value, icon: Icon, color }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
    <Icon size={12} className={color} />
    <span className="text-[10px] font-mono text-gray-500 uppercase">{label}</span>
    <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════
//   MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════

const Dashboard = () => {
  const { isConnected, status, messages, stats, sendMessage } = useWebSocket();
  const {
    speak,
    isSpeaking,
    isListening,
    transcript,
    startListening,
    stopListening,
    stopSpeaking,
    resetTranscript,
  } = useVoice();
  const { playProcessing, playHover, playClick, playSuccess } = useSound();

  const [input, setInput] = useState("");
  const [canvasCommands, setCanvasCommands] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [imageViewer, setImageViewer] = useState(null);
  const [time, setTime] = useState(new Date());
  const [metrics, setMetrics] = useState({ cpu: 0, ram_percent: 0 });

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Clock ──────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── System stats ───────────────────────────────────
  useEffect(() => {
    if (stats) {
      setMetrics({ cpu: stats.cpu, ram_percent: stats.memory_percent });
    }
  }, [stats]);

  // ── Auto-scroll chat ──────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // ── Voice transcript → input sync ─────────────────
  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  // ── Process incoming messages ─────────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (!last) return;

    if (last.type === "status") {
      setIsProcessing(true);
      playProcessing();
    } else if (last.type === "assistant_response") {
      if (!last.isStreaming && last.data) {
        setIsProcessing(false);

        // Extract thought_process for display & speak
        let thoughtText = "";
        if (last.data.original_response?.thought_process) {
          thoughtText = last.data.original_response.thought_process;
        }

        // Extract images
        let foundImages = [];
        const results = last.data.execution_results;
        if (Array.isArray(results)) {
          results.forEach((res) => {
            if (res && res.image_url) {
              const imgs = res.all_images || [
                { image_url: res.image_url, thumbnail: res.thumbnail, title: res.title, source: res.source },
              ];
              foundImages = imgs;
            }
            // Canvas commands
            if (res && (res.agent === "CanvasAgent" || res.status === "cleared")) {
              setCanvasCommands((prev) => [...prev, { type: "result", data: last.data }]);
            }
          });
        }

        // Add assistant message to chat history
        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: thoughtText || last.content || "Done.",
            images: foundImages.length > 0 ? foundImages : null,
            timestamp: new Date(),
          },
        ]);

        // Speak the response
        if (thoughtText) {
          speak(thoughtText.replace(/\{.*?\}/s, ""));
        }
      }
    } else if (last.type === "error") {
      setIsProcessing(false);
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: "Error encountered, sir.", timestamp: new Date() },
      ]);
    }
  }, [messages, speak, playProcessing]);

  // ── Safety timeout ────────────────────────────────
  useEffect(() => {
    if (isProcessing) {
      const t = setTimeout(() => {
        setIsProcessing(false);
      }, 30000);
      return () => clearTimeout(t);
    }
  }, [isProcessing]);

  // ── Send command ──────────────────────────────────
  const handleSend = () => {
    const cmd = input.trim();
    if (!cmd || isProcessing) return;

    playSuccess();
    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: cmd, timestamp: new Date() },
    ]);
    sendMessage(cmd);
    setInput("");
    resetTranscript();
    setIsProcessing(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = () => {
    playClick();
    isListening ? stopListening() : startListening();
  };

  const clearHistory = () => {
    setChatHistory([]);
    setCanvasCommands([]);
  };

  return (
    <div className="relative w-screen h-screen bg-[#060a10] overflow-hidden flex">
      {/* ─── Background Effects ─── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,240,255,0.04)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(112,0,255,0.03)_0%,_transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <Canvas commands={canvasCommands} isProcessing={isProcessing} isListening={isListening} />
      </div>

      {/* ─── Left Sidebar (Stats) ─── */}
      <div className="hidden lg:flex flex-col items-center justify-between py-6 px-3 w-16 z-30 border-r border-white/[0.04]">
        <div className="flex flex-col items-center gap-1">
          {/* JARVIS Logo */}
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
            <Sparkles size={16} className="text-cyan-400" />
          </div>

          {/* Connection */}
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-red-500"}`} />
          <span className="text-[8px] text-gray-600 font-mono mt-0.5">
            {isConnected ? "ON" : "OFF"}
          </span>
        </div>

        {/* Stats */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <circle
                  cx="20" cy="20" r="16" fill="none"
                  stroke="#00f0ff" strokeWidth="3"
                  strokeDasharray={`${(metrics.cpu / 100) * 100.5} 100.5`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <Cpu size={12} className="absolute text-cyan-400" />
            </div>
            <span className="text-[9px] font-mono text-gray-500 mt-1">{Math.round(metrics.cpu)}%</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <circle
                  cx="20" cy="20" r="16" fill="none"
                  stroke="#a855f7" strokeWidth="3"
                  strokeDasharray={`${(metrics.ram_percent / 100) * 100.5} 100.5`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <Database size={12} className="absolute text-purple-400" />
            </div>
            <span className="text-[9px] font-mono text-gray-500 mt-1">{Math.round(metrics.ram_percent)}%</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <circle
                  cx="20" cy="20" r="16" fill="none"
                  stroke="#f59e0b" strokeWidth="3"
                  strokeDasharray="98 100.5"
                  strokeLinecap="round"
                />
              </svg>
              <Zap size={12} className="absolute text-amber-400" />
            </div>
            <span className="text-[9px] font-mono text-gray-500 mt-1">98%</span>
          </div>
        </div>

        {/* Time */}
        <div className="flex flex-col items-center">
          <Clock size={12} className="text-gray-600 mb-1" />
          <span className="text-[9px] font-mono text-gray-500">
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
          </span>
        </div>
      </div>

      {/* ─── Main Chat Area ─── */}
      <div className="flex-1 flex flex-col z-20 relative">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-[0.15em] bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              J.A.R.V.I.S
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-500"} ${isConnected ? "animate-pulse" : ""}`} />
              <span className="text-[10px] font-mono text-gray-500">
                {isProcessing ? "PROCESSING" : isListening ? "LISTENING" : isConnected ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSpeaking && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={stopSpeaking}
                className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                <VolumeX size={14} />
              </motion.button>
            )}
            <button
              onClick={clearHistory}
              className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-red-400 hover:border-red-500/20 transition-colors"
              title="Clear history"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-16 xl:px-24 py-6 space-y-6 custom-scrollbar">
          {chatHistory.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[60vh]">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-6"
              >
                {/* Animated Arc Reactor Mini */}
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-spin" style={{ animationDuration: "8s" }} />
                  <div className="absolute inset-2 rounded-full border border-dashed border-cyan-500/10 animate-spin" style={{ animationDuration: "12s", animationDirection: "reverse" }} />
                  <div className="absolute inset-4 rounded-full border border-cyan-500/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                      <Sparkles size={16} className="text-cyan-400" />
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold tracking-wider text-white/80">
                    Welcome back, Sir
                  </h2>
                  <p className="text-sm text-gray-500 max-w-sm">
                    How can I assist you today? Type a command or use voice input.
                  </p>
                </div>

                {/* Quick Action Chips */}
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {[
                    "What can you do?",
                    "Show me a picture of mountains",
                    "Open notepad",
                    "Draw a circle",
                  ].map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => {
                        setInput(cmd);
                        setTimeout(() => inputRef.current?.focus(), 100);
                      }}
                      className="px-3 py-1.5 rounded-full text-xs text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 hover:text-cyan-400 transition-all"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

          {chatHistory.map((msg, i) => (
            <ChatMessage
              key={i}
              msg={msg}
              onImageClick={(images, index) =>
                setImageViewer({ images, index })
              }
            />
          ))}

          {/* Streaming indicator */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <Bot size={14} className="text-cyan-400" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-gray-500 font-mono">Processing...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ─── Input Bar ─── */}
        <div className="px-4 sm:px-8 lg:px-16 xl:px-24 pb-4 pt-2">
          <div className="relative flex items-center gap-3 p-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm focus-within:border-cyan-500/30 transition-colors">
            {/* Voice Button */}
            <button
              onClick={toggleVoice}
              disabled={isProcessing}
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isListening
                  ? "bg-red-500/20 border border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30"
                }`}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              placeholder={
                isListening
                  ? "Listening..."
                  : isProcessing
                    ? "Processing..."
                    : "Ask Jarvis anything..."
              }
              className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm focus:outline-none py-2 px-1"
            />

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${input.trim() && !isProcessing
                  ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.2)]"
                  : "bg-white/[0.02] border border-white/[0.05] text-gray-700"
                }`}
            >
              {isProcessing ? (
                <Loader2 size={16} className="animate-spin text-cyan-400" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>

          {/* Bottom Info */}
          <div className="flex items-center justify-center gap-3 mt-2">
            <span className="text-[10px] text-gray-700 font-mono">
              {isListening ? "🎙️ Voice active" : "Press Enter to send • Mic for voice"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Image Viewer Modal ─── */}
      <AnimatePresence>
        {imageViewer && (
          <ImageViewer
            images={imageViewer.images}
            activeIndex={imageViewer.index}
            onClose={() => setImageViewer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
