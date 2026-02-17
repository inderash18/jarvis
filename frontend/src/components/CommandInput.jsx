import React, { useState } from 'react';
import { Mic, Send, Command } from 'lucide-react';
import { motion } from 'framer-motion';

const CommandInput = ({ onSend, isListening }) => {
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim()) {
            onSend(input);
            setInput('');
        }
    };

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-3xl mx-auto glass-panel p-2 flex items-center gap-2"
        >
            <button className={`p-3 rounded-lg transition-colors ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-white/5 text-jarvis-primary'}`}>
                <Mic size={20} />
            </button>

            <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                    <Command className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Initialize command protocol..."
                        className="w-full bg-black/20 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-jarvis-primary/50 placeholder-white/20 font-mono text-sm"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!input.trim()}
                    className="p-3 bg-jarvis-primary/10 text-jarvis-primary hover:bg-jarvis-primary/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={20} />
                </button>
            </form>
        </motion.div>
    );
};

export default CommandInput;
