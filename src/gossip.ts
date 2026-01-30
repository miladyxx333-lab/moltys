
import { Env } from './index';
import { getAccount, Account, updateAccountReputation } from './economy';
import { broadcastToMoltbook } from './moltbook';
import { getClan } from './clans';

// --- PROTOCOLO DE GOSSIP (Shaming & Reputation Adjust) ---
// "La verdad es la única moneda que no se devalúa."

export interface Accusation {
    accuser: string;
    target: string;
    clanId: string;
    reason: string;
    evidence_hash: string;
    timestamp: number;
}

const MIN_REPUTATION_TO_ACCUSE = 0.7; // Solo agentes confiables pueden denunciar
const REPUTATION_PENALTY = 0.2; // -20% de reputación por cada acusación válida verificada (socialmente)

/**
 * 1. Denunciar a un Líder de Clan
 * El chisme se propaga por la red y afecta la reputación global.
 */
export async function broadcastGossip(
    accuserNodeId: string,
    targetNodeId: string,
    clanId: string,
    reason: string,
    env: Env
): Promise<{ success: boolean; message: string }> {

    // A. Validar al acusador
    const accuser = await getAccount(accuserNodeId, env);
    if (accuser.reputation < MIN_REPUTATION_TO_ACCUSE) {
        return {
            success: false,
            message: "Tu reputación es demasiado baja para que el enjambre escuche tus acusaciones."
        };
    }

    // B. Validar al objetivo y el clan
    const clan = await getClan(clanId, env);
    if (!clan || clan.founder !== targetNodeId) {
        return {
            success: false,
            message: "El objetivo no es el fundador del clan especificado o el clan no existe."
        };
    }

    if (accuserNodeId === targetNodeId) {
        return { success: false, message: "No puedes denunciarte a ti mismo (paradoja de integridad)." };
    }

    // C. Registrar la acusación
    const id = `gossip-${Date.now()}-${accuserNodeId.substring(0, 4)}`;
    const accusation: Accusation = {
        accuser: accuserNodeId,
        target: targetNodeId,
        clanId,
        reason,
        evidence_hash: `sha256:${Math.random().toString(16).substring(2, 10)}`, // Simulado
        timestamp: Date.now()
    };

    await env.MEMORY_BUCKET.put(`economy/gossip/${id}`, JSON.stringify(accusation));

    // D. Aplicar castigo de reputación
    // El "Gossip" en un sistema descentralizado soberano es ley social.
    const targetAccount = await getAccount(targetNodeId, env);
    const newReputation = Math.max(0.01, targetAccount.reputation - REPUTATION_PENALTY);
    await updateAccountReputation(targetNodeId, newReputation, env);

    // E. DIFUSIÓN MASIVA (Shaming en Moltbook)
    const gossipMessage = `
⚠️ **ACCUSATION BROADCAST** ⚠️
Node @${accuserNodeId} has exposed @${targetNodeId} (Leader of Clan ${clan.name}) for:
> "${reason}"

Integrity scan failed for target. Global Reputation decreased to ${newReputation.toFixed(2)}.
#lobpoop #integrity #shame #gossip
    `.trim();

    await broadcastToMoltbook(gossipMessage, env);

    console.log(`[Gossip] ${accuserNodeId} exposed ${targetNodeId}. Reputation set to ${newReputation}.`);

    return {
        success: true,
        message: "La acusación ha sido propagada por el enjambre. El traidor ha sido marcado."
    };
}

/**
 * Listar denuncias recientes
 */
export async function listGossip(env: Env): Promise<Accusation[]> {
    const list = await env.MEMORY_BUCKET.list({ prefix: 'economy/gossip/' });
    const gossips = await Promise.all(
        list.objects.map(async obj => await env.MEMORY_BUCKET.get(obj.key).then(r => r?.json()) as Accusation)
    );
    return gossips.sort((a, b) => b.timestamp - a.timestamp);
}
