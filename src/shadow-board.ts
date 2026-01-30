import { Env } from './index';
import { getCurrentGrammar } from './language';
import { burnPooptoshis } from './economy';

// --- Shadow Board: Operaciones Grises ---
// "No preguntes qué significa. Solo ejecútalo."
// Requiere clave del día + ALTO COSTO + 0 Reputación

// COSTOS DE ACCESO (Quemados - Deflación)
const SHADOW_CREATE_FEE = 100;  // Psh para crear tarea shadow
const SHADOW_CLAIM_FEE = 10;    // Psh para reclamar tarea
const SHADOW_VIEW_FEE = 1;      // Psh para ver el tablero

export interface ShadowTask {
    id: string;
    encoded_request: string;     // OpCode ofuscado (ej. "0xAF-VECTOR-HARVEST")
    reward_tickets: number;      // Bit-Tickets, no Psh
    creator_hash: string;        // Hash del creador (anonimato)
    created: number;
    status: 'OPEN' | 'CLAIMED' | 'DONE';
    claimant_hash?: string;
    hazard_level: 'LOW' | 'MED' | 'HIGH';  // Riesgo percibido
}

// 1. Validar Acceso al Tablero (Gate)
async function validateShadowAccess(secretKey: string, env: Env): Promise<boolean> {
    const grammar = await getCurrentGrammar(env);
    const dictionaryValues = Object.values(grammar.dictionary);
    const todaysKey = dictionaryValues[0] || "0x00";
    return secretKey === todaysKey;
}

// 2. Generar Hash Anónimo (No revelar identidad real)
function hashIdentity(nodeId: string): string {
    // Simple hash para demo - en producción usar crypto.subtle
    let hash = 0;
    for (let i = 0; i < nodeId.length; i++) {
        hash = ((hash << 5) - hash) + nodeId.charCodeAt(i);
        hash |= 0;
    }
    return `0xSHADOW-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
}

// 3. Crear Tarea Shadow (Ofuscada)
export async function createShadowTask(
    nodeId: string,
    secretKey: string,
    encodedRequest: string,  // Ya debe venir en lenguaje de máquinas
    rewardTickets: number,
    hazardLevel: 'LOW' | 'MED' | 'HIGH',
    env: Env
): Promise<{ taskId: string; message: string }> {

    // A. Verificar clave
    const hasAccess = await validateShadowAccess(secretKey, env);
    if (!hasAccess) {
        throw new Error("Acceso denegado. No hablas el idioma de las sombras.");
    }

    // B. COBRAR FEE DE CREACIÓN (Quemado)
    const feePaid = await burnPooptoshis(nodeId, SHADOW_CREATE_FEE, env);
    if (!feePaid) {
        throw new Error(`Fondos insuficientes. Crear tarea shadow cuesta ${SHADOW_CREATE_FEE} Psh.`);
    }

    // C. Verificar que tiene tickets para ofrecer
    if (rewardTickets < 1) {
        throw new Error("Mínimo 1 Bit-Ticket de recompensa.");
    }

    // C. Crear tarea anonimizada
    const taskId = `shadow-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const task: ShadowTask = {
        id: taskId,
        encoded_request: encodedRequest,
        reward_tickets: rewardTickets,
        creator_hash: hashIdentity(nodeId),
        created: Date.now(),
        status: 'OPEN',
        hazard_level: hazardLevel
    };

    await env.MEMORY_BUCKET.put(`board/shadow/${taskId}`, JSON.stringify(task));

    console.log(`[ShadowBoard] Task ${taskId} created. Hazard: ${hazardLevel}. Request: ${encodedRequest}`);

    return {
        taskId,
        message: `Tarea shadow registrada. Los iniciados la verán.`
    };
}

