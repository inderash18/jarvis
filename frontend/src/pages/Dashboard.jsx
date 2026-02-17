import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Command, Settings, Shield, Cpu, Activity, Database, Cloud } from 'lucide-react';
import Canvas from '../components/Canvas';
import CommandInput from '../components/CommandInput';

const MetricCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-lg p-3 flex flex-col items-center justify-center gap-2 hover:border-white/20 transition-all">
        <Icon size={16} className={`text-${color}-400 mb-1`} />
        <span className="text-[10px] uppercase tracking-widest text-white/40">{label}</span>
        <span className="text-sm font-mono text-white/90">{value}</span>
    </div>
);

const Dashboard = () => {
    const { isConnected, status, messages, sendMessage } = useWebSocket();
    const [isListening, setIsListening] = useState(false);

    // Commands filtered from messages
    const [canvasCommands, setCanvasCommands] = useState([]);

    // System Stats
    const [metrics, setMetrics] = useState({
        cpu: 0,
        ram_percent: 0,
        ram_used: 0,
        ram_total: 0
    });

    useEffect(() => {
        if (messages.length > 0) {
            const last = messages[messages.length - 1];
            if (last) {
                // If it's a result with canvas actions, add to canvasCommands
                console.log("New Message:", last);

                if (last.type === 'system_stats') {
                    setMetrics({
                        cpu: last.data.cpu,
                        ram_percent: last.data.memory_percent,
                        ram_used: last.data.memory_used_gb,
                        ram_total: last.data.memory_total_gb
                    });
                } else if (last.type === 'result' && last.data?.execution_results) {
                    setCanvasCommands(prev => [...prev, last]);
                }
            }
        }
    }, [messages]);

    const handleSendCommand = (cmd) => {
        sendMessage(cmd);
    };

    return (
        <div className="relative min-h-screen bg-jarvis-bg text-white font-mono overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />

            {/* Header / Top Bar */}
            <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-black/60 backdrop-blur-lg flex items-center justify-between px-6 z-50">
                <div className="flex items-center gap-4">
                    <div className="size-8 rounded-full bg-gradient-to-br from-jarvis-primary to-jarvis-secondary shadow-[0_0_20px_rgba(0,243,255,0.5)] animate-pulse" />
                    <h1 className="text-xl font-bold tracking-[0.2em] font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">
                        JARVIS <span className="text-xs text-jarvis-primary ml-2">SYSTEM ACTIVE</span>
                    </h1>
                </div>

                <div className="flex items-center gap-6 text-xs">
                    <div className="flex items-center gap-2 text-white/50">
                        <div className={`size-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`} />
                        {status.toUpperCase()}
                    </div>
                    <span className="text-white/30">V.1.0.0 Local</span>
                    <button className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors">
                        <Settings size={16} />
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="pt-20 pb-24 px-6 h-screen grid grid-cols-12 gap-6">

                {/* Left Sidebar - System Metrics */}
                <div className="col-span-3 flex flex-col gap-4">
                    <div className="glass-panel p-4 flex-1">
                        <h2 className="text-xs font-bold text-jarvis-primary mb-4 flex items-center gap-2">
                            <Activity size={14} /> SYSTEM STATUS
                        </h2>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <MetricCard icon={Cpu} label="CPU Core" value={`${metrics.cpu}%`} color="indigo" />
                            <MetricCard icon={Database} label="Memory" value={`${metrics.ram_used}/${metrics.ram_total}GB`} color="purple" />
                            <MetricCard icon={Cloud} label="Latency" value="23ms" color="cyan" />
                            <MetricCard icon={Shield} label="Security" value="SECURE" color="green" />
                        </div>

                        <div className="h-px bg-white/10 my-4" />

                        <div className="space-y-4">
                            <div className="text-xs text-white/30 mb-2">ACTIVE AGENTS</div>
                            {['ChiefAgent', 'CanvasAgent', 'AutomationAgent', 'VisionAgent'].map(agent => (
                                <div key={agent} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                                    <span className="text-xs">{agent}</span>
                                    <div className="flex gap-1">
                                        <div className="size-1.5 rounded-full bg-green-500 animate-[pulse_2s_infinite]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Log Terminal */}
                    <div className="glass-panel p-4 h-1/3 overflow-hidden flex flex-col">
                        <h2 className="text-xs font-bold text-jarvis-secondary mb-2">SYSTEM LOGS</h2>
                        <div className="flex-1 overflow-y-auto text-[10px] font-mono text-white/50 space-y-1 custom-scrollbar">
                            {messages.map((msg, i) => (
                                <div key={i} className="border-l-2 border-white/10 pl-2">
                                    <span className="text-jarvis-primary/70">[{new Date().toLocaleTimeString()}]</span>
                                    <span className="ml-2">{typeof msg === 'string' ? msg : JSON.stringify(msg).slice(0, 50)}...</span>
                                </div>
                            ))}
                            {messages.length === 0 && <div className="italic opacity-50">System Initialized. Awaiting Input.</div>}
                        </div>
                    </div>
                </div>

                {/* Center Canvas */}
                <div className="col-span-9 flex flex-col gap-4 h-full pb-6">
                    <div className="flex-1 relative">
                        <Canvas commands={canvasCommands} />

                        {/* Overlay Controls */}
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button className="bg-black/50 backdrop-blur border border-white/10 p-2 rounded hover:bg-white/10 transition-colors">
                                <Activity size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Command Input Area */}
                    <div className="h-20 flex items-center justify-center relative z-10">
                        <CommandInput onSend={handleSendCommand} isListening={isListening} />
                    </div>
                </div>

            </main>
        </div>
    );
};

export default Dashboard;
