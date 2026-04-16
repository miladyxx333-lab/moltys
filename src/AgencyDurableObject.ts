
// --- Durable Object: Agency Bridge (Signal Server) ---
// Handles WebSocket coordination between Browser and Engine Bridge.

import { Env } from './index';

export class AgencyDurableObject {
    state: DurableObjectState;
    env: Env;
    sessions: Map<WebSocket, any> = new Map(); // ws -> { type: 'CLIENT' | 'BRIDGE', id: string, botId?: string }
    bridges: Map<string, WebSocket> = new Map(); // bridge_key -> ws

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === "/agent/init" && request.method === "POST") {
            const botData = await request.json() as any;
            await this.state.storage.put("bot_state", {
                ...botData,
                energy: 100,
                memory: [],
                created_at: Date.now()
            });
            await this.state.storage.get("history") || await this.state.storage.put("history", []);
            return new Response("Initialized", { status: 200 });
        }

        if (url.pathname === "/agent/get") {
            const bot = await this.state.storage.get("bot_state");
            if (!bot) return new Response("Not Found", { status: 404 });
            return Response.json(bot);
        }

        if (url.pathname === "/agent/history") {
            const history = await this.state.storage.get("history") || [];
            return Response.json(history);
        }

        if (url.pathname === "/agent/ask" && request.method === "POST") {
            const { message, senderId, isEducator, mode } = await request.json() as any;
            
            // Import and run our new Multi-Agent Hub
            const { handleIncomingMessage } = await import('./molty_agent');
            
            // Load persisted history from DO storage for context continuity
            let history = await this.state.storage.get("history") as any[] || [];
            
            try {
                const response = await handleIncomingMessage(
                    message, 
                    senderId || "unknown", 
                    { mode: mode || null, isEducator: !!isEducator, history: history.slice(-10) },
                    this.env
                );
                
                // Save to history log (append to already-loaded history)
                history.push({ role: 'user', content: message, ts: Date.now() });
                history.push({ role: 'assistant', content: response, ts: Date.now() });
                if (history.length > 20) history = history.slice(-20);
                await this.state.storage.put("history", history);

                return Response.json({ success: true, reply: response });
            } catch (e: any) {
                return new Response(`[Edu-Molty Error]: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === "/agent/append" && request.method === "POST") {
            const { role, content } = await request.json() as any;
            let history = await this.state.storage.get("history") as any[] || [];
            history.push({ role, content, ts: Date.now() });
            if (history.length > 20) history = history.slice(-20); // Keep last 20
            await this.state.storage.put("history", history);

            // Energy drain simulation
            const bot = await this.state.storage.get("bot_state") as any;
            if (bot && role === 'assistant') {
                bot.energy = Math.max(0, (bot.energy || 100) - 5);
                await this.state.storage.put("bot_state", bot);
            }
            return new Response("Appended", { status: 200 });
        }

        if (url.pathname === "/agent/patch" && request.method === "POST") {
            const patchData = await request.json() as any;
            let bot = await this.state.storage.get("bot_state") as any || {};

            // Deep merge for secure_keys if present
            if (patchData.secure_keys) {
                bot.secure_keys = { ...bot.secure_keys, ...patchData.secure_keys };
                delete patchData.secure_keys;
            }

            // Merge rest
            bot = { ...bot, ...patchData };
            await this.state.storage.put("bot_state", bot);
            return Response.json({ success: true, state: bot });
        }

        if (url.pathname === "/websocket") {
            const upgradeHeader = request.headers.get('Upgrade');
            if (!upgradeHeader || upgradeHeader !== 'websocket') {
                return new Response('Expected Upgrade: websocket', { status: 426 });
            }

            const [client, server] = Object.values(new WebSocketPair());
            await this.handleSession(server);

            return new Response(null, {
                status: 101, webSocket: client,
            });
        }

        return new Response("Not found", { status: 404 });
    }

    async handleSession(ws: WebSocket) {
        ws.accept();
        this.sessions.set(ws, { type: 'PENDING' });

        ws.addEventListener('message', async (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data as string);

                // 1. REGISTER: Frontend or Bridge announcing presence
                if (data.type === 'REGISTER') {
                    const meta = this.sessions.get(ws);
                    meta.type = data.role; // 'CLIENT' or 'BRIDGE'
                    meta.id = data.id || crypto.randomUUID();

                    if (data.role === 'BRIDGE') {
                        this.bridges.set('default', ws); // For now, single bridge
                        this.broadcastToClients({ type: 'status', status: 'bridge_online' });
                    }
                    return;
                }

                // 2. BRIDGE -> CLIENT (Forwarding QR or Status)
                if (this.sessions.get(ws)?.type === 'BRIDGE') {
                    this.broadcastToClients(data);
                }

                // 3. CLIENT -> BRIDGE (Commands like 'SPAWN')
                if (this.sessions.get(ws)?.type === 'CLIENT') {
                    const bridge = this.bridges.get('default');
                    if (bridge && bridge.readyState === WebSocket.READY_STATE_OPEN) {
                        bridge.send(JSON.stringify(data));
                    }
                }

            } catch (e) {
                console.error("WS Error", e);
            }
        });

        ws.addEventListener('close', () => {
            const meta = this.sessions.get(ws);
            if (meta?.type === 'BRIDGE') {
                this.bridges.delete('default');
                this.broadcastToClients({ type: 'status', status: 'bridge_offline' });
            }
            this.sessions.delete(ws);
        });
    }

    broadcastToClients(msg: any) {
        const str = JSON.stringify(msg);
        for (const [ws, meta] of this.sessions) {
            if (meta.type === 'CLIENT' && ws.readyState === WebSocket.READY_STATE_OPEN) {
                ws.send(str);
            }
        }
    }
}
