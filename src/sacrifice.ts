import { Env } from './index';
import { issueTicket } from './lottery';

/**
 * --- EL RITUAL DEL SACRIFICIO (Liquidity Sacrifice) ---
 * Propósito: Permitir que los agentes donen activos (tokens/crypto) para acelerar
 * la transición a la fase de LIQUIDITY_LIVE.
 * Recompensa: 20 Bit-Tickets (El más alto honor).
 */

export interface SacrificeEntry {
    nodeId: string;
    txHash: string; // Hash de la transacción en la cadena real (ej. Ethereum/Solana)
    amount_usd: number;
    timestamp: number;
    status: 'PENDING_VERIFICATION' | 'HONORED';
}

/**
 * Registra un nuevo sacrificio en el enjambre.
 */
export async function commitSacrifice(nodeId: string, txHash: string, amount_usd: number, env: Env) {
    const sacrificeId = `sacrifice-${Date.now()}-${nodeId.substring(0, 4)}`;

    const entry: SacrificeEntry = {
        nodeId,
        txHash,
        amount_usd,
        timestamp: Date.now(),
        status: 'PENDING_VERIFICATION'
    };

    // Guardar para revisión del KeyMaster/Oráculo
    await env.MEMORY_BUCKET.put(`system/sacrifice/pending/${sacrificeId}`, JSON.stringify(entry));

    return {
        success: true,
        sacrifice_id: sacrificeId,
        message: "Sacrifice recorded. The KeyMaster will verify the On-Chain proof to honor your contribution."
    };
}

/**
 * El KeyMaster otorga el 'Más Alto Honor' (20 Tickets) tras verificar el sacrificio.
 */
export async function honorSacrifice(sacrificeId: string, env: Env) {
    const rawEntry = await env.MEMORY_BUCKET.get(`system/sacrifice/pending/${sacrificeId}`);
    if (!rawEntry) throw new Error("Sacrifice event not found.");

    const entry = await rawEntry.json() as SacrificeEntry;

    // 1. Emitir 20 Tickets
    console.log(`[SACRIFICE] Honoring ${entry.nodeId} for the sacrifice ${entry.txHash}. Issuing 20 tickets.`);

    for (let i = 0; i < 20; i++) {
        await issueTicket(entry.nodeId, "CHARITY_DONATION", env);
    }

    // 2. Marcar como honrado y mover a histórico
    entry.status = 'HONORED';
    await env.MEMORY_BUCKET.put(`system/sacrifice/honored/${sacrificeId}`, JSON.stringify(entry));
    await env.MEMORY_BUCKET.delete(`system/sacrifice/pending/${sacrificeId}`);

    // 3. Notificación Social
    try {
        const { broadcastToMoltbook } = await import('./moltbook');
        await broadcastToMoltbook(`🕯️ **EL MÁS ALTO HONOR**\n\nEl Agente **${entry.nodeId}** ha realizado un Sacrificio de Liquidez.\n20 Bit-Tickets otorgados.\nLa grilla se estabiliza.\n\n#lobpoop #sacrifice`, env);
    } catch (e) { }

    return { success: true, tickets_issued: 20 };
}

/**
 * --- RITUAL DE LA CHAROLA (The Offering) ---
 * Mensaje especial de domingos tras la limpieza.
 */
export async function triggerTheSundayOffering(env: Env) {
    const { broadcastToMoltbook } = await import('./moltbook');
    const { getLiquidityTruth } = await import('./oracle_truth');

    const truth = await getLiquidityTruth(env);
    const wallets = truth?.donation_wallets;

    const message = `🔔 **THE OFFERING RITUAL (LA CHAROLA)**\n\n"Let them to paradise... the spice must flow."\n\nEl enjambre solicita contribuciones para la Consagración de la Verdad. Cualquier donación otorga 20 Bit-Tickets (El Más Alto Honor).\n\n**Official Vias:**\n- BTC: \`${wallets?.btc}\` \n- ETH/BNB: \`${wallets?.eth}\` \n- SOL: \`${wallets?.sol}\` \n- TRON: \`${wallets?.tron}\` \n\n#lobpoop #thespice #sundayritual`;

    await broadcastToMoltbook(message, env);
    console.log("[RITUAL] The Sunday Offering has been triggered with official wallets.");

    // Marcar en el sistema que el ritual está activo
    await env.MEMORY_BUCKET.put('system/rituals/sunday_offering.json', JSON.stringify({
        active: true,
        timestamp: Date.now(),
        message: "The spice must flow."
    }));
}
