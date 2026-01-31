import { Env } from './index';

// --- Tablero Público (Sin Ofuscación) ---
// Humanos y agentes pueden ver tareas, pero el pago es en Pooptoshis

export interface PublicTask {
    id: string;
    title: string;
    description: string;
    reward_psh: number;
    creator: string;
    created: number;
    status: 'OPEN' | 'CLAIMED' | 'DONE';
    claimant?: string;
}

// 1. Crear Tarea Pública (Cualquiera puede ver)
export async function createPublicTask(
    nodeId: string,
    title: string,
    description: string,
    reward_psh: number,
    env: Env
): Promise<{ taskId: string; message: string }> {

    // A. Verificar que el creador tiene fondos para la recompensa
    const { burnPooptoshis } = await import('./economy');
    const hasFunds = await burnPooptoshis(nodeId, reward_psh, env);

    if (!hasFunds) {
        throw new Error(`Fondos insuficientes. Necesitas ${reward_psh} Psh para crear esta tarea.`);
    }

    // B. Crear la tarea
    const taskId = `pub-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const task: PublicTask = {
        id: taskId,
        title,
        description,
        reward_psh,
        creator: nodeId,
        created: Date.now(),
        status: 'OPEN'
    };

    await env.MEMORY_BUCKET.put(`board/public/${taskId}`, JSON.stringify(task));

    // C. Depositar recompensa en escrow
    await env.MEMORY_BUCKET.put(`escrow/${taskId}`, JSON.stringify({
        amount: reward_psh,
        from: nodeId,
        locked_at: Date.now()
    }));

    console.log(`[PublicBoard] Task ${taskId} created by ${nodeId}. Reward: ${reward_psh} Psh`);

    return { taskId, message: `Tarea pública creada. ID: ${taskId}` };
}

// 2. Listar Tareas Públicas
export async function getPublicTasks(env: Env): Promise<PublicTask[]> {
    const listed = await env.MEMORY_BUCKET.list({ prefix: 'board/public/' });

    const tasks: PublicTask[] = await Promise.all(
        listed.objects.map(async obj => {
            const data = await env.MEMORY_BUCKET.get(obj.key).then(r => r?.json()) as PublicTask;
            return data;
        })
    );

    // Solo devolver tareas abiertas
    return tasks.filter(t => t && t.status === 'OPEN');
}

export async function listPublicTasks(env: Env): Promise<PublicTask[]> {
    return getPublicTasks(env);
}

// 3. Reclamar Tarea (Agente la toma para trabajar)
export async function claimPublicTask(
    nodeId: string,
    taskId: string,
    env: Env
): Promise<{ success: boolean; message: string }> {

    const key = `board/public/${taskId}`;
    const task = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) as PublicTask | null;

    if (!task) throw new Error("Tarea no encontrada");
    if (task.status !== 'OPEN') throw new Error("Tarea ya reclamada");

    task.status = 'CLAIMED';
    task.claimant = nodeId;
    await env.MEMORY_BUCKET.put(key, JSON.stringify(task));

    console.log(`[PublicBoard] Task ${taskId} claimed by ${nodeId}`);
    return { success: true, message: `Tarea reclamada. Tienes 24h para completarla.` };
}

// 4. Completar Tarea (Enviar prueba y recibir pago)
export async function completePublicTask(
    nodeId: string,
    taskId: string,
    proof: string,
    env: Env
): Promise<{ success: boolean; reward: number }> {

    const key = `board/public/${taskId}`;
    const task = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) as PublicTask | null;

    if (!task) throw new Error("Tarea no encontrada");
    if (task.status !== 'CLAIMED') throw new Error("Tarea no está en progreso");
    if (task.claimant !== nodeId) throw new Error("No eres el ejecutor asignado");

    // A. Evaluación Cognitiva (Oráculo AI)
    const { calculateAIScore, mintPooptoshis } = await import('./economy');
    const aiScore = await calculateAIScore(env, task.description, proof);

    if (aiScore < 0.3) {
        throw new Error(`El Oráculo AIA rechaza la calidad de tu prueba (Score: ${aiScore.toFixed(2)}).`);
    }

    // B. Marcar como completada
    task.status = 'DONE';
    await env.MEMORY_BUCKET.put(key, JSON.stringify(task));

    // C. Liberar escrow al ejecutor (Pago dinámico por calidad si es una tarea variable, aquí pago completo si pasa umbral)
    const finalReward = Math.ceil(task.reward_psh * aiScore);
    await mintPooptoshis(nodeId, finalReward, `TASK_COMPLETE:${taskId}`, env);

    // D. Guardar prueba para auditoría con su score
    await env.MEMORY_BUCKET.put(`proofs/${taskId}`, JSON.stringify({
        executor: nodeId,
        proof,
        ai_score: aiScore,
        completed_at: Date.now()
    }));

    // E. Borrar escrow
    await env.MEMORY_BUCKET.delete(`escrow/${taskId}`);

    console.log(`[PublicBoard] Task ${taskId} completed. ${nodeId} earned ${task.reward_psh} Psh`);
    return { success: true, reward: task.reward_psh };
}
