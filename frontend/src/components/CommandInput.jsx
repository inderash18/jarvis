import React, { useState, useEffect } from 'react';
import { Mic, Send, Command, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSound } from '../hooks/useSound';

const CommandInput = ({
    onSend,
    isProcessing,
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript
}) => {
    const [input, setInput] = useState('');
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
            setInput('');
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
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`w-full max-w-3xl mx-auto glass-panel p-2 flex items-center gap-2 transition-opacity ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
        >
            <button
                onClick={toggleVoice}
                onMouseEnter={playHover}
                disabled={isProcessing}
                className={`p-3 rounded-lg transition-colors ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse ring-1 ring-red-500' : 'hover:bg-white/5 text-jarvis-primary'}`}
            >
                <Mic size={20} />
            </button>

            <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                    <Command className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={playHover}
                        disabled={isProcessing}
                        placeholder={isListening ? "Listening..." : isProcessing ? "Processing..." : "Initialize command protocol..."}
                        className="w-full bg-black/20 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-jarvis-primary/50 placeholder-white/20 font-mono text-sm disabled:cursor-not-allowed"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!input.trim() || isProcessing}
                    onMouseEnter={playHover}
                    className="p-3 bg-jarvis-primary/10 text-jarvis-primary hover:bg-jarvis-primary/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
            </form>
        </motion.div>
    );
};

export default CommandInput;


