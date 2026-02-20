import React, { useRef, useEffect, useState } from "react";

const Canvas = ({
  commands = [],
  isProcessing = false,
  isListening = false,
}) => {
  const canvasRef = useRef(null);
  const [objects, setObjects] = useState([]);

  // Process incoming commands
  useEffect(() => {
    if (commands.length > 0) {
      const lastCmd = commands[commands.length - 1];
      if (lastCmd.type === "result" && lastCmd.data?.execution_results) {
        // Extract canvas actions
        lastCmd.data.execution_results.forEach((res) => {
          if (res.agent === "CanvasAgent" && res.output) {
            setObjects((prev) => [...prev, res.output]);
          } else if (res.agent === "CanvasAgent" && res.status === "cleared") {
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
    const ctx = canvas.getContext("2d");

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw objects with "Holo-Wireframe" styling
    objects.forEach((obj) => {
      ctx.beginPath();

      // Shared Styles
      ctx.lineWidth = 2;

      if (obj.type === "circle") {
        ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);

        // Holo Glow Stroke
        ctx.strokeStyle = "#00f0ff"; // Cyan
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00f0ff";
        ctx.stroke();

        // Tech Fill (Scanlines)
        const pattern = ctx.createLinearGradient(0, 0, 0, 10);
        pattern.addColorStop(0, "rgba(0, 240, 255, 0.2)");
        pattern.addColorStop(0.5, "transparent");
        pattern.addColorStop(1, "rgba(0, 240, 255, 0.2)");

        ctx.fillStyle = "rgba(0, 240, 255, 0.05)";
        ctx.fill();

        // Center point
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = "#fff";
        ctx.fill();
      } else if (obj.type === "rect") {
        ctx.rect(obj.x, obj.y, obj.width, obj.height);

        ctx.strokeStyle = "#7000ff"; // Violet
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#7000ff";
        ctx.stroke();

        ctx.fillStyle = "rgba(112, 0, 255, 0.05)";
        ctx.fill();

        // Corner Markers
        const s = 10; // size
        ctx.beginPath();
        // Top Left
        ctx.moveTo(obj.x, obj.y + s);
        ctx.lineTo(obj.x, obj.y);
        ctx.lineTo(obj.x + s, obj.y);
        // Bottom Right
        ctx.moveTo(obj.x + obj.width, obj.y + obj.height - s);
        ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
        ctx.lineTo(obj.x + obj.width - s, obj.y + obj.height);

        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }
    });
  }, [objects]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full object-cover opacity-60"
      />
    </div>
  );
};

export default Canvas;
