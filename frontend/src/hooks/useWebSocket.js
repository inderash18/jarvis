import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://localhost:8000/ws/chief';

export const useWebSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState('disconnected');
    const [messages, setMessages] = useState([]);
    const ws = useRef(null);

    useEffect(() => {
        let reconnectTimeout;

        const connect = () => {
            if (ws.current?.readyState === WebSocket.OPEN) return;

            console.log('Connecting to JARVIS Backend...');
            const socket = new WebSocket(WS_URL);
            ws.current = socket;

            socket.onopen = () => {
                console.log('Connected to JARVIS Backend');
                setIsConnected(true);
                setStatus('connected');
            };

            socket.onclose = () => {
                console.log('Disconnected from JARVIS Backend');
                setIsConnected(false);
                setStatus('disconnected');
                // Try to reconnect
                reconnectTimeout = setTimeout(connect, 3000);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setMessages((prev) => [...prev, data]);
                } catch (e) {
                    console.error("Failed to parse message", e);
                }
            };

            socket.onerror = (err) => {
                console.error("WebSocket Error:", err);
                socket.close();
            };
        };

        connect();

        return () => {
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (ws.current) {
                // Prevent onclose from triggering reconnection when unmounting
                ws.current.onclose = null;
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
