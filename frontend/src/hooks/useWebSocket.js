import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://localhost:8000/ws/chief';

export const useWebSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState('disconnected');
    const [messages, setMessages] = useState([]);
    const ws = useRef(null);

    useEffect(() => {
        // Only connect once
        if (ws.current) return;

        ws.current = new WebSocket(WS_URL);

        ws.current.onopen = () => {
            console.log('Connected to JARVIS Backend');
            setIsConnected(true);
            setStatus('connected');
        };

        ws.current.onclose = () => {
            console.log('Disconnected from JARVIS Backend');
            setIsConnected(false);
            setStatus('disconnected');
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setMessages((prev) => [...prev, data]);
            } catch (e) {
                console.error("Failed to parse message", e);
            }
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const sendMessage = useCallback((command) => {
        if (ws.current && isConnected) {
            ws.current.send(JSON.stringify({ command }));
        } else {
            console.warn("WebSocket is not connected");
        }
    }, [isConnected]);

    return { isConnected, status, messages, sendMessage };
};
