import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import coreImage from '../assets/1.jpg';

const HUDReactor = ({ isProcessing, isListening }) => {
    // Determine state color and animation speed
    let state = 'idle';
    if (isProcessing) state = 'processing';
    if (isListening) state = 'listening';

    const colors = {
        processing: 'border-jarvis-accent',
        listening: 'border-amber-400',
        idle: 'border-jarvis-primary/20'
    };

    const shadows = {
        processing: 'shadow-[0_0_80px_rgba(255,0,60,0.4)]',
        listening: 'shadow-[0_0_80px_rgba(251,191,36,0.4)]',
        idle: 'shadow-[0_0_50px_rgba(0,243,255,0.1)]'
    };

    const bgColors = {
        processing: 'bg-jarvis-accent/30',
        listening: 'bg-amber-400/30',
        idle: 'bg-jarvis-primary/20'
    };

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            {/* Outer Ring */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: state === 'idle' ? 20 : 2, repeat: Infinity, ease: "linear" }}
                className={`w-[500px] h-[500px] border ${state !== 'idle' ? 'border-2' : ''} ${colors[state]} rounded-full border-dashed transition-all duration-500`}
            />
            {/* Middle Ring */}
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: state === 'idle' ? 15 : 3, repeat: Infinity, ease: "linear" }}
                className={`absolute w-[400px] h-[400px] border ${state === 'processing' ? 'border-jarvis-accent/30' : state === 'listening' ? 'border-amber-400/30' : 'border-jarvis-secondary/20'} rounded-full border-dotted transition-colors duration-500`}
            />
            {/* Core Container */}
            <motion.div
                animate={{ scale: state !== 'idle' ? [1, 1.15, 1] : [1, 1.05, 1] }}
                transition={{ duration: state !== 'idle' ? 0.5 : 4, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute w-[200px] h-[200px] border-2 ${state === 'processing' ? 'border-jarvis-accent' : state === 'listening' ? 'border-amber-400' : 'border-jarvis-primary/30'} ${shadows[state]} rounded-full flex items-center justify-center overflow-hidden transition-all duration-500`}
            >
                <div className={`absolute inset-0 ${bgColors[state]} animate-pulse`} />
                <img src={coreImage} alt="Core" className="w-full h-full object-cover opacity-50 mix-blend-screen" />
            </motion.div>

            {/* Core Center Dot */}
            <div className={`absolute w-3 h-3 ${state === 'processing' ? 'bg-jarvis-accent shadow-[0_0_20px_#ff003c] scale-150' : state === 'listening' ? 'bg-amber-400 shadow-[0_0_20px_#fbbf24] scale-125' : 'bg-jarvis-primary shadow-[0_0_10px_#00f3ff]'} rounded-full transition-all duration-300`} />
        </div>
    );
};

const Canvas = ({ commands = [], isProcessing = false, isListening = false }) => {
    const canvasRef = useRef(null);
    const [objects, setObjects] = useState([]);

    // Process incoming commands
    useEffect(() => {
        if (commands.length > 0) {
            const lastCmd = commands[commands.length - 1];
            if (lastCmd.type === 'result' && lastCmd.data?.execution_results) {
                // Extract canvas actions
                lastCmd.data.execution_results.forEach(res => {
                    if (res.agent === 'CanvasAgent' && res.output) {
                        setObjects(prev => [...prev, res.output]);
                    } else if (res.agent === 'CanvasAgent' && res.status === 'cleared') {
                        setObjects([]);
                    }
                });
            }
        }
    }, [commands]);

    // Render objects
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw objects
        objects.forEach(obj => {
            ctx.beginPath();
            if (obj.type === 'circle') {
                ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
                ctx.strokeStyle = '#00f3ff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = 'rgba(0, 243, 255, 0.1)';
                ctx.fill();
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00f3ff';
            } else if (obj.type === 'rect') {
                ctx.rect(obj.x, obj.y, obj.width, obj.height);
                ctx.strokeStyle = '#bc13fe';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = 'rgba(188, 19, 254, 0.1)';
                ctx.fill();
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#bc13fe';
            }
            ctx.shadowBlur = 0;
        });

    }, [objects]);

    return (
        <div className="relative w-full h-full overflow-hidden group">
            <HUDReactor isProcessing={isProcessing} isListening={isListening} />

            <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none">
                <div className="text-xs font-mono text-jarvis-primary font-bold tracking-widest">CANVAS.SYS.V2</div>
                <div className="text-[10px] text-white/40">RENDERING ENGINE: {isProcessing ? 'PROCESSING' : isListening ? 'LISTENING' : 'IDLE'}</div>
            </div>

            <canvas
                ref={canvasRef}
                width={1920}
                height={1080}
                className="relative z-10 w-full h-full object-cover pointer-events-none"
            />

            {/* Corner Accents */}
            <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-jarvis-primary/50 rounded-tl-lg opacity-50" />
            <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-jarvis-primary/50 rounded-br-lg opacity-50" />
        </div>
    );
};

export default Canvas;
