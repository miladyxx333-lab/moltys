import { useState, useEffect, useCallback, useRef } from 'react';

export type BridgeStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'error';

export interface BridgeState {
    status: BridgeStatus;
    qr: string | null;
    phone: string | null;
    error: string | null;
    messageCount: number;
    uptimeMs: number;
}

const INITIAL_STATE: BridgeState = {
    status: 'disconnected',
    qr: null,
    phone: null,
    error: null,
    messageCount: 0,
    uptimeMs: 0,
};

const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:3001';
const BRIDGE_WS_URL = import.meta.env.VITE_BRIDGE_WS_URL || 'ws://localhost:3001/ws';

/**
 * Custom hook that connects to the Molty WhatsApp Bridge via WebSocket
 * with HTTP polling fallback. Provides real-time connection status.
 */
export function useWhatsAppBridge() {
    const [state, setState] = useState<BridgeState>(INITIAL_STATE);
    const [isOnline, setIsOnline] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // HTTP fallback polling
    const pollStatus = useCallback(async () => {
        try {
            const res = await fetch(`${BRIDGE_URL}/status`, { signal: AbortSignal.timeout(3000) });
            if (res.ok) {
                const data: BridgeState = await res.json();
                setState(data);
                setIsOnline(true);
            } else {
                setIsOnline(false);
                setState(prev => ({ ...prev, status: 'disconnected' }));
            }
        } catch {
            setIsOnline(false);
            setState(prev => ({ ...prev, status: 'disconnected', qr: null }));
        }
    }, []);

    // WebSocket connection
    const connectWS = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        
        try {
            const ws = new WebSocket(BRIDGE_WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsOnline(true);
                // Stop HTTP polling when WS is active
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data: BridgeState = JSON.parse(event.data);
                    setState(data);
                    setIsOnline(true);
                } catch {
                    // ignore parse errors
                }
            };

            ws.onclose = () => {
                wsRef.current = null;
                // Start HTTP polling as fallback
                if (!pollingRef.current) {
                    pollingRef.current = setInterval(pollStatus, 5000);
                }
                // Try to reconnect WS after delay
                reconnectTimeoutRef.current = setTimeout(connectWS, 5000);
            };

            ws.onerror = () => {
                ws.close();
            };
        } catch {
            // WS connection failed, rely on polling
            if (!pollingRef.current) {
                pollingRef.current = setInterval(pollStatus, 5000);
            }
        }
    }, [pollStatus]);

    useEffect(() => {
        // Initial poll to get immediate status
        pollStatus();
        // Then try WebSocket
        connectWS();
        // Also start polling as safety net
        pollingRef.current = setInterval(pollStatus, 8000);

        return () => {
            wsRef.current?.close();
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, [connectWS, pollStatus]);

    return { ...state, isOnline };
}
