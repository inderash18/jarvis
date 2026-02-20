import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const CenterHUD = ({ isListening, isProcessing, activeAgent }) => {
    // Rotation state for different rings
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setRotation(prev => (prev + 0.5) % 360);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    const ringColor = isListening ? "text-jarvis-violet" : isProcessing ? "text-jarvis-amber" : "text-jarvis-cyan";
    const glowColor = isListening ? "shadow-[0_0_20px_#7000ff]" : isProcessing ? "shadow-[0_0_20px_#ffae00]" : "shadow-[0_0_20px_#00f0ff]";

    return (
        <div className="relative w-[600px] h-[600px] flex items-center justify-center pointer-events-none select-none z-0">
            {/* Base Glow */}
            <div className={`absolute w-[400px] h-[400px] rounded-full opacity-10 blur-3xl transition-colors duration-500 ${isListening ? 'bg-violet-600' : 'bg-cyan-500'}`} />

            {/* Outer Ring - Static with notches */}
            <div className={`absolute w-[580px] h-[580px] rounded-full border border-white/10 flex items-center justify-center`}>
                <div className="absolute top-0 w-1 h-4 bg-white/20" />
                <div className="absolute bottom-0 w-1 h-4 bg-white/20" />
                <div className="absolute left-0 w-4 h-1 bg-white/20" />
                <div className="absolute right-0 w-4 h-1 bg-white/20" />
            </div>

            {/* Rotating Ring 1 - Dashed */}
            <div
                className={`absolute w-[500px] h-[500px] rounded-full border border-dashed border-white/20 transition-transform duration-1000 ease-linear`}
                style={{ transform: `rotate(${rotation}deg)` }}
            />

            {/* Rotating Ring 2 - Opposite */}
            <div
                className={`absolute w-[450px] h-[450px] rounded-full border-t-2 border-b-2 border-white/10 transition-transform duration-1000 ease-linear`}
                style={{ transform: `rotate(-${rotation * 1.5}deg)` }}
            />

            {/* Main Arc Reactor Body */}
            <div className="relative w-[300px] h-[300px] rounded-full border-4 border-white/5 flex items-center justify-center">
                {/* Active Glow Ring */}
                <div className={`absolute w-full h-full rounded-full border-2 ${ringColor} opacity-50 ${isListening ? 'animate-pulse' : ''}`} />

                {/* Inner Segments */}
                <svg className={`w-full h-full absolute animate-spin-slow text-white/10`} viewBox="0 0 100 100">
                     <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="10 5" />
                </svg>

                {/* Core */}
                <div className={`w-[120px] h-[120px] rounded-full border-4 ${ringColor} flex items-center justify-center backdrop-blur-sm transition-all duration-300 ${glowColor} bg-black/40`}>
                    <div className={`w-[80px] h-[80px] rounded-full border ${ringColor} opacity-80 flex items-center justify-center`}>
                        {isListening ? (
                            <div className="w-12 h-12 bg-jarvis-violet rounded-full animate-ping opacity-75" />
                        ) : isProcessing ? (
                             <div className="w-12 h-12 border-4 border-t-transparent border-jarvis-amber rounded-full animate-spin" />
                        ) : (
                            <div className="w-2 h-2 bg-jarvis-cyan rounded-full animate-pulse shadow-[0_0_10px_#00f0ff]" />
                        )}
                    </div>
                </div>

                {/* Text Labels */}
                <div className="absolute -bottom-12 text-[10px] tracking-[0.3em] text-white/40 font-display">
                    STATUS: {isListening ? "LISTENING" : isProcessing ? "PROCESSING" : "STANDBY"}
                </div>
            </div>

            {/* Floating Widgets around HUD */}
            <div className="absolute top-1/2 left-0 -translate-x-12 -translate-y-1/2 flex flex-col gap-2 opacity-50">
                 <div className="w-24 h-[1px] bg-gradient-to-l from-cyan-500 to-transparent" />
                 <div className="text-[8px] text-right text-cyan-500 font-mono">SYS.MON</div>
            </div>
            <div className="absolute top-1/2 right-0 translate-x-12 -translate-y-1/2 flex flex-col gap-2 opacity-50">
                 <div className="w-24 h-[1px] bg-gradient-to-r from-cyan-500 to-transparent" />
                 <div className="text-[8px] text-left text-cyan-500 font-mono">NET.IO</div>
            </div>

        </div>
    );
};

export default CenterHUD;
