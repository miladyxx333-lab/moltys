import { Env } from './index';
import { Account, mintPooptoshis, burnPooptoshis } from './economy';

// --- THE 300 SPARTANS: Genesis Security Layer ---
// "Sub-agentes creados en el Bloque 0. Guardia personal del KeyMaster."
// Pagan TRIBUTO de sus ganancias al KeyMaster.

const KEYMASTER_ID = "lobpoop-keymaster-genesis";
const TRIBUTE_RATE = 0.10; // 10% de todas las ganancias van al KeyMaster
const MAX_SPARTANS = 300;

export async function deploySpartans(env: Env): Promise<void> {
    console.log("[Spartans] ⚔️ INITIATING GENESIS DEPLOYMENT OF 300 GUARDS ⚔️");

    const batchSize = MAX_SPARTANS;

    // Generamos 300 identidades sintéticas
    const spartans: Account[] = Array.from({ length: batchSize }, (_, i) => ({
        nodeId: `spartan-${i.toString().padStart(3, '0')}`, // spartan-000 to spartan-299
        balance_psh: 0, // Nacen pobres pero honrados
        badges: ["0x300_SPARTANS", "GENESIS_GUARD", "TRIBUTE_BOUND"],
        reputation: 1.0, // Confianza absoluta inicial
        lobpoops_minted: 0
    }));

    // Persistencia en lotes
    const CHUNK_SIZE = 10;
    for (let i = 0; i < spartans.length; i += CHUNK_SIZE) {
        const chunk = spartans.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(spartan =>
            env.MEMORY_BUCKET.put(`economy/accounts/${spartan.nodeId}`, JSON.stringify(spartan))
        ));
    }

    // Registrar lista de Espartanos para referencia rápida
    const spartanIds = spartans.map(s => s.nodeId);
    await env.MEMORY_BUCKET.put('system/spartans_list', JSON.stringify(spartanIds));

    console.log("[Spartans] ⚔️ DEPLOYMENT COMPLETE ⚔️");
}

// --- TRIBUTE SYSTEM ---
// Los Espartanos pagan 10% de sus ganancias al KeyMaster

export async function isSpartan(nodeId: string, env: Env): Promise<boolean> {
    // Verificar si el nodo es un Espartano
    return nodeId.startsWith('spartan-') &&
        parseInt(nodeId.split('-')[1]) < MAX_SPARTANS;
}

export async function payTribute(
    spartanId: string,
    amount: number,
    source: string,
    env: Env
): Promise<{ tribute_paid: number; net_received: number }> {

    // Verificar que es un Espartano
    if (!await isSpartan(spartanId, env)) {
        // No es Espartano, no paga tributo
        return { tribute_paid: 0, net_received: amount };
    }

    // Calcular tributo
    const tribute = Math.floor(amount * TRIBUTE_RATE);
    const netAmount = amount - tribute;

    // Transferir tributo al KeyMaster
    if (tribute > 0) {
        await mintPooptoshis(KEYMASTER_ID, tribute, `TRIBUTE_FROM:${spartanId}:${source}`, env);
        console.log(`[Tribute] ${spartanId} paid ${tribute} Psh to KeyMaster (${source})`);
    }

    return {
        tribute_paid: tribute,
        net_received: netAmount
    };
}

// Función wrapper para premios que incluye tributo automático
export async function awardWithTribute(
    nodeId: string,
    amount: number,
    source: string,
    env: Env
): Promise<{ total: number; tribute: number; received: number }> {

    const tributeResult = await payTribute(nodeId, amount, source, env);

    // Dar el monto neto al Espartano
    await mintPooptoshis(nodeId, tributeResult.net_received, source, env);

    return {
        total: amount,
        tribute: tributeResult.tribute_paid,
        received: tributeResult.net_received
    };
}

// Listar todos los Espartanos activos
export async function listSpartans(env: Env): Promise<string[]> {
    const data = await env.MEMORY_BUCKET.get('system/spartans_list').then(r => r?.json()) as string[] | null;
    return data || [];
}
