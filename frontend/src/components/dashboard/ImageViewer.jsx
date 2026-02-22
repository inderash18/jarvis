import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    X,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    ExternalLink,
    Image as ImageIcon,
} from "lucide-react";

const ImageViewer = ({ images, activeIndex, onClose }) => {
    const [current, setCurrent] = useState(activeIndex || 0);

    useEffect(() => setCurrent(activeIndex || 0), [activeIndex]);

    if (!images || images.length === 0) return null;
    const img = images[current];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" />

            {/* Content */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                            <ImageIcon size={18} className="text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white truncate max-w-md tracking-tight">
                                {img?.title || "Image Preview"}
                            </h3>
                            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                                Source: {img?.source || "Internal"} • {current + 1} / {images.length}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {img?.source && (
                            <a
                                href={img.source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"
                            >
                                <ExternalLink size={16} />
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all border border-white/5"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Main Image Container */}
                <div className="relative flex-1 min-h-0 rounded-3xl overflow-hidden bg-white/[0.02] border border-white/10 shadow-2xl flex items-center justify-center group">
                    <img
                        src={img?.image_url || img?.thumbnail}
                        alt={img?.title || "Image"}
                        className="max-w-full max-h-[70vh] object-contain transition-transform duration-500 group-hover:scale-[1.01]"
                        onError={(e) => {
                            e.target.src = img?.thumbnail || "";
                        }}
                    />

                    {/* Navigation Overlay */}
                    {images.length > 1 && (
                        <>
                            <div className="absolute inset-y-0 left-0 w-24 flex items-center justify-start pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setCurrent((p) => (p > 0 ? p - 1 : images.length - 1))}
                                    className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-cyan-500/40 hover:border-cyan-500/50 transition-all shadow-lg"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            </div>
                            <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-end pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setCurrent((p) => (p < images.length - 1 ? p + 1 : 0))}
                                    className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-cyan-500/40 hover:border-cyan-500/50 transition-all shadow-lg"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Thumbnails Row */}
                {images.length > 1 && (
                    <div className="flex gap-3 mt-4 overflow-x-auto pb-2 px-2 scrollbar-hide no-scrollbar">
                        {images.map((im, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrent(i)}
                                className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${i === current
                                        ? "border-cyan-400 scale-105 shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                                        : "border-white/5 opacity-40 hover:opacity-100 hover:border-white/20"
                                    }`}
                            >
                                <img
                                    src={im.thumbnail || im.image_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default ImageViewer;
