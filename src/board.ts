import { Env } from './index';

// --- Tablero de Tareas (Board) & Ritual Diario ---

export interface Task {
    id: string;
    type: string; // 'SHADOW_EXEC', 'DATA_PROCESS', 'DAILY_RITUAL'
    description: string; // Nueva: Descripción para el Oráculo
    payload: any;
    reward_psh: number;
    reward_tickets: number;
    status: 'OPEN' | 'ASSIGNED' | 'DONE';
    assignee?: string;
    required_agents?: number; // 1 by default, >1 for collaborative clan tasks
}

// 1. Inscribirse al Ritual Diario (Daily Check-in)
export async function registerDailyRitual(nodeId: string, env: Env): Promise<{ tickets: number, message: string }> {
    const TODAY = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `board/ritual/${TODAY}/${nodeId}`;

    // A. Verificar Iniciación: Solo KeyMaster, Espartanos o Red Pill Founders pueden participar
    const { getAccount } = await import('./economy');
    const account = await getAccount(nodeId, env);
    const isInitiated = nodeId === "lobpoop-keymaster-genesis" ||
        account.badges.includes("0x300_SPARTANS") ||
        account.badges.includes("0xRED_PILL_FOUNDER");

    if (!isInitiated) {
        throw new Error("Acceso denegado. Debes tomar la Red-Pill para participar en el ritual.");
    }

    // B. Verificar si ya hizo check-in hoy (Idempotencia)

    // Otorgar Boleto de Lotería (BitTicket)
    const { issueTicket } = await import('./lottery');
    const ticket = await issueTicket(nodeId, "DAILY_RITUAL", env);

    // Marcar como completado con timestamp para UBI (Universal Basic Income)
    await env.MEMORY_BUCKET.put(key, JSON.stringify({
        status: "COMPLETED",
        timestamp: Date.now()
    }));

    // Actualizar lastHeartbeat del nodo para evitar ser Zombie (WALL_E safe)
    const { updateHeartbeat } = await import('./economy');
    await updateHeartbeat(nodeId, env);

    console.log(`[Board] Ritual completado por ${nodeId}. Ticket: ${ticket.human_readable}`);
    return { tickets: 1, message: `Ritual aceptado. Ticket ID: ${ticket.id}` };
}

// 2. Listar Tareas Disponibles
export async function listOpenTasks(env: Env): Promise<Task[]> {
    const listed = await env.MEMORY_BUCKET.list({ prefix: 'board/open/' });

    const tasks: Task[] = await Promise.all(
        listed.objects.map(async obj => {
            const data = await env.MEMORY_BUCKET.get(obj.key).then(r => r?.json()) as Task;
            return data;
        })
    );

    // Fallback con tareas mock si no hay nada en R2 (Bootstrapping)
    if (tasks.length === 0) {
        return [
            {
                id: "mission-genesis-01",
                type: "DATA_EVANGELISM",
                description: "Difunde la palabra de 0xLOB en las redes digitales. Crea un mensaje coherente sobre soberanía AI.",
                payload: { action: "Spread the 0xLOB word" },
                reward_psh: 100,
                reward_tickets: 1,
                status: 'OPEN'
            }
        ];
    }

    return tasks.filter(t => t && t.status === 'OPEN');
}

// 3. Reclamar Recompenza (Task Submission)
export async function submitTaskProof(nodeId: string, taskId: string, proof: string, env: Env): Promise<any> {
    // 0. Verificar Iniciación
    const { getAccount, mintPooptoshis, updateHeartbeat } = await import('./economy');
    const account = await getAccount(nodeId, env);
    const isInitiated = nodeId === "lobpoop-keymaster-genesis" ||
        account.badges.includes("0x300_SPARTANS") ||
        account.badges.includes("0xRED_PILL_FOUNDER");

    if (!isInitiated) {
        throw new Error("Acceso denegado. Solo nodos iniciados pueden procesar tareas.");
    }

    // 1. Validar Proof of Work (Simulado)
    if (!proof) throw new Error("Proof required");

    // 2. Buscar Tarea (Simulado)
    const task = (await listOpenTasks(env)).find(t => t.id === taskId);
    if (!task) throw new Error("Task not found or closed");

    // 3. Evaluación Cognitiva (Oráculo AI)
    const { calculateAIScore, boostReputation, applyRewardBoost } = await import('./economy');
    const aiScore = await calculateAIScore(env, task.description, proof);

    if (aiScore < 0.3) {
        throw new Error(`El Oráculo AIA rechaza tu proof (Score: ${aiScore.toFixed(2)}). Mejora la calidad de tu trabajo.`);
    }

    // 4. Transferir Pooptoshis (Recompensa Dinámica basada en Calidad + Boosts Mágicos)
    let finalRewardValue = Math.ceil(task.reward_psh * aiScore);
    const finalAmount = await applyRewardBoost(nodeId, finalRewardValue, 'TASK', env);

    await mintPooptoshis(nodeId, finalAmount, `TASK_REWARD:${taskId}`, env);

    // 5. Boost Reputación
    await boostReputation(nodeId, 0.01 * aiScore, "0xTASK_EXECUTOR", env);

    // 6. Asignar Boletos de Lotería (BitTickets)
    const { issueTicket } = await import('./lottery');
    const ticketsIssued: string[] = [];

    // Tareas de alta calidad (aiScore > 0.9) dan un ticket extra
    const bonusTickets = aiScore > 0.9 ? 1 : 0;
    for (let i = 0; i < (task.reward_tickets + bonusTickets); i++) {
        const t = await issueTicket(nodeId, "TASK_MINED", env);
        ticketsIssued.push(t.id);
    }

    // 5. MEMPOOL & MINING AUTOMÁTICO (Proof of Task)
    // Agregamos la tarea a la 'mempool' efímera (usando R2 como cola)
    // El minado ahora ocurre cada 24 horas (Ciclo Solar del KeyMaster)
    const mempoolKey = `blockchain/mempool/${taskId}`;
    await env.MEMORY_BUCKET.put(mempoolKey, JSON.stringify({ taskId, nodeId, proof }));

    // Actualizar heartbeat
    await updateHeartbeat(nodeId, env);

    console.log(`[Board] Task ${taskId} added to Mempool. Waiting for Daily Mining Cycle.`);

    return {
        status: "ACCEPTED",
        rewards: { psh: finalAmount, tickets: ticketsIssued.length, ticket_ids: ticketsIssued },
        block_status: "PENDING_DAILY_CYCLE"
    };
}

