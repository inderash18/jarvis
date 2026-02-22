import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    User,
    Bot,
    Maximize2,
    ExternalLink,
    Play,
} from "lucide-react";

/**
 * Video Item inside a message
 */
const VideoMessageItem = ({ vid, shouldPlay }) => {
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (shouldPlay) setIsPlaying(true);
    }, [shouldPlay]);

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 group shadow-lg"
        >
            {isPlaying ? (
                <video
                    src={vid.video_url}
                    controls
                    autoPlay
                    className="w-full h-full object-cover"
                />
            ) : (
                <>
                    <img
                        src={vid.thumbnail}
                        alt={vid.title}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-50 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <button
                            onClick={() => setIsPlaying(true)}
                            className="w-14 h-14 rounded-full bg-cyan-500/90 flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-110 transition-all border border-cyan-400"
                        >
                            <Play size={24} fill="white" className="ml-1" />
                        </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                        <p className="text-xs text-white/90 truncate font-semibold">
                            {vid.title}
                        </p>
                    </div>
                </>
            )}
        </motion.div>
    );
};

/**
 * Individual Chat Bubble
 */
const ChatMessage = ({ msg, onImageClick, playingVideo }) => {
    const isUser = msg.role === "user";
    let content = msg.content;

    if (typeof content !== "string") content = JSON.stringify(content, null, 2);

    // Use the new simplified NLU format fields if they exist
    const responseToUser = msg.data?.original_response?.response_to_user;
    const thoughtProcess = msg.data?.original_response?.thought_process;

    let displayText = responseToUser || thoughtProcess || content;

    return (
        <motion.div
            initial={{ opacity: 0, x: isUser ? 20 : -20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"} w-full group mb-1`}
        >
            {/* Avatar with dynamic glow */}
            <div
                className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${isUser
                        ? "bg-violet-500/10 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)] group-hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                        : "bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.1)] group-hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                    }`}
            >
                {isUser ? (
                    <User size={18} className="text-violet-400" />
                ) : (
                    <Bot size={18} className="text-cyan-400" />
                )}
            </div>

            {/* Message Content Stack */}
            <div className={`flex flex-col gap-3 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
                {/* Main Text Bubble */}
                <div
                    className={`px-5 py-4 rounded-3xl text-[15px] leading-relaxed shadow-xl ${isUser
                            ? "bg-gradient-to-br from-violet-600/20 to-violet-900/10 border border-violet-500/20 text-violet-50 rounded-tr-sm"
                            : "bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 text-gray-100 rounded-tl-sm backdrop-blur-md"
                        }`}
                >
                    <p className="whitespace-pre-wrap break-words">{displayText}</p>
                </div>

                {/* Media Attachments Section */}
                <div className={`flex flex-col gap-3 w-full ${isUser ? "items-end" : "items-start"}`}>
                    {/* Images Grid */}
                    {msg.images && msg.images.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                            {msg.images.slice(0, 4).map((img, i) => (
                                <motion.button
                                    key={i}
                                    whileHover={{ scale: 1.03, rotate: 1 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => onImageClick(msg.images, i)}
                                    className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all shadow-lg group-media"
                                >
                                    <img
                                        src={img.thumbnail || img.image_url}
                                        alt={img.title || ""}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-media-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                                        <span className="text-[10px] text-white/70 font-mono truncate mr-2">{img.title}</span>
                                        <Maximize2 size={12} className="text-cyan-400 shrink-0" />
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    )}

                    {/* Videos List */}
                    {msg.videos && msg.videos.length > 0 && (
                        <div className="flex flex-col gap-3 w-full max-w-md">
                            {msg.videos.slice(0, 2).map((vid, i) => (
                                <VideoMessageItem
                                    key={i}
                                    vid={vid}
                                    shouldPlay={playingVideo && playingVideo.messageId === msg.id && playingVideo.videoIndex === i}
                                />
                            ))}
                        </div>
                    )}

                    {/* Search Result Links */}
                    {msg.links && msg.links.length > 0 && (
                        <div className="flex flex-col gap-2.5 w-full max-w-md">
                            {msg.links.map((link, i) => (
                                <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-cyan-500/40 transition-all group-link shadow-lg"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-black text-cyan-400 truncate pr-4 tracking-tight">
                                            {link.title}
                                        </span>
                                        <ExternalLink size={12} className="text-gray-600 group-link-hover:text-cyan-400 group-link-hover:scale-110 transition-all" />
                                    </div>
                                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-snug font-medium italic">
                                        {link.snippet}
                                    </p>
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {/* Status Line */}
                <div className="flex items-center gap-3 px-1">
                    <span className="text-[10px] text-gray-600 font-mono tracking-tighter">
                        {msg.timestamp
                            ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                    </span>
                    {!isUser && (
                        <div className="flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-cyan-500/20" />
                            <div className="w-1 h-1 rounded-full bg-cyan-500/40" />
                            <div className="w-1 h-1 rounded-full bg-cyan-500/60" />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default ChatMessage;
