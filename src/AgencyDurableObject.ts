
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

        if (url.pathname === "/websocket") {
            const upgradeHeader = request.headers.get('Upgrade');
            if (!upgradeHeader || upgradeHeader !== 'websocket') {
                return new Response('Expected Upgrade: websocket', { status: 426 });
            }

            const [client, server] = Object.values(new WebSocketPair());
            await this.handleSession(server);

            return new Response(null, {
                status: 101,
                webSocket: client,
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
