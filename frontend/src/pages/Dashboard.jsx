import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useVoice } from '../hooks/useVoice';
import { useSound } from '../hooks/useSound';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Command, Settings, Shield, Cpu, Activity, Database, Cloud, Clock } from 'lucide-react';
import Canvas from '../components/Canvas';
import CommandInput from '../components/CommandInput';
import bgVideo from '../assets/LIVE_WALLPAPER_AI_JARVIS_-_IRON-MAN_STATUS_REALM_PC_DESKTOP_UPDATED_DOWNLOAD_LINK_1080P.mp4';

const MetricCard = ({ icon: Icon, label, value, color }) => (
    <div className="flex items-center gap-3 bg-black/20 backdrop-blur-sm border-l-2 border-white/10 p-2 pr-4 hover:bg-white/5 transition-all group w-48">
        <div className={`p-2 rounded bg-${color}-500/10 text-${color}-400 group-hover:text-${color}-300 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
            <Icon size={14} />
        </div>
        <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-white/40">{label}</span>
            <span className="text-xs font-mono text-white/90">{value}</span>
        </div>
    </div>
);

const Dashboard = () => {
    const { isConnected, status, messages, sendMessage } = useWebSocket();
    const { speak, isListening, transcript, startListening, stopListening, resetTranscript } = useVoice();
    const { playProcessing } = useSound();

    // Commands filtered from messages
    const [canvasCommands, setCanvasCommands] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // System Stats
    const [metrics, setMetrics] = useState({
        cpu: 12,
        ram_percent: 45,
        ram_used: 4.2,
        ram_total: 16
    });

    // Time
    const [time, setTime] = useState(new Date());

    // Scroll to bottom of logs
    const logsEndRef = useRef(null);

    // Welcome Message
    useEffect(() => {
        const timer = setTimeout(() => {
            speak("Welcome back, sir. Systems are online and ready. How can I help you?");
        }, 1000);
        return () => clearTimeout(timer);
    }, [speak]);

    // Simulate aliveness & Time
    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics(prev => ({
                ...prev,
                cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() * 10 - 5))).toFixed(1),
                ram_percent: Math.min(100, Math.max(0, prev.ram_percent + (Math.random() * 2 - 1))).toFixed(1)
            }));
            setTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (messages.length > 0) {
            const last = messages[messages.length - 1];
            if (last) {
                // Check if status processing
                if (last.type === 'status') {
                    setIsProcessing(true);
                    playProcessing();
                }

                else if (last.type === 'system_stats') {
                    setMetrics({
                        cpu: last.data.cpu,
                        ram_percent: last.data.memory_percent,
                        ram_used: last.data.memory_used_gb,
                        ram_total: last.data.memory_total_gb
                    });
                }

                else if (last.type === 'result') {
                    setIsProcessing(false);
                    if (last.data?.execution_results) {
                        setCanvasCommands(prev => [...prev, last]);
                    }
                    if (last.data?.original_response?.thought_process) {
                        speak(last.data.original_response.thought_process);
                    }
                }

                else if (last.type === 'error') {
                    setIsProcessing(false);
                }
            }
        }
    }, [messages, speak, playProcessing]);

    const handleSendCommand = (cmd) => {
        if (cmd) {
            setIsProcessing(true);
            playProcessing();
            sendMessage(cmd);
        }
    };

    return (
        <div className="relative w-screen h-screen bg-jarvis-bg text-white font-mono overflow-hidden selection:bg-jarvis-primary/30">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <video
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-cover opacity-40 mix-blend-screen"
                >
                    <source src={bgVideo} type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                <div className="absolute inset-0 bg-radial-gradient from-transparent via-jarvis-bg/50 to-jarvis-bg/90" />
            </div>

            {/* Canvas Layer - Full Screen Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                <Canvas commands={canvasCommands} isProcessing={isProcessing} isListening={isListening} />
            </div>

            {/* UI Container - Top Layer */}
            <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 pointer-events-none">

                {/* Header Area */}
                <div className="flex justify-between items-start pointer-events-auto">
                    {/* Top Left: Identity */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col gap-1"
                    >
                        <h1 className="text-2xl font-bold tracking-[0.3em] font-display text-transparent bg-clip-text bg-gradient-to-r from-jarvis-primary to-white drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                            JARVIS
                        </h1>
                        <div className="flex items-center gap-2 text-[10px] text-white/60">
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`} />
                            <span>SYSTEM STATUS: {status.toUpperCase()}</span>
                        </div>
                    </motion.div>

                    {/* Top Right: Time & Metrics */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col items-end gap-4"
                    >
                        <div className="text-4xl font-light tracking-widest text-white/80 font-display drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>

                        <div className="flex flex-col gap-2 mt-4">
                            <MetricCard icon={Cpu} label="Processing Unit" value={`${metrics.cpu}% Load`} color="indigo" />
                            <MetricCard icon={Database} label="Volatile Memory" value={`${metrics.ram_used}GB / ${metrics.ram_total}GB`} color="purple" />
                            <MetricCard icon={Shield} label="Firewall" value="ACTIVE" color="green" />
                        </div>
                    </motion.div>
                </div>

                {/* Middle Area: Left Empty for Core Visibility */}
                <div className="flex-1 flex items-center justify-between px-12 pointer-events-none">
                    {/* Floating Logs (Left Side) */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-96 h-96 overflow-hidden flex flex-col justify-end pointer-events-auto"
                    >
                        <div className="bg-black/40 backdrop-blur-md border-l-2 border-jarvis-primary/30 p-6 rounded-r-2xl mask-linear-gradient hover:bg-black/50 transition-colors">
                            <h3 className="text-xs font-bold text-jarvis-primary mb-4 tracking-widest flex items-center gap-2">
                                <Activity size={12} /> NEURAL FEED
                            </h3>
                            <div className="flex flex-col gap-2 text-[11px] text-white/60 font-mono h-64 overflow-y-auto custom-scrollbar">
                                <AnimatePresence mode='popLayout'>
                                    {messages.slice(-10).map((msg, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="border-l border-white/10 pl-3 py-1 hover:bg-white/5 transition-colors"
                                        >
                                            <span className="text-jarvis-secondary mr-2 font-bold">{new Date().toLocaleTimeString().split(' ')[0]}</span>
                                            <span className="text-white/80 typing-effect">
                                                {typeof msg === 'string' ? msg : (msg.data?.original_response?.thought_process || "Processing data packet...")}
                                            </span>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Side: Active Agents (Mini cards) */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col gap-3 pointer-events-auto"
                    >
                        {['ChiefAgent', 'CanvasAgent', 'AutomationAgent', 'VisionAgent'].map((agent, i) => (
                            <div key={agent} className="flex items-center justify-end gap-3 opacity-60 hover:opacity-100 transition-opacity cursor-pointer group">
                                <span className="text-[10px] tracking-widest text-white/50 group-hover:text-jarvis-primary transition-colors">{agent.toUpperCase()}</span>
                                <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-jarvis-primary/50 animate-pulse" style={{ width: `${Math.random() * 50 + 50}%` }} />
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Bottom Area: Input */}
                <div className="w-full flex justify-center mb-10 pointer-events-auto relative z-50">
                    <CommandInput
                        onSend={handleSendCommand}
                        isProcessing={isProcessing}
                        // Pass voice props
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
