import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const Canvas = ({ commands = [] }) => {
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

        // Draw grid
        drawGrid(ctx, canvas.width, canvas.height);

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

                // Add glow
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00f3ff';
            } else if (obj.type === 'rect') {
                // Implement rect logic if needed
            }
            ctx.shadowBlur = 0; // Reset
        });

    }, [objects]);

    const drawGrid = (ctx, w, h) => {
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 1;
        for (let x = 0; x <= w; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y <= h; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    };

    return (
        <div className="relative w-full h-full bg-jarvis-bg overflow-hidden rounded-xl border border-white/10 shadow-2xl">
            <div className="absolute top-4 left-4 text-xs font-mono text-jarvis-primary/50">
                CANVAS SYSTEM v1.0
            </div>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-full object-contain"
            />
        </div>
    );
};

export default Canvas;
