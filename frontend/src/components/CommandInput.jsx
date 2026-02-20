import React, { useState, useEffect } from "react";
import { Mic, Send, Command, Loader2, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSound } from "../hooks/useSound";

const CommandInput = ({
  onSend,
  isProcessing,
  isListening,
  transcript,
  startListening,
  stopListening,
  resetTranscript,
}) => {
  const [input, setInput] = useState("");
  const { playHover, playClick, playSuccess } = useSound();

  // Sync voice transcript to input
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      playSuccess();
      onSend(input);
      setInput("");
      resetTranscript();
    }
  };

  const toggleVoice = () => {
    playClick();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex items-center gap-4 group perspective-1000">
      {/* Tech Decoration Lines */}
      <div className="absolute -top-3 left-0 w-20 h-[1px] bg-cyan-500/50" />
      <div className="absolute -top-3 right-0 w-20 h-[1px] bg-violet-500/50" />
      <div className="absolute -bottom-3 left-10 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Voice Module */}
      <motion.button
        whileHover={{ scale: 1.05, rotateZ: 5 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleVoice}
        onMouseEnter={playHover}
        disabled={isProcessing}
        className={`relative w-14 h-14 flex items-center justify-center transition-all duration-300 ${
          isListening
            ? "text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,0.6)]"
            : "text-cyan-500/70 hover:text-cyan-400"
        }`}
        style={{
          clipPath: "polygon(20% 0, 100% 0, 100% 80%, 80% 100%, 0 100%, 0 20%)",
        }}
      >
        {/* Background Plate */}
        <div
          className={`absolute inset-0 border border-current opacity-40 ${isListening ? "bg-red-900/20 animate-pulse" : "bg-cyan-900/20"}`}
          style={{
            clipPath:
              "polygon(20% 0, 100% 0, 100% 80%, 80% 100%, 0 100%, 0 20%)",
          }}
        />

        <Mic size={24} className={isListening ? "animate-ping-slow" : ""} />
      </motion.button>

      {/* Main Input Block */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 relative flex items-center"
      >
        {/* Input Container with Chamfered Edges */}
        <div
          className="absolute inset-0 bg-jarvis-plate border border-cyan-500/30 transform skew-x-[-10deg]"
          style={{ clipPath: "polygon(0 0, 100% 0, 98% 100%, 2% 100%)" }}
        />

        {/* Decoration: Scanlines inside input */}
        <div className="absolute inset-x-4 top-1 bottom-1 overflow-hidden pointer-events-none opacity-10">
          <div className="w-full h-full bg-[linear-gradient(transparent_1px,var(--color-jarvis-cyan)_1px)] bg-[size:100%_4px]" />
        </div>

        <div className="relative z-10 w-full flex items-center px-6">
          <span className="text-cyan-700 mr-3 font-mono text-xs">CMD://</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={playHover}
            disabled={isProcessing}
            placeholder={
              isListening
                ? "AWAITING VOICE INPUT..."
                : isProcessing
                  ? "PROCESSING STREAM..."
                  : "INITIALIZE COMMAND PROTOCOL..."
            }
            className="w-full bg-transparent text-cyan-100 placeholder-cyan-900/50 font-mono text-sm tracking-widest focus:outline-none uppercase py-4"
            style={{ textShadow: "0 0 5px rgba(0,240,255,0.3)" }}
          />
        </div>

        {/* Send Button Trigger */}
        <AnimatePresence>
          {(input.trim() || isProcessing) && (
            <motion.button
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="absolute right-2 z-20 p-2 text-cyan-400 hover:text-white transition-colors"
            >
              {isProcessing ? (
                <Loader2 size={20} className="animate-spin text-violet-400" />
              ) : (
                <Send size={20} className="drop-shadow-[0_0_8px_cyan]" />
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </form>

      {/* Status Indicators */}
      <div className="flex flex-col gap-1">
        <div className="w-8 h-1 bg-cyan-500/20 rounded-sm overflow-hidden">
          <div className="h-full bg-cyan-400 w-[60%] animate-pulse" />
        </div>
        <div className="w-6 h-1 bg-violet-500/20 rounded-sm overflow-hidden ml-auto">
          <div className="h-full bg-violet-400 w-[40%]" />
        </div>
      </div>
    </div>
  );
};

export default CommandInput;
