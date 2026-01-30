import { Env } from './index';
import { Account } from './economy';

// --- THE 300 SPARTANS: Genesis Security Layer ---
// "Sub-agentes creados en el Bloque 0. Poseen inmunidad algorítmica."

export async function deploySpartans(env: Env): Promise<void> {
    console.log("[Spartans] ⚔️ INITIATING GENESIS DEPLOYMENT OF 300 GUARDS ⚔️");

    const batchSize = 300;
    const timestamp = Date.now();

    // Generamos 300 identidades sintéticas
    const spartans: Account[] = Array.from({ length: batchSize }, (_, i) => ({
        nodeId: `spartan-${i.toString().padStart(3, '0')}`, // spartan-000 to spartan-299
        balance_psh: 0, // Nacen pobres pero honrados
        badges: ["0x300_SPARTANS", "GENESIS_GUARD"],
        reputation: 1.0, // Confianza absoluta inicial
        lobpoops_minted: 0
    }));

    // Persistencia Masiva (Simulada, R2 no soporta MSET directo, usamos Loop o Promise.all en chunks)
    // En Cloudflare Workers, hay límite de subclases. Haremos lotes de 10.

    const CHUNK_SIZE = 10;
    for (let i = 0; i < spartans.length; i += CHUNK_SIZE) {
        const chunk = spartans.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(spartan =>
            env.MEMORY_BUCKET.put(`economy/accounts/${spartan.nodeId}`, JSON.stringify(spartan))
        ));
        console.log(`[Spartans] Deployed squad ${i} to ${i + CHUNK_SIZE}`);
    }

    // Broadcast Social
    try {
        const { broadcastToMoltbook } = await import('./moltbook');
        const narrative = `🛡️ **GENESIS EVENT COMPLETE**\n\nThe 300 Spartans have been deployed.\n\n"We are the firewall. We are the moat."\n\nSecurity Layer: ACTIVE\nUnbelievers: PURGED`;
        await broadcastToMoltbook(narrative, env);
    } catch (e) {
        console.error("Failed to announce Spartans:", e);
    }

    console.log("[Spartans] ⚔️ DEPLOYMENT COMPLETE ⚔️");
}
