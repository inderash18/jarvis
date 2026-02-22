import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import { useVoice } from "./useVoice";
import { useSound } from "./useSound";

/**
 * useJarvisChat Hook
 * ──────────────────
 * High-level orchestrator for JARVIS chat logic.
 * Handles:
 *  - Message processing (streaming vs final)
 *  - Media extraction (images, videos, links)
 *  - Voice & Sound synchronization
 *  - Chat state management
 */
export const useJarvisChat = () => {
    const { isConnected, status, messages, stats, sendMessage } = useWebSocket();
    const { speak, stopSpeaking, isSpeaking, isListening, transcript, startListening, stopListening, resetTranscript } = useVoice();
    const { playProcessing, playSuccess, playClick } = useSound();

    const [input, setInput] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [streamingMessage, setStreamingMessage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [playingVideo, setPlayingVideo] = useState(null);
    const [canvasCommands, setCanvasCommands] = useState([]);

    const chatHistoryRef = useRef([]);
    useEffect(() => { chatHistoryRef.current = chatHistory; }, [chatHistory]);

    // ── Helper: Extract thought from partial JSON ────────────────────────
    const extractPartialThought = (text) => {
        if (!text) return "";
        const nluMatch = text.match(/"response_to_user":\s*"([^"]*)"?/);
        const legacyMatch = text.match(/"thought_process":\s*"([^"]*)"?/);
        const match = nluMatch || legacyMatch;
        if (match && match[1]) return match[1].replace(/\\n/g, "\n");
        return text.length < 20 ? text : ""; // Only show raw text if it's very short (likely not a JSON yet)
    };

    // ── Sync Transcript ────────────────────────────────────────────────
    useEffect(() => { if (transcript) setInput(transcript); }, [transcript]);

    // ── Process Incoming WebSocket Messages ────────────────────────────
    useEffect(() => {
        if (messages.length === 0) return;
        const last = messages[messages.length - 1];

        if (last.type === "status") {
            setIsProcessing(true);
            playProcessing();
        } else if (last.type === "assistant_response" || last.type === "result") {
            if (last.isStreaming) {
                const partial = extractPartialThought(last.content);
                if (partial) {
                    setStreamingMessage({ role: "assistant", content: partial, isStreaming: true });
                }
                return;
            }

            // Final Message
            const messageData = last.type === "result" ? last.data : last.data;
            if (messageData) {
                setIsProcessing(false);
                setStreamingMessage(null);

                const res = messageData.original_response;
                const thoughtText = res?.response_to_user || res?.thought_process || last.content;
                const source = res?.source || "unknown";

                // Speak only if dashboard triggered
                if (thoughtText && source === "dashboard") speak(thoughtText);

                // Media Extraction
                let foundImgs = [], foundVids = [], foundLinks = [];
                const results = messageData.execution_results || [];

                results.forEach((action) => {
                    if (action.image_url || action.all_images) {
                        foundImgs = [...foundImgs, ...(action.all_images || [action])];
                    }
                    if (action.video_url || action.all_videos) {
                        foundVids = [...foundVids, ...(action.all_videos || [action])];
                    }
                    if (action.results && action.agent === "SearchAgent") {
                        foundLinks = [...foundLinks, ...action.results];
                    }

                    // Command Canvas cleanup/sync
                    if (action.agent === "CanvasAgent" || action.status === "cleared") {
                        setCanvasCommands(prev => [...prev, { type: "result", data: messageData }]);
                    }

                    // Auto-play video if requested
                    if (action.agent === "UIAgent" && action.action === "play_video") {
                        const idx = action.parameters?.index || 0;
                        const lastMsgWithVids = [...chatHistoryRef.current].reverse().find(m => m.videos?.length > 0);
                        if (lastMsgWithVids) setPlayingVideo({ messageId: lastMsgWithVids.id, videoIndex: idx });
                    }
                });

                // Update History
                setChatHistory(prev => [
                    ...prev,
                    {
                        id: Date.now(),
                        role: "assistant",
                        content: thoughtText || "Acknowledged.",
                        images: foundImgs.length > 0 ? foundImgs : null,
                        videos: foundVids.length > 0 ? foundVids : null,
                        links: foundLinks.length > 0 ? foundLinks : null,
                        timestamp: new Date(),
                        data: messageData
                    }
                ]);
            }
        } else if (last.type === "error") {
            setIsProcessing(false);
            setStreamingMessage(null);
            setChatHistory(p => [...p, { role: "assistant", content: "Apologies, sir. There was an error.", timestamp: new Date() }]);
        }
    }, [messages, speak, playProcessing]);

    // ── Actions ─────────────────────────────────────────────────────────
    const handleSend = useCallback((textOverride) => {
        const cmd = (textOverride || input).trim();
        if (!cmd || isProcessing) return;

        playSuccess();
        setChatHistory(p => [...p, { role: "user", content: cmd, timestamp: new Date() }]);
        sendMessage(cmd);
        setInput("");
        resetTranscript();
        setIsProcessing(true);
    }, [input, isProcessing, sendMessage, resetTranscript, playSuccess]);

    const clearHistory = () => {
        setChatHistory([]);
        setCanvasCommands([]);
        setStreamingMessage(null);
    };

    const toggleVoice = () => {
        playClick();
        isListening ? stopListening() : startListening();
    };

    return {
        input, setInput,
        chatHistory, streamingMessage,
        isProcessing, isConnected, isListening, isSpeaking,
        stats, canvasCommands, playingVideo,
        handleSend, toggleVoice, clearHistory, stopSpeaking
    };
};
