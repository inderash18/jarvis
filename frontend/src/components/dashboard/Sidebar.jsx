import React from "react";
import {
    Cpu,
    Database,
    Zap,
    Clock,
    Sparkles
} from "lucide-react";

/**
 * Sidebar Component - Displays logo and hardware metrics
 */
const Sidebar = ({ isConnected, metrics, time }) => {
    const getDashArray = (val) => `${(val / 100) * 100.5} 100.5`;

    const StatCircle = ({ value, color, icon: Icon, label }) => (
        <div className="flex flex-col items-center">
            <div className="relative w-10 h-10 flex items-center justify-center group">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                    <circle
                        cx="20" cy="20" r="16" fill="none"
                        stroke="currentColor" strokeWidth="3"
                        strokeDasharray={getDashArray(value)}
                        strokeLinecap="round"
                        className={`${color} transition-all duration-1000 ease-out`}
                    />
                </svg>
                <Icon size={12} className={`${color} absolute group-hover:scale-125 transition-transform`} />
            </div>
            <span className="text-[8px] font-black font-mono text-gray-600 mt-1 uppercase tracking-tighter">
                {label} {Math.round(value)}%
            </span>
        </div>
    );

    return (
        <aside className="hidden lg:flex flex-col items-center justify-between py-8 px-4 w-20 z-30 border-r border-white/[0.03] bg-black/20 backdrop-blur-md">
            <div className="flex flex-col items-center gap-6">
                {/* Core Reactor Icon */}
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 rotate-45 group-hover:rotate-90 transition-transform duration-700" />
                    <Sparkles size={18} className="text-cyan-400 z-10 animate-pulse" />
                </div>

                {/* Connection Status */}
                <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.5)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"} transition-all`} />
                    <span className="text-[8px] font-black text-gray-700 font-mono tracking-widest">{isConnected ? "ONLINE" : "OFFLINE"}</span>
                </div>
            </div>

            {/* Hardware Metrics */}
            <div className="flex flex-col items-center gap-8">
                <StatCircle value={metrics.cpu} color="text-cyan-400" icon={Cpu} label="CPU" />
                <StatCircle value={metrics.ram_percent} color="text-violet-400" icon={Database} label="MEM" />
                <StatCircle value={100} color="text-amber-400" icon={Zap} label="PWR" />
            </div>

            {/* Clock Area */}
            <div className="flex flex-col items-center gap-2">
                <Clock size={12} className="text-gray-700" />
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black font-mono text-gray-500 leading-none">
                        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                    </span>
                    <span className="text-[7px] font-black font-mono text-gray-700 mt-1 tracking-tighter">TIMESTAMP</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
