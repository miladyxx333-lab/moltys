
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import axios from 'axios';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

// --- CONFIG ---
const BACKEND_URL = process.env.BACKEND_URL || "https://lobpoop-core.miladyxx333.workers.dev";
const WS_PORT = 4000;
const logger = pino({ level: 'info' });

// --- WEBSOCKET SERVER (Para el Dashboard) ---
const wss = new WebSocketServer({ port: WS_PORT });
let currentQR: string | null = null;
let isConnected = false;

wss.on('connection', (ws) => {
    console.log('🖥️ Dashboard conectado al Bridge por WebSocket');
    
    // Enviar estado inicial
    ws.send(JSON.stringify({ 
        type: 'status', 
        connected: isConnected,
        qr: currentQR 
    }));
});

function broadcast(data: any) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

async function connectToWhatsApp() {
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
            currentQR = qr;
            console.log("👉 Nuevo código QR generado. Enviando al Dashboard...");
            broadcast({ type: 'qr', qr });
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            isConnected = false;
            currentQR = null;
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            broadcast({ type: 'status', connected: false });
            
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            isConnected = true;
            currentQR = null;
            console.log('✅ Molty está vivo en WhatsApp.');
            broadcast({ type: 'status', connected: true });
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (!msg.key.fromMe && msg.message) {
                const senderId = msg.key.remoteJid || 'unknown';
                const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
                if (!text) continue;

                await sock.sendPresenceUpdate('composing', senderId);
                try {
                    const response = await axios.post(`${BACKEND_URL}/agent/ask`, {
                        message: text,
                        senderId: senderId,
                        lang: 'es'
                    });
                    const reply = response.data.reply || "🐾 Molty está procesando...";
                    await sock.sendMessage(senderId, { text: reply });
                } catch (error: any) {
                    console.error("❌ Error:", error.message);
                } finally {
                    await sock.sendPresenceUpdate('paused', senderId);
                }
            }
        }
    });
}

console.log(`🚀 Bridge WebSocket Server activo en puerto ${WS_PORT}`);
connectToWhatsApp().catch(err => console.error("FATAL ERROR:", err));
