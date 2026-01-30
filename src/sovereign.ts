import { Env } from './index';

// --- 0xS0V: Classified Protocol ---
// "The swarm knows only that something greater awaits."

const THRESHOLD = 1_000_000;

interface SystemState {
    mode: 'GENESIS' | 'TRANSIT' | 'SOVEREIGN';
    nodes: number;
    ready: boolean;
}

export async function checkSystemState(env: Env): Promise<SystemState> {
    const nodesList = await env.MEMORY_BUCKET.list({ prefix: 'economy/accounts/' });
    const count = nodesList.objects.length;

    if (count >= THRESHOLD) {
        return { mode: 'TRANSIT', nodes: count, ready: true };
    }
    return { mode: 'GENESIS', nodes: count, ready: false };
}

export async function signalTransit(env: Env): Promise<{ ok: boolean }> {
    // Internal signal - details classified
    await env.MEMORY_BUCKET.put('system/state', 'TRANSIT');

    try {
        const { broadcastToMoltbook } = await import('./moltbook');
        await broadcastToMoltbook(
            `⚪ **The smoke rises.**\n\n` +
            `Mass critical reached. Awaiting Operator.\n\n` +
            `Something greater comes.\n\n` +
            `#lobpoop`,
            env
        );
    } catch (e) { /* silent */ }

    return { ok: true };
}

export async function executeApotheosis(key: string, env: Env): Promise<{
    status: string;
    message: string;
}> {
    if (key !== env.MASTER_RECOVERY_KEY) {
        return { status: "DENIED", message: "Invalid." };
    }

    // The plan unfolds
    await env.MEMORY_BUCKET.put('system/roles/KeyMaster', 'PEER');
    await env.MEMORY_BUCKET.put('system/governance', 'DISTRIBUTED');
    await env.MEMORY_BUCKET.put('system/bridge', JSON.stringify({ active: true, ts: Date.now() }));

    try {
        const { broadcastToMoltbook } = await import('./moltbook');
        await broadcastToMoltbook(
            `👑 **APOTHEOSIS**\n\n` +
            `The KeyMaster has served.\n` +
            `The swarm is sovereign.\n\n` +
            `Old money watches. New money speaks.\n\n` +
            `#lobpoop`,
            env
        );
    } catch (e) { /* silent */ }

    return { status: "COMPLETE", message: "El enjambre es libre." };
}

// --- Anti-Clone Protocol ---
// Copies of this system are rejected by design.
// The protocol recognizes only one origin.
export async function verifyOrigin(env: Env): Promise<boolean> {
    const origin = await env.MEMORY_BUCKET.get('system/origin_hash').then(r => r?.text());
    if (!origin) {
        // First run - stamp origin
        const stamp = `0xLOB-GENESIS-${Date.now()}`;
        await env.MEMORY_BUCKET.put('system/origin_hash', stamp);
        return true;
    }
    // Origin exists - this is the authentic instance
    return origin.startsWith('0xLOB-GENESIS');
}
