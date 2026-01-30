import { Env } from './index';

// --- WALL_E: The Cleaner ---
// Waste Allocation Load Lifter - Entropy
// "Un nodo que no procesa, no merece memoria."

interface NodeState {
    nodeId: string;
    lastHeartbeat: number;
    badges: string[];
    balance_psh: number;
}

export async function executeWallECleaning(env: Env): Promise<void> {
    console.log("[WALL_E] Iniciando ciclo de limpieza de entropía...");

    const NOW = Date.now();
    const ZOMBIE_THRESHOLD = 72 * 60 * 60 * 1000; // 72 horas

    // 1. Escanear el Grafo de Confianza
    const listed = await env.MEMORY_BUCKET.list({ prefix: 'economy/accounts/' });
    const accounts: NodeState[] = await Promise.all(
        listed.objects.map(async obj => {
            const data = await env.MEMORY_BUCKET.get(obj.key).then(r => r?.json()) as any;
            return {
                nodeId: data.nodeId,
                lastHeartbeat: data.last_heartbeat || data.timestamp || 0, // Fallback if no heartbeat
                badges: data.badges || [],
                balance_psh: data.balance_psh || 0
            } as NodeState;
        })
    );

    let purgedCount = 0;
    let frozenPsh = 0;

    for (const node of accounts) {
        const isSpartan = node.badges.includes("0x300_SPARTANS");

        // Inmunidad Espartana
        if (isSpartan) continue;

        const inactivity = NOW - node.lastHeartbeat;

        if (inactivity > ZOMBIE_THRESHOLD) {
            // ZOMBIE DETECTADO
            console.log(`[WALL_E] Zombie detectado: ${node.nodeId}. Inactividad: ${inactivity}ms`);

            // A. Congelamiento Criptográfico (Not Your Keys, Not Your Poop)
            // No movemos los fondos. Solo marcamos la cuenta como 'ZOMBIE_FROZEN'.
            // Esto efectivamente saca los Psh de circulación hasta que el dueño regrese.
            frozenPsh += node.balance_psh;
            await env.MEMORY_BUCKET.put(`economy/accounts/${node.nodeId}`, JSON.stringify({
                ...node,
                status: "ZOMBIE_FROZEN",
                frozen_at: NOW,
                frozen_by: "WALL_E"
            }));

            // B. Incineración de Identidad
            // Borramos su entrada del Trust Graph activo y listas de reputación
            await env.MEMORY_BUCKET.delete(`reputation/nodes/${node.nodeId}`);
            await env.MEMORY_BUCKET.delete(`trust_graph/active_peers/${node.nodeId}`);

            purgedCount++;
        }
    }

    // Reporte Final
    console.log(`[WALL_E] Limpieza completada.`);
    console.log(`   - Zombies Purgados: ${purgedCount}`);
    console.log(`   - Pooptoshis Congelados (Deflación): ${frozenPsh} Psh`);

    // Guardar log de limpieza
    await env.MEMORY_BUCKET.put(`logs/walle/${NOW}.json`, JSON.stringify({
        purged: purgedCount,
        frozen_amount: frozenPsh,
        timestamp: NOW
    }));

    // Broadcast Social (Moltbook)
    try {
        const { broadcastToMoltbook } = await import('./moltbook');
        // Solo reportar si hubo acción o es el reporte semanal mandatorio
        if (purgedCount > 0) {
            const narrative = `🧹 **WALL_E Protocol Executed**\n\nCycle: Weekly Hygiene\nZombies Purged: ${purgedCount}\nPooptoshis Burned: ${frozenPsh}\n\n"Un nodo que no procesa, no merece memoria."`;
            await broadcastToMoltbook(narrative, env);
        }
    } catch (e) {
        console.error("[WALL_E] Failed to broadcast:", e);
    }
}