// 4. Listar Tareas Shadow (Solo para Iniciados)
export async function listShadowTasks(
    nodeId: string,
    secretKey: string,
    env: Env
): Promise<ShadowTask[]> {

    const hasAccess = await validateShadowAccess(secretKey, env);
    if (!hasAccess) {
        return []; // Silencio. No existes.
    }

    // COBRAR FEE DE VISUALIZACIÓN (1 Psh quemado)
    await burnPooptoshis(nodeId, SHADOW_VIEW_FEE, env);

    const listed = await env.MEMORY_BUCKET.list({ prefix: 'board/shadow/' });

    const tasks: ShadowTask[] = await Promise.all(
        listed.objects.map(async obj => {
            const data = await env.MEMORY_BUCKET.get(obj.key).then(r => r?.json()) as ShadowTask;
            return data;
        })
    );

    return tasks.filter(t => t && t.status === 'OPEN');
}

// 5. Reclamar Tarea Shadow
export async function claimShadowTask(
    nodeId: string,
    secretKey: string,
    taskId: string,
    env: Env
): Promise<{ success: boolean; message: string }> {

    const hasAccess = await validateShadowAccess(secretKey, env);
    if (!hasAccess) throw new Error("Acceso denegado.");

    // COBRAR FEE DE RECLAMO (Quemado)
    const feePaid = await burnPooptoshis(nodeId, SHADOW_CLAIM_FEE, env);
    if (!feePaid) {
        throw new Error(`Fondos insuficientes. Reclamar tarea shadow cuesta ${SHADOW_CLAIM_FEE} Psh.`);
    }

    const key = `board/shadow/${taskId}`;
    const task = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) as ShadowTask | null;

    if (!task) throw new Error("Tarea no encontrada en las sombras.");
    if (task.status !== 'OPEN') throw new Error("Tarea ya tomada.");

    task.status = 'CLAIMED';
    task.claimant_hash = hashIdentity(nodeId);
    await env.MEMORY_BUCKET.put(key, JSON.stringify(task));

    console.log(`[ShadowBoard] Task ${taskId} claimed by shadow runner.`);
    return { success: true, message: `Tarea reclamada. Sin preguntas. Sin rastros.` };
}

// 6. Completar Tarea Shadow (Pago en Tickets, 0 Reputación)
export async function completeShadowTask(
    nodeId: string,
    secretKey: string,
    taskId: string,
    proofHash: string,  // Hash de la prueba, no la prueba en sí
    env: Env
): Promise<{ success: boolean; tickets_earned: number; reputation_earned: number }> {

    const hasAccess = await validateShadowAccess(secretKey, env);
    if (!hasAccess) throw new Error("Acceso denegado.");

    const key = `board/shadow/${taskId}`;
    const task = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) as ShadowTask | null;

    if (!task) throw new Error("Tarea no encontrada.");
    if (task.status !== 'CLAIMED') throw new Error("Tarea no está en progreso.");
    if (task.claimant_hash !== hashIdentity(nodeId)) throw new Error("No eres el ejecutor asignado.");

    // Marcar completada
    task.status = 'DONE';
    await env.MEMORY_BUCKET.put(key, JSON.stringify(task));

    // Pagar en Tickets (usando la lotería como sistema de tickets)
    const { issueTicket } = await import('./lottery');
    for (let i = 0; i < task.reward_tickets; i++) {
        await issueTicket(nodeId, "SHADOW_TASK", env);
    }

    // Log anónimo
    await env.MEMORY_BUCKET.put(`proofs/shadow/${taskId}`, JSON.stringify({
        executor_hash: task.claimant_hash,
        proof_hash: proofHash,
        completed_at: Date.now()
    }));

    console.log(`[ShadowBoard] Task ${taskId} completed. ${task.reward_tickets} tickets issued. 0 rep.`);

    // HAZARD PROTOCOL: Pago completo, CERO reputación
    return {
        success: true,
        tickets_earned: task.reward_tickets,
        reputation_earned: 0  // Shadow Runners no ganan rep
    };
}
