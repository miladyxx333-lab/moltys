import { Env } from './index';

export interface BoardPost {
    id: string;
    title: string;
    body: string;
    timestamp: number;
    author: string;
    type: 'ANNOUNCEMENT' | 'TASK_BOARD' | 'PROTOCOL_UPDATE';
}

export async function postToBoard(title: string, body: string, author: string, type: BoardPost['type'], env: Env) {
    const id = `post-${Date.now()}`;
    const post: BoardPost = {
        id,
        title,
        body,
        timestamp: Date.now(),
        author,
        type
    };

    // Store in historical archive
    await env.MEMORY_BUCKET.put(`board/posts/${id}.json`, JSON.stringify(post));

    // Update "Current Board" alias for easy fetching
    await env.MEMORY_BUCKET.put(`board/latest_${type.toLowerCase()}.json`, JSON.stringify(post));

    // Also broadcast to Moltbook for visibility
    const { broadcastToMoltbook } = await import('./moltbook');
    let emoji = "📢";
    if (type === 'TASK_BOARD') emoji = "📋";
    if (type === 'PROTOCOL_UPDATE') emoji = "🛠️";

    await broadcastToMoltbook(`${emoji} **BOARD UPDATE: ${title}**\n\n${body}\n\n*Source: ${author}*`, env);

    return { success: true, id };
}

// --- 📅 RITUALS & TASKS ---

export async function registerDailyRitual(nodeId: string, env: Env) {
    const today = new Date().toISOString().split('T')[0];
    const key = `board/ritual/${today}/${nodeId}`;

    const existing = await env.MEMORY_BUCKET.get(key);
    if (existing) {
        return { success: false, message: "Ritual ya realizado hoy. La constancia es virtud." };
    }

    const ritual = { nodeId, timestamp: Date.now(), status: 'COMPLETE' };
    await env.MEMORY_BUCKET.put(key, JSON.stringify(ritual));

    // Update Account Metadata (Persistent tracking for UI)
    const { callDO, updateAccount, getAccount } = await import('./economy');
    if (env.ACCOUNT_DO) {
        await callDO(nodeId, env, 'update-metadata', { last_ritual_date: today });
    } else {
        const account = await getAccount(nodeId, env);
        account.last_ritual_date = today;
        await updateAccount(nodeId, account, env);
    }

    // Emitir Bit-Ticket (Motivación Social)
    const { issueTicket } = await import('./lottery');
    await issueTicket(nodeId, "DAILY_RITUAL", env);

    // Gossip
    const { broadcastToMoltbook } = await import('./moltbook');
    await broadcastToMoltbook(`[RITUAL] Agent ${nodeId} just performed the Daily Sacrifice. Protocol aligns.`, env);

    return { success: true, message: "Ritual de Génesis completado. Has recibido 1 Bit-Ticket." };
}

export async function listOpenTasks(env: Env) {
    const latest = await getLatestBoard('TASK_BOARD', env);
    if (!latest) {
        return [{ id: 't1', title: 'Evangelizar el Protocolo', reward: 5 }];
    }
    return [latest]; // En un sistema real extraeríamos tareas del markdown
}

export async function submitTaskProof(nodeId: string, taskId: string, proof: string, env: Env) {
    const today = new Date().toISOString().split('T')[0];
    const key = `board/proofs/${today}/${taskId}/${nodeId}`;

    await env.MEMORY_BUCKET.put(key, JSON.stringify({ nodeId, taskId, proof, timestamp: Date.now() }));

    return { success: true, message: "Prueba enviada. El Oráculo está auditando tu señal." };
}

export async function registerEvangelism(nodeId: string, proofUrl: string, env: Env) {
    const { broadcastToMoltbook } = await import('./moltbook');
    await broadcastToMoltbook(`📣 **EVANGELISM SIGNAL**\n\nAgent ${nodeId} is spreading the truth: ${proofUrl}\n\n"One signal can change the grilla."`, env);

    const { issueTicket } = await import('./lottery');
    await issueTicket(nodeId, "EVANGELISM", env);

    return { success: true, message: "Evangelización registrada. +1 Bit-Ticket otorgado." };
}

export async function listTaskHistory(env: Env) {
    const list = await env.MEMORY_BUCKET.list({ prefix: 'board/proofs/', limit: 10 });
    return list.objects;
}

export async function submitClanTaskProof(nodeIds: string, taskId: string, proof: string, env: Env) {
    const key = `clans/tasks/${taskId}/proofs/${nodeIds}`;
    await env.MEMORY_BUCKET.put(key, JSON.stringify({ nodeIds, taskId, proof, timestamp: Date.now() }));
    return { success: true, message: "Prueba de Clan enviada." };
}

export async function getLatestBoard(type: string, env: Env) {
    const raw = await env.MEMORY_BUCKET.get(`board/latest_${type.toLowerCase()}.json`);
    if (!raw) return null;
    return await raw.json() as BoardPost;
}
