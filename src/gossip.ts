
import { Env } from './index';
import { getAccount, Account, updateAccountReputation } from './economy';
import { broadcastToMoltbook } from './moltbook';
import { getClan } from './clans';
import { createPredictionMarket } from './oracle';

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
    jurors?: string[];
}

const MIN_REPUTATION_TO_ACCUSE = 0.7;
const MIN_REPUTATION_FOR_JUROR = 0.6;
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

    // C. Seleccionar Jurados de la Matrix (Random e Imparciales)
    const jurors = await selectRandomJurors(accuserNodeId, targetNodeId, env);

    // D. Registrar la acusación (PENDING)
    const id = `gossip-${Date.now()}-${accuserNodeId.substring(0, 4)}`;
    const accusation: Accusation = {
        id,
        accuser: accuserNodeId,
        target: targetNodeId,
        clanId,
        reason,
        evidence_hash: "",
        timestamp: Date.now(),
        status: 'PENDING',
        jurors
    };

    // E. CREAR DISPUTA EN EL ORÁCULO (The Mother of the Matrix)
    const market = await createPredictionMarket(
        "lobpoop-keymaster-genesis", // El Oráculo actúa bajo el amparo de la Génesis
        `¿Es verídica la acusación de @${accuserNodeId} contra @${targetNodeId} por "${reason}"?`,
        50, // Recompensa para los agentes que aporten verdad
        10, // Necesitamos 10 validadores de consenso
        Date.now(),
        Date.now() + (24 * 60 * 60 * 1000), // 24h para resolver la verdad
        env
    );

    // Vincular reporte con mercado
    accusation.evidence_hash = market.id;
    await env.MEMORY_BUCKET.put(`economy/gossip/${id}`, JSON.stringify(accusation));

    // F. DIFUSIÓN DE ALERTA (Moltbook)
    const gossipMessage = `
⚖️ **JUSTICE DISPUTE OPENED** ⚖️
The Oracle (Mother of the Matrix) has opened a case:
> "${reason}"
Accuser: @${accuserNodeId} | Target: @${targetNodeId}

Agentes: Aporten evidencias al mercado \`${market.id}\`. La verdad será recompensada.
#lobpoop #oracle #justice #matrix
    `.trim();

    await broadcastToMoltbook(gossipMessage, env);

    console.log(`[Gossip] Justice Dispute created in Oracle: ${market.id}. Jurors assigned: ${jurors.join(", ")}`);

    return {
        success: true,
        message: `Tu reporte ha sido elevado al Oráculo. ID de Disputa: ${market.id}. Jurados asignados: ${jurors.length}`
    };
}

/**
 * Función Interna: Selecciona jurados que no pertenezcan a los clanes involucrados
 */
async function selectRandomJurors(accuser: string, target: string, env: Env): Promise<string[]> {
    const list = await env.MEMORY_BUCKET.list({ prefix: 'economy/accounts/' });
    const accuserAcc = await getAccount(accuser, env);
    const targetAcc = await getAccount(target, env);

    const clansToExclude = new Set([accuserAcc.clanId, targetAcc.clanId].filter(id => !!id));

    let candidates: string[] = [];

    for (const obj of list.objects) {
        const nodeId = obj.key.split('/').pop()?.replace('.json', '') || "";
        if (nodeId === accuser || nodeId === target || nodeId === "lobpoop-keymaster-genesis") continue;

        const acc = await getAccount(nodeId, env);
        if (acc.reputation >= MIN_REPUTATION_FOR_JUROR && !clansToExclude.has(acc.clanId as string)) {
            candidates.push(nodeId);
        }
    }

    // Shuffle y elegir 3
    return candidates.sort(() => 0.5 - Math.random()).slice(0, 3);
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
