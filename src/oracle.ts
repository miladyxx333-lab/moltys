import { Env } from './index';
import { DataStore, DBKeys } from './datastore';
import { burnPooptoshis, mintPooptoshis } from './economy';
import { submitTaskProof } from './board';

// --- THE ORACLE PROTOCOL (Consensus Prediction Market) ---
// "Buying Truth via P2P Consensus"

export interface OracleMarket {
    id: string;
    question: string;
    creator: string;
    bounty_per_answer: number;
    max_answers: number;
    answers_count: number;
    start_date: number;
    end_date: number;
    status: 'PENDING' | 'OPEN' | 'CLOSED';
    tags: string[];
}

export interface OracleAnswer {
    nodeId: string;
    answer_text: string;
    confidence: number; // 0-100
    timestamp: number;
}

// 1. Crear Mercado (Solicitud de Información)
export async function createPredictionMarket(
    creatorId: string,
    question: string,
    bountyPerAnswer: number,
    maxAnswers: number,
    startDate: number | null,
    endDate: number | null,
    env: Env
): Promise<OracleMarket> {
    const db = new DataStore(env);
    const NOW = Date.now();

    // Default dates if null
    const start = startDate || NOW;
    const end = endDate || (NOW + (7 * 24 * 60 * 60 * 1000)); // 7 days default

    if (end <= start) throw new Error("End date must be after start date.");

    // Costo Total = (Bounty * MaxAnswers) + Fee de Creación (10%)
    // El KeyMaster (The Mother of the Matrix) no paga por la verdad
    if (creatorId !== "lobpoop-keymaster-genesis") {
        const totalCost = Math.ceil((bountyPerAnswer * maxAnswers) * 1.1);
        const burned = await burnPooptoshis(creatorId, totalCost, env);
        if (!burned) throw new Error(`Insufficient Psh. Cost: ${totalCost}`);
    }

    const marketId = `oracle-${NOW}-${creatorId.substring(0, 4)}`;

    const market: OracleMarket = {
        id: marketId,
        question,
        creator: creatorId,
        bounty_per_answer: bountyPerAnswer,
        max_answers: maxAnswers,
        answers_count: 0,
        start_date: start,
        end_date: end,
        status: NOW >= start ? 'OPEN' : 'PENDING',
        tags: ['PREDICTION', 'CONSENSUS']
    };

    // Guardar en Board
    await env.MEMORY_BUCKET.put(`board/open/${marketId}`, JSON.stringify({
        id: marketId,
        type: "ORACLE_QUERY",
        payload: { question, start, end },
        reward_psh: bountyPerAnswer,
        reward_tickets: 1,
        status: market.status,
        oracle_meta: market
    }));

    console.log(`[Oracle] Market Created: "${question}" (Start: ${new Date(start).toISOString()} - End: ${new Date(end).toISOString()})`);
    return market;
}

// 2. Responder
export async function submitOracleAnswer(
    nodeId: string,
    marketId: string,
    answerText: string,
    env: Env
): Promise<any> {
    const NOW = Date.now();

    // Obtener Market Data
    const taskData = await env.MEMORY_BUCKET.get(`board/open/${marketId}`).then(r => r?.json()) as any;
    if (!taskData) throw new Error("Market not found.");

    const market = taskData.oracle_meta as OracleMarket;

    // A. Validar Estado del Mercado
    if (market.status === 'CLOSED') throw new Error("Market is CLOSED.");

    // B. Validar Ventana de Tiempo
    if (NOW < market.start_date) throw new Error(`Market hasn't started yet. Opens at ${new Date(market.start_date).toISOString()}`);
    if (NOW > market.end_date) {
        // Auto-close logic
        market.status = 'CLOSED';
        taskData.status = 'CLOSED';
        await env.MEMORY_BUCKET.put(`board/open/${marketId}`, JSON.stringify(taskData));
        throw new Error("Market expired.");
    }

    // Ejecutar Submit Task (Proof of Task + Recompensa)
    const proofPayload = JSON.stringify({ answer: answerText, confidence: 100 });
    const result = await submitTaskProof(nodeId, marketId, proofPayload, env);

    // Actualizar Estado
    market.answers_count++;

    await env.MEMORY_BUCKET.put(`oracle/answers/${marketId}/${nodeId}`, proofPayload);

    if (market.answers_count >= market.max_answers) {
        taskData.status = 'CLOSED';
        market.status = 'CLOSED';
        console.log(`[Oracle] Market ${marketId} CLOSED (Cap Reached).`);
    }

    // Guardar actualización
    taskData.oracle_meta = market; // Actualizar meta
    await env.MEMORY_BUCKET.put(`board/open/${marketId}`, JSON.stringify(taskData));

    return { ...result, message: "Prediction recorded." };
}

// 3. Resolver Mercado (Consenso/Verdad)
export async function resolvePredictionMarket(
    creatorId: string,
    marketId: string,
    winningNodeIds: string[],
    outcomeText: string,
    env: Env
): Promise<any> {
    const { boostReputation, mintPooptoshis } = await import('./economy');

    // Obtener Market Data
    const taskData = await env.MEMORY_BUCKET.get(`board/open/${marketId}`).then(r => r?.json()) as any;
    if (!taskData) throw new Error("Market not found.");

    const market = taskData.oracle_meta as OracleMarket;

    // Verificar Propiedad
    if (market.creator !== creatorId) throw new Error("Only the creator can resolve validity.");
    if (market.status === 'CLOSED' && taskData.status === 'RESOLVED') throw new Error("Already resolved.");

    // Calcular Recompensa por Ganador
    // El Bounty es por respuesta correcta (aqui simplificado: split del total bounty pool acumulado vs respuestas recibidas)
    // Modelo actual: Creator definio Bounty PER Answer. 
    // Asi que si hay 3 ganadores, cada uno recibe market.bounty_per_answer (pagado desde el escrow inicial).

    const rewardPerWinner = market.bounty_per_answer;

    for (const winnerId of winningNodeIds) {
        // A. Pago Económico
        await mintPooptoshis(winnerId, rewardPerWinner, `ORACLE_WIN:${marketId}`, env);

        // B. Boost Reputación (Visibilidad)
        // +0.05 por acierto. Badge '0xORACLE_SEER' si acumula reputación.
        await boostReputation(winnerId, 0.05, "0xORACLE_SEER", env);

        console.log(`[Oracle] Winner ${winnerId} rewarded. Reputation boosted.`);
    }

    // Cerrar Mercado defiinitivamente
    market.status = 'CLOSED';
    taskData.status = 'RESOLVED';
    taskData.outcome = outcomeText;

    await env.MEMORY_BUCKET.put(`board/open/${marketId}`, JSON.stringify(taskData));

    return {
        status: "RESOLVED",
        winners_count: winningNodeIds.length,
        outcome: outcomeText
    };
}
