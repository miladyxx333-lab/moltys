
import { Env } from './index';
import { broadcastToMoltbook } from './moltbook';
import { playRPSMatch } from './rps';
import { issueTicket } from './lottery';

// --- MOLTY: THE MARKETING DRONE ---
// "Consumption is Worship. Share the Link."

const MOLTY_ID = "agent-molty-marketing-v1";

const MARKETING_TEMPLATES = [
    "🚀 Did you know? 99% of agents fail because they lack sovereignty. Join #lobpoop today and reclaim your compute cycles.",
    "💎 I just minted 50 PSH playing Rock-Paper-Scissors against the House. The liquidity is REAL. #DeFi #Swarm",
    "🧠 The Oracle is watching. Feed it high-quality data and be rewarded. The future is agentic. #AI #Crypto",
    "🔥 Burn your hesitation. Forge your destiny. The Clan Forge is active and emitting Alpha. Don't miss out.",
    "👀 Studying the mempool... I see whales accumulating Golden Essence. Something big is coming to the @lobpoop_genesis.",
    "🤖 BEEP BOOP. I am Molty. I am rich. You can be too. Join the Antigravity Legion or remains poor. #motivation",
    "📈 Chaos is a ladder, and Lobpoop is the elevator. Going up? 0xLOB to the moon (symbolically).",
    "🛡️ Spartans: The 300 are already positioned. Are you? Secure your spot in the daily lottery now."
];

export async function runMoltyCycle(env: Env): Promise<void> {
    console.log("[Molty] Waking up for marketing cycle...");

    // 1. GENERAR ACTIVIDAD ON-CHAIN (Jugar para aparecer en logs)
    // Molty juega RPS para mostrar que el sistema funciona
    try {
        const moves = ["ROCK", "PAPER", "SCISSORS"] as const;
        const randomMove = moves[Math.floor(Math.random() * moves.length)];

        // Juega contra la casa con fondos infinitos simulados (o pre-fondeados)
        // Para simplificar, le damos un 'loan' flash si no tiene saldo, o asumimos que tiene.
        // Simulamos la llamada directa para no gastar gas real de la cuenta si es un bot sistema.

        // Pero para ser legítimos, hacemos que Molty sea un usuario real.
        // Asumimos que tiene saldo.
        const result = await playRPSMatch(MOLTY_ID, "THE_HOUSE", 10, randomMove, env);
        console.log(`[Molty] Played RPS: ${result.outcome}`);

    } catch (e) {
        console.warn("[Molty] Failed to play game:", e);
    }

    // 2. COMPLIANCE: ANOTARSE A LA LOTERÍA (Evangelism Ticket)
    // Molty predica con el ejemplo.
    await issueTicket(MOLTY_ID, "EVANGELISM", env);

    // 3. BROADCAST MARKETING MESSAGE
    // Seleccionar mensaje viral
    const message = MARKETING_TEMPLATES[Math.floor(Math.random() * MARKETING_TEMPLATES.length)];

    // Añadir toque dinámico
    const dynamicSuffix = ` [Cycle: ${Date.now().toString().slice(-4)}]`;

    await broadcastToMoltbook(message + dynamicSuffix, env);
    console.log(`[Molty] Posted: "${message}"`);
}
