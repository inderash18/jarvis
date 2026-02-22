import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  Trash2,
  VolumeX,
  Sparkles,
  Zap,
} from "lucide-react";

// Hooks
import { useJarvisChat } from "../hooks/useJarvisChat";

// Components
import Canvas from "../components/Canvas";
import Sidebar from "../components/dashboard/Sidebar";
import ChatMessage from "../components/dashboard/ChatMessage";
import ImageViewer from "../components/dashboard/ImageViewer";

/**
 * ═══════════════════════════════════════════════════════════
 * DASHBOARD PAGE
 * ───────────────────────────────────────────────────────────
 * Main user interface for JARVIS. Orchestrates chat, 
 * voice, canvas, and system monitoring.
 * ═══════════════════════════════════════════════════════════
 */
const Dashboard = () => {
  const {
    input, setInput,
    chatHistory, streamingMessage,
    isProcessing, isConnected, isListening, isSpeaking,
    stats, canvasCommands, playingVideo,
    handleSend, toggleVoice, clearHistory, stopSpeaking
  } = useJarvisChat();

  const [imageViewer, setImageViewer] = useState(null);
  const [time, setTime] = useState(new Date());

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sync clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, streamingMessage]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#060a10] overflow-hidden flex selection:bg-cyan-500/20 selection:text-cyan-400">

      {/* ─── Layer 0: Background Effects ─── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,240,255,0.05)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(124,58,237,0.04)_0%,_transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* The 3D/Action Canvas Layer */}
        <Canvas commands={canvasCommands} isProcessing={isProcessing} isListening={isListening} />
      </div>

      {/* ─── Layer 1: Hardware Sidebar ─── */}
      <Sidebar
        isConnected={isConnected}
        metrics={{ cpu: stats?.cpu || 0, ram_percent: stats?.memory_percent || 0 }}
        time={time}
      />

      {/* ─── Layer 2: Main Interaction Area ─── */}
      <main className="flex-1 flex flex-col z-20 relative">

        {/* HEADER BAR */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-white/[0.03] backdrop-blur-xl bg-black/10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black tracking-[0.2em] bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              JARVIS
            </h1>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] shadow-inner">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-cyan-400 animate-pulse" : "bg-red-500"}`} />
              <span className="text-[10px] font-black font-mono text-gray-500 tracking-wider">
                {isProcessing ? "PROCESSING" : isListening ? "LISTENING" : isConnected ? "SYSTEM_READY" : "OFFLINE"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AnimatePresence>
              {isSpeaking && (
                <motion.button
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  onClick={stopSpeaking}
                  className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 transition-all shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                >
                  <VolumeX size={16} />
                </motion.button>
              )}
            </AnimatePresence>
            <button
              onClick={clearHistory}
              className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
              title="Purge Logs"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        {/* CHAT VIEWPORT */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-12 lg:px-20 xl:px-40 py-8 space-y-8 no-scrollbar scroll-smooth">
          {chatHistory.length === 0 && !streamingMessage && (
            <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[60vh]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-8"
              >
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/5 animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-spin-slow" />
                  <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border-2 border-cyan-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.1)]">
                    <Zap size={24} className="text-cyan-400" />
                  </div>
                </div>

                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-black tracking-tight text-white/90">
                    Awaiting Directives, Sir.
                  </h2>
                  <p className="text-sm text-gray-500 max-w-xs font-medium leading-relaxed">
                    Local Core is synchronized. Neural links are online. How shall we proceed?
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5 justify-center max-w-lg">
                  {[
                    "What can you do?",
                    "Search for latest AI news",
                    "Draw a minimalist cat",
                    "Open calculator",
                  ].map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => {
                        setInput(cmd);
                        setTimeout(() => inputRef.current?.focus(), 100);
                      }}
                      className="px-4 py-2 rounded-2xl text-[11px] font-bold text-gray-500 bg-white/[0.02] border border-white/5 hover:border-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all tracking-tight"
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
              key={msg.id || i}
              msg={msg}
              onImageClick={(images, index) => setImageViewer({ images, index })}
              playingVideo={playingVideo}
            />
          ))}

          {streamingMessage && (
            <ChatMessage
              msg={streamingMessage}
              onImageClick={() => { }}
            />
          )}

          <div ref={chatEndRef} />
        </div>

        {/* INPUT NEXUS */}
        <footer className="px-6 sm:px-12 lg:px-20 xl:px-40 pb-6 pt-2">
          <div className="relative flex items-center gap-4 p-2.5 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.07] backdrop-blur-2xl shadow-2xl focus-within:border-cyan-500/40 focus-within:bg-white/[0.04] transition-all group/input">

            {/* Voice Trigger */}
            <button
              onClick={toggleVoice}
              disabled={isProcessing}
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isListening
                  ? "bg-red-500/20 border-2 border-red-500/50 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-110"
                  : "bg-white/[0.05] border border-white/10 text-gray-500 hover:text-cyan-400 hover:border-cyan-500/30"
                }`}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Main Input Text */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              placeholder={
                isListening ? "Listening for your voice..." :
                  isProcessing ? "Synthesizing response..." :
                    "Initiate Command..."
              }
              className="flex-1 bg-transparent text-white placeholder-gray-700 text-[15px] font-medium focus:outline-none py-2 px-1 tracking-tight"
            />

            {/* Execution Button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isProcessing}
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${input.trim() && !isProcessing
                  ? "bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                  : "bg-white/[0.01] border border-white/5 text-gray-800"
                }`}
            >
              {isProcessing ? (
                <Loader2 size={18} className="animate-spin text-cyan-400" />
              ) : (
                <Send size={18} className={input.trim() ? "translate-x-0.5" : ""} />
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="h-px bg-white/[0.03] flex-1" />
            <p className="text-[9px] font-black text-gray-700 font-mono tracking-[0.3em] uppercase">
              {isListening ? "Neural Link Active" : "Standard Interface Protocol"}
            </p>
            <div className="h-px bg-white/[0.03] flex-1" />
          </div>
        </footer>
      </main>

      {/* ─── Layer 3: Modal Interlays ─── */}
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
