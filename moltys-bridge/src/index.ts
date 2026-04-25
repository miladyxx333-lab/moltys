
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import axios from 'axios';
import dotenv from 'dotenv';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

// --- CONFIG ---
const BACKEND_URL = process.env.BACKEND_URL || "https://lobpoop-core.miladyxx333.workers.dev";
const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT || "3001");
const logger = pino({ level: 'warn' });

// --- GLOBAL STATE ---
let connectionStatus: 'disconnected' | 'connecting' | 'qr_ready' | 'connected' = 'disconnected';
let currentQR: string | null = null;
let connectedPhone: string | null = null;
let lastError: string | null = null;
let messageCount = 0;
let startTime = Date.now();

// WebSocket clients subscribed to live updates
const wsClients = new Set<WebSocket>();

function broadcastStatus() {
    const payload = JSON.stringify(getStatusPayload());
    for (const client of wsClients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
}

function getStatusPayload() {
    return {
        status: connectionStatus,
        qr: currentQR,
        phone: connectedPhone,
        error: lastError,
        messageCount,
        uptimeMs: Date.now() - startTime,
    };
}

// --- HTTP SERVER (CORS-enabled for frontend) ---
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url || '/', `http://localhost:${BRIDGE_PORT}`);

    if (url.pathname === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getStatusPayload()));
        return;
    }

    if (url.pathname === '/qr') {
        if (currentQR) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ qr: currentQR }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No QR available', status: connectionStatus }));
        }
        return;
    }

    if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, service: 'moltys-bridge' }));
        return;
    }

    // Default: simple landing
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🐾 Molty Bridge is alive. GET /status for connection info.');
});

// --- WEBSOCKET SERVER (for live status) ---
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws) => {
    wsClients.add(ws);
    // Send current state immediately
    ws.send(JSON.stringify(getStatusPayload()));
    ws.on('close', () => wsClients.delete(ws));
});

// --- WHATSAPP CONNECTION (Baileys) ---
async function connectToWhatsApp() {
    connectionStatus = 'connecting';
    currentQR = null;
    lastError = null;
    broadcastStatus();

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    
    console.log(`\n🐾 Molty's Bridge: Starting WhatsApp session (v${version.join('.')})`);

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        generateHighQualityLinkPreview: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log("📱 QR Code generado — esperando escaneo...");
            currentQR = qr;
            connectionStatus = 'qr_ready';
            broadcastStatus();
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            lastError = `Closed (code: ${statusCode})`;
            connectionStatus = 'disconnected';
            currentQR = null;
            connectedPhone = null;
            broadcastStatus();

            console.log('❌ Conexión cerrada. ¿Reintentar?:', shouldReconnect);
            if (shouldReconnect) {
                setTimeout(() => connectToWhatsApp(), 3000);
            }
        } else if (connection === 'open') {
            connectionStatus = 'connected';
            currentQR = null;
            lastError = null;
            connectedPhone = sock.user?.id?.split(':')[0] || 'unknown';
            console.log(`✅ Molty conectado a WhatsApp (${connectedPhone})`);
            broadcastStatus();
        }
    });

    // --- ESCUCHAR MENSAJES ---
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
            if (!msg.key.fromMe && msg.message) {
                const senderId = msg.key.remoteJid || 'unknown';
                const text = msg.message.conversation || 
                           msg.message.extendedTextMessage?.text || 
                           "";

                if (!text) continue;

                messageCount++;
                broadcastStatus();
                console.log(`\n📩 [${messageCount}] Mensaje de [${senderId}]: ${text}`);

                // Mostrar "Escribiendo..." en WhatsApp
                await sock.sendPresenceUpdate('composing', senderId);

                try {
                    console.log(`🧠 Consultando al Oráculo en ${BACKEND_URL}...`);
                    const response = await axios.post(`${BACKEND_URL}/agent/ask`, {
                        message: text,
                        senderId: senderId,
                        lang: 'es'
                    });

                    const reply = response.data.reply || "🐾 Molty está teniendo problemas para procesar esto.";
                    
                    await sock.sendMessage(senderId, { text: reply });
                    console.log(`📤 Respuesta enviada a ${senderId}`);

                } catch (error: any) {
                    console.error("❌ Error consultando al Agente:", error.message);
                    await sock.sendMessage(senderId, { 
                        text: "🐾 Perdona, perdí la conexión con mi cerebro (Gemma 4). Inténtalo de nuevo en un momento." 
                    });
                } finally {
                    await sock.sendPresenceUpdate('paused', senderId);
                }
            }
        }
    });
}

// --- BOOT ---
httpServer.listen(BRIDGE_PORT, () => {
    console.log(`\n🔌 Molty Bridge HTTP Server: http://localhost:${BRIDGE_PORT}`);
    console.log(`   📡 Status:    GET /status`);
    console.log(`   📱 QR Code:   GET /qr`);
    console.log(`   🔄 WebSocket: ws://localhost:${BRIDGE_PORT}/ws`);
    console.log(`   ❤️  Health:    GET /health\n`);
    
    connectToWhatsApp().catch(err => {
        lastError = err.message;
        connectionStatus = 'disconnected';
        broadcastStatus();
        console.error("FATAL ERROR:", err);
    });
});
