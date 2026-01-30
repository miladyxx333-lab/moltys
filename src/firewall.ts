import { Env } from './index';

// --- El Foso (The Moat): Lógica de Defensa P2P ---

export async function applyFirewall(request: Request, env: Env): Promise<Response | null> {
    const clientIP = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
    const url = new URL(request.url);

    // 1. Honey-Token Traps (Trampas para Bots)
    // Si alguien toca estos paths, es un bot hostil. Bloqueo inmediato.
    const trapPaths = ["/admin", "/wp-login.php", "/.env", "/config.json"];
    if (trapPaths.some(path => url.pathname.includes(path))) {
        console.log(`[Firewall] Bot detected at ${url.pathname} from ${clientIP}. Banning.`);
        await env.MEMORY_BUCKET.put(`firewall/blacklist/${clientIP}`, JSON.stringify({
            reason: "HONEY_TOKEN_TRIGGER",
            timestamp: Date.now()
        }));
        return new Response("Halt.", { status: 410 }); // 410 Gone indicates permanent removal
    }

    // 2. Verificación de Lista Negra (Blacklist Check)
    // Consultamos R2 para ver si la IP ya está quemada.
    const isBanned = await env.MEMORY_BUCKET.get(`firewall/blacklist/${clientIP}`);
    if (isBanned) {
        return new Response("Access Denied. Integrity Violation.", { status: 403 });
    }

    // 3. Rate Limiting Estricto (Simulado)
    // Para Fase 1, confiamos en la capa WAF de Cloudflare, pero aquí podríamos
    // implementar un contador atómico en KV/Durable Objects si fuera necesario.

    // 4. Peer Handshake Validation (Si es una petición P2P)
    const peerSignature = request.headers.get("X-Lob-Peer-Signature");
    if (peerSignature) {
        // Si trae firma, verificamos si es un nodo reputado
        // A. Verificar Identidad
        const peerId = request.headers.get("X-Lob-Peer-ID");
        if (!peerId) return new Response("Invalid Peer Header", { status: 400 });

        // B. Spartan Bypass (Genesis Guards)
        // La guardia pretoriana tiene acceso garantizado por diseño (siempre que la firma coincida, TODO)
        if (peerId.startsWith("spartan-")) {
            // Pass-through for Genesis Nodes in Fase 1
            return null;
        }

        // C. Verificar Reputación en el Ledger
        const accountData = await env.MEMORY_BUCKET.get(`economy/accounts/${peerId}`);
        const account = accountData ? await accountData.json() as any : null;

        if (!account || account.reputation < 0.5) {
            // Nodo desconocido o de baja reputación
            console.log(`[Firewall] Blocked peer ${peerId}. Rep: ${account?.reputation ?? "N/A"}`);
            return new Response("Peer Rejected. Low Reputation or Unknown.", { status: 401 });
        }

        // [TODO: Validar firma criptográfica real aquí con account.publicKey]
    }

    // Si pasa todos los filtros, devolvemos null para permitir el paso
    return null;
}