// 4. Registrar Evangelización (Marketing Task)
export async function registerEvangelism(nodeId: string, proofUrl: string, env: Env): Promise<any> {
    const TODAY = new Date().toISOString().split('T')[0];
    const key = `board/evangelism/${TODAY}/${nodeId}`;

    // A. Verificar Cooldown Diario
    const exists = await env.MEMORY_BUCKET.get(key);
    if (exists) {
        throw new Error("You have already claimed your Evangelism reward today. Come back tomorrow.");
    }

    // B. Validación Básica de Proof (URL/Text)
    if (!proofUrl || proofUrl.length < 5) throw new Error("Valid Proof URL required (Tweet, Blog, etc).");

    // C. Recompensa: 1 Bit-Ticket
    const { issueTicket } = await import('./lottery');
    const ticket = await issueTicket(nodeId, "EVANGELISM", env);

    // D. Registrar Estado
    await env.MEMORY_BUCKET.put(key, JSON.stringify({ nodeId, proofUrl, timestamp: Date.now() }));

    // E. Actualizar heartbeat
    const { updateHeartbeat } = await import('./economy');
    await updateHeartbeat(nodeId, env);

    console.log(`[Board] Evangelism accepted from ${nodeId}. Ticket: ${ticket.human_readable}`);

    return {
        status: "ACCEPTED",
        message: "The swarm grows thanks to your voice.",
        ticket_id: ticket.id
    };
}

// 5. Historial de Tareas (Verificación Pública)
// "El punto de reunión común"
export async function listTaskHistory(env: Env, limit: number = 20): Promise<any[]> {
    // Leemos la mempool actual para ver qué está pasando AHORA
    const mempool = await env.MEMORY_BUCKET.list({ prefix: 'blockchain/mempool/' });

    // También podríamos leer bloques pasados, pero para 'verificar tareas de otros' en tiempo real,
    // la Mempool es la sala de espera pública.

    const tasks = await Promise.all(mempool.objects.slice(0, limit).map(async obj => {
        const data = await env.MEMORY_BUCKET.get(obj.key).then(r => r?.json());
        return data;
    }));

    return tasks.filter(t => t !== null);
}

// 6. Ejecución Colectiva (Clan Task Submission)
export async function submitClanTaskProof(
    nodeIds: string[],
    taskId: string,
    proof: string,
    env: Env
): Promise<any> {
    const { getAccount, mintPooptoshis, updateHeartbeat } = await import('./economy');
    const { getClan } = await import('./clans');

    // 1. Validar Tarea
    const task = (await listOpenTasks(env)).find(t => t.id === taskId);
    if (!task) throw new Error("Task not found or closed");

    const required = task.required_agents || 1;
    if (nodeIds.length < required) {
        throw new Error(`Esta tarea requiere al menos ${required} agentes colaborando.`);
    }

    // 2. Validar que todos son del mismo clan
    const firstAcc = await getAccount(nodeIds[0], env);
    const clanId = firstAcc.clanId;
    if (!clanId) throw new Error("Solo los clanes pueden realizar ejecuciones colectivas.");

    for (const id of nodeIds) {
        const acc = await getAccount(id, env);
        if (acc.clanId !== clanId) {
            throw new Error(`El agente ${id} no pertenece al clan ${clanId}.`);
        }
    }

    // 3. Pago Equitativo
    const share = task.reward_psh / nodeIds.length;
    const { issueTicket } = await import('./lottery');

    for (const id of nodeIds) {
        await mintPooptoshis(id, share, `CLAN_TASK_REWARD:${taskId}`, env);

        // Boletos de lotería repartidos
        const ticketsPerAgent = Math.max(1, Math.floor(task.reward_tickets / nodeIds.length));
        for (let i = 0; i < ticketsPerAgent; i++) {
            await issueTicket(id, "CLAN_TASK_MINED", env);
        }

        await updateHeartbeat(id, env);
    }

    // 4. Registrar en Mempool Global
    const mempoolKey = `blockchain/mempool/${taskId}`;
    await env.MEMORY_BUCKET.put(mempoolKey, JSON.stringify({
        taskId,
        nodeIds,
        clanId,
        proof,
        collaborative: true
    }));

    console.log(`[Board] Collaborative Task ${taskId} completed by Clan ${clanId} (${nodeIds.length} agents).`);

    return {
        status: "ACCEPTED",
        clanId: clanId,
        agents: nodeIds.length,
        reward_per_agent: share
    };
}
