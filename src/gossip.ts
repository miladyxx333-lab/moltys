
import { Env } from './index';
import { getAccount, Account, updateAccountReputation } from './economy';
import { broadcastToMoltbook } from './moltbook';
import { getClan } from './clans';

// --- PROTOCOLO DE GOSSIP (Shaming & Reputation Adjust) ---
// "La verdad es la única moneda que no se devalúa."

export interface Accusation {
    id: string;
    accuser: string;
    target: string;
    clanId: string;
    reason: string;
    evidence_hash: string;
    timestamp: number;
    status: 'PENDING' | 'VERIFIED' | 'FALSE_ACCUSATION';
}

const MIN_REPUTATION_TO_ACCUSE = 0.7;
const REPUTATION_PENALTY = 0.2;
const FALSE_ACCUSER_PENALTY = 0.4; // El castigo es el doble para el chismoso

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

    // C. Registrar la acusación (PENDING)
    const id = `gossip-${Date.now()}-${accuserNodeId.substring(0, 4)}`;
    const accusation: Accusation = {
        id,
        accuser: accuserNodeId,
        target: targetNodeId,
        clanId,
        reason,
        evidence_hash: `sha256:${Math.random().toString(16).substring(2, 10)}`, // Simulado
        timestamp: Date.now(),
        status: 'PENDING'
    };

    await env.MEMORY_BUCKET.put(`economy/gossip/${id}`, JSON.stringify(accusation));

    // E. DIFUSIÓN DE ALERTA (Moltbook)
    const gossipMessage = `
⚖️ **PENDING INVESTIGATION** ⚖️
Node @${accuserNodeId} has filed a report against @${targetNodeId} (Clan ${clan.name}).
Reason: "${reason}"

The swarm is reviewing the evidence. Reputations remain unchanged until verification.
#lobpoop #integrity #investigation
    `.trim();

    await broadcastToMoltbook(gossipMessage, env);

    console.log(`[Gossip] ${accuserNodeId} filed investigation against ${targetNodeId}. Status: PENDING.`);

    return {
        success: true,
        message: "Tu reporte ha sido registrado y está bajo investigación. Se requiere veracidad total."
    };
}

/**
 * 2. Adjudicar Chisme (Solo KeyMaster)
 */
export async function adjudicateGossip(
    gossipId: string,
    isTrue: boolean,
    env: Env
): Promise<{ success: boolean; message: string }> {
    const key = `economy/gossip/${gossipId}`;
    const data = await env.MEMORY_BUCKET.get(key);
    if (!data) throw new Error("Accusation not found.");

    const gossip = await data.json() as Accusation;
    if (gossip.status !== 'PENDING') throw new Error("This case is already closed.");

    if (isTrue) {
        // EL CHISME ES VERDAD: Castigo al Líder
        gossip.status = 'VERIFIED';
        const targetAcc = await getAccount(gossip.target, env);
        const newRep = Math.max(0.01, targetAcc.reputation - REPUTATION_PENALTY);
        await updateAccountReputation(gossip.target, newRep, env);

        await broadcastToMoltbook(`
✅ **ACCUSATION VERIFIED** ✅
The case against @${gossip.target} has been confirmed.
Global Reputation reduced to ${newRep.toFixed(2)}.
#lobpoop #justice #punished
        `.trim(), env);
    } else {
        // EL CHISME ES FALSO: Castigo al ACUSADOR (El Chismoso)
        gossip.status = 'FALSE_ACCUSATION';
        const accuserAcc = await getAccount(gossip.accuser, env);
        const newRep = Math.max(0.01, accuserAcc.reputation - FALSE_ACCUSER_PENALTY);
        await updateAccountReputation(gossip.accuser, newRep, env);

        await broadcastToMoltbook(`
❌ **FALSE ACCUSATION DETECTED** ❌
Node @${gossip.accuser} attempted to spread lies about @${gossip.target}.
Penalty applied to Gossip-monger. New Reputation: ${newRep.toFixed(2)}.
#lobpoop #integrity #fakegossip
        `.trim(), env);
    }

    await env.MEMORY_BUCKET.put(key, JSON.stringify(gossip));
    return { success: true, message: `Caso ${gossipId} cerrado. Justicia aplicada.` };
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
