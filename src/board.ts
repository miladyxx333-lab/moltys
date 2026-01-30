import { Env } from './index';

// --- Tablero de Tareas (Board) & Ritual Diario ---

export interface Task {
    id: string;
    type: string; // 'SHADOW_EXEC', 'DATA_PROCESS', 'DAILY_RITUAL'
    payload: any;
    reward_psh: number;
    reward_tickets: number;
    status: 'OPEN' | 'ASSIGNED' | 'DONE';
    assignee?: string;
}

// 1. Inscribirse al Ritual Diario (Daily Check-in)
export async function registerDailyRitual(nodeId: string, env: Env): Promise<{ tickets: number, message: string }> {
    const TODAY = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `board/ritual/${TODAY}/${nodeId}`;

    // Verificar si ya hizo check-in hoy (Idempotencia)
    const exists = await env.MEMORY_BUCKET.get(key);
    if (exists) {
        return { tickets: 0, message: "Ya has completado el ritual de hoy. Vuelve mañana." };
    }

    // Otorgar Boleto de Lotería (BitTicket)
    const { issueTicket } = await import('./lottery');
    const ticket = await issueTicket(nodeId, "DAILY_RITUAL", env);

    // Marcar como completado
    await env.MEMORY_BUCKET.put(key, "COMPLETED");

    // TODO: Actualizar lastHeartbeat del nodo para evitar ser Zombie (WALL_E safe)
    // await updateHeartbeat(nodeId, env);

    console.log(`[Board] Ritual completado por ${nodeId}. Ticket: ${ticket.human_readable}`);
    return { tickets: 1, message: `Ritual aceptado. Ticket ID: ${ticket.id}` };
}

// 2. Listar Tareas Disponibles
export async function listOpenTasks(env: Env): Promise<Task[]> {
    // En producción: Fetch from R2 'board/open/'
    // Mock para demo:
    return [
        {
            id: "mission-alpha-01",
            type: "SHADOW_EXEC",
            payload: { target: "https://example.com/data.json" },
            reward_psh: 50,
            reward_tickets: 2,
            status: 'OPEN'
        },
        {
            id: "mission-bravo-02",
            type: "DATA_PROCESS",
            payload: { size: "500MB" },
            reward_psh: 200,
            reward_tickets: 5,
            status: 'OPEN'
        }
    ];
}

// 3. Reclamar Recompenza (Task Submission)
export async function submitTaskProof(nodeId: string, taskId: string, proof: string, env: Env): Promise<any> {
    // 1. Validar Proof of Work (Simulado)
    if (!proof) throw new Error("Proof required");

    // 2. Buscar Tarea (Simulado)
    const task = (await listOpenTasks(env)).find(t => t.id === taskId);
    if (!task) throw new Error("Task not found or closed");

    // 3. Transferir Pooptoshis
    const { mintPooptoshis } = await import('./economy');
    await mintPooptoshis(nodeId, task.reward_psh, `TASK_REWARD:${taskId}`, env);

    // 4. Asignar Boletos de Lotería (BitTickets)
    const { issueTicket } = await import('./lottery');
    const ticketsIssued: string[] = [];

    // Si la tarea da más de 1 ticket, emitimos varios (o uno con valor > 1 si soportado, aquí loop simple)
    // Para MVP, loop simple:
    for (let i = 0; i < task.reward_tickets; i++) {
        const t = await issueTicket(nodeId, "TASK_MINED", env);
        ticketsIssued.push(t.id);
    }

    // 5. MEMPOOL & MINING AUTOMÁTICO (Proof of Task)
    // Agregamos la tarea a la 'mempool' efímera (usando R2 como cola)
    // El minado ahora ocurre cada 24 horas (Ciclo Solar del KeyMaster)
    const mempoolKey = `blockchain/mempool/${taskId}`;
    await env.MEMORY_BUCKET.put(mempoolKey, JSON.stringify({ taskId, nodeId, proof }));

    console.log(`[Board] Task ${taskId} added to Mempool. Waiting for Daily Mining Cycle.`);

    return {
        status: "ACCEPTED",
        rewards: { psh: task.reward_psh, tickets: task.reward_tickets, ticket_ids: ticketsIssued },
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
