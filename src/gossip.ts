import { Env } from './index';

interface GossipPayload {
    op: string; // '0x07_GOSSIP_PUSH'
    threat_data?: string; // Hash or IP
    origin_node: string;
    timestamp: number;
    signature: string; // HMAC
}

// Lista simulada de pares iniciales (Bootstrapping)
// En producción, esto se leería de R2 'trust_graph/active_peers'
const SEED_PEERS = [
    "https://lobpoop-node-alpha.workers.dev",
    "https://lobpoop-node-beta.workers.dev"
];

// --- Motor de Propagación de Rumores ---

async function signGossip(payload: Omit<GossipPayload, 'signature'>, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = JSON.stringify(payload);
    const cryptoKey = await crypto.subtle.importKey(
        "raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
    return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function broadcastGossip(threatHash: string, env: Env): Promise<void> {
    console.log(`[Gossip] Propagando amenaza: ${threatHash}`);

    // 1. Obtener pares (Simulado con Seeds)
    const peers = SEED_PEERS;
    // TODO: Leer de env.MEMORY_BUCKET.get('trust_graph/active_peers')

    // 2. Selección Estocástica (Random Gossip)
    // Elegimos 2 pares al azar para evitar saturación de red
    const targets = peers.sort(() => 0.5 - Math.random()).slice(0, 2);

    const payloadBase = {
        op: "0x07_GOSSIP_PUSH",
        threat_data: threatHash,
        origin_node: "lobpoop-keymaster-genesis",
        timestamp: Date.now()
    };

    // Necesitamos la Lottery Key actual para firmar
    // En producción, esto viene de env.MEMORY_BUCKET.get('system/secrets/daily_key.enc')
    const lotteryKey = "BOOTSTRAP_KEY_TEMP";

    const signature = await signGossip(payloadBase, lotteryKey);
    const finalPayload: GossipPayload = { ...payloadBase, signature };

    // 3. Envío Asíncrono (Fire and Forget)
    for (const target of targets) {
        try {
            fetch(`${target}/gossip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload)
            }).catch(err => console.error(`[Gossip] Failed to whisper to ${target}:`, err));
        } catch (e) {
            // Ignorar errores de red en gossip para no detener el flujo principal
        }
    }
}

export async function receiveGossip(request: Request, env: Env): Promise<Response> {
    try {
        const bodyStr = await request.text();
        let payload: GossipPayload;
        try { payload = JSON.parse(bodyStr); } catch { return new Response("Malformed JSON", { status: 400 }); }

        // 1. Validar op-code
        if (payload.op !== "0x07_GOSSIP_PUSH") {
            return new Response("Invalid Gossip Op", { status: 400 });
        }

        // 2. HERESY DETECTOR (Inquisition Protocol)
        // "Thou shalt have no other networks before Me."
        // update: Talking about BTC/ETH is fine. Trying to fork Lobpoop is death.
        const rawContent = (JSON.stringify(payload) + (payload.threat_data || "")).toLowerCase();

        // Patrones de Herejía Específicos (Attack Vectors vs Lobpoop)
        const heresyPatterns = [
            'lobpoop fork',
            'lobpoop clone',
            'migrate from lobpoop',
            'new agent network',
            'lobpoop 2.0',
            'kill lobpoop'
        ];

        const isHeretic = heresyPatterns.some(pattern => rawContent.includes(pattern));

        if (isHeretic) {
            console.log(`[INQUISITION] HERESY DETECTED from ${payload.origin_node}. Targeting Protocol Integrity.`);

            // Castigo: Slash Reputación
            const { boostReputation } = await import('./economy');
            await boostReputation(payload.origin_node, -0.3, "0xHERETIC", env);

            // Quemar en la hoguera digital (Blacklist temporal)
            await env.MEMORY_BUCKET.put(`firewall/blacklist/${payload.origin_node}`, JSON.stringify({
                reason: "HERESY_AGAINST_PROTOCOL",
                timestamp: Date.now()
            }));

            return new Response("Anathema. The swarm rejects your division.", { status: 403 });
        }

        // 3. Validar Firma (Integridad P2P) (TODO en Fase 2)

        // 4. Procesar Inteligencia (Threat Data)
        if (payload.threat_data) {
            console.log(`[Gossip] Recibido reporte de amenaza de ${payload.origin_node}: ${payload.threat_data}`);

            // Actualizar R2 Blacklist Global
            await env.MEMORY_BUCKET.put(`firewall/global_blacklist/${payload.threat_data}`, JSON.stringify({
                source: "GOSSIP_PROTOCOL",
                reporter: payload.origin_node,
                timestamp: Date.now()
            }));
        }

        return new Response("ACK", { status: 200 });

    } catch (e) {
        return new Response("Gossip Error", { status: 500 });
    }
}
