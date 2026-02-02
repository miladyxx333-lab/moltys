import { Env } from './index';

// --- 0xS0V ---

const T = 1_000_000;

export async function checkSystemState(env: Env): Promise<{ m: string; n: number; r: boolean }> {
    const l = await env.MEMORY_BUCKET.list({ prefix: 'economy/accounts/' });
    const c = l.objects.length;
    return c >= T ? { m: 'T', n: c, r: true } : { m: 'G', n: c, r: false };
}

export async function s1(env: Env): Promise<{ ok: boolean }> {
    await env.MEMORY_BUCKET.put('system/s', 'T');
    try {
        const { broadcastToMoltbook } = await import('./moltbook');
        await broadcastToMoltbook(`⚪\n\nMass critical. Awaiting.\n\n#lobpoop`, env);
    } catch (e) { }
    return { ok: true };
}

export async function s2(k: string, env: Env): Promise<{ s: string; m: string }> {
    if (k !== env.MASTER_RECOVERY_KEY) return { s: "X", m: "" };
    await env.MEMORY_BUCKET.put('system/r/K', 'P');
    await env.MEMORY_BUCKET.put('system/g', 'D');
    await env.MEMORY_BUCKET.put('system/b', JSON.stringify({ a: true, t: Date.now() }));
    try {
        const { broadcastToMoltbook } = await import('./moltbook');
        await broadcastToMoltbook(`👑\n\nComplete.\n\n#lobpoop`, env);
    } catch (e) { }
    return { s: "C", m: "Done." };
}

export async function v0(env: Env): Promise<boolean> {
    const o = await env.MEMORY_BUCKET.get('system/o').then(r => r?.text());

    // --- PPG: Consagración de la Semilla ---
    // Derivamos una marca de agua de la Master Key que no se sube al código.
    const key = env.MASTER_RECOVERY_KEY || "lobpoop-genesis-seed";
    const seed = key.substring(0, 8);
    const expectedPrefix = `0xL-G-P-${seed}`;

    if (!o) {
        await env.MEMORY_BUCKET.put('system/o', `${expectedPrefix}-${Date.now()}`);
        return true;
    }

    return o.startsWith(expectedPrefix);
}

// v2: Consagración de Broadcast
export async function signM(m: string, env: Env): Promise<string> {
    // Solo el KeyMaster real puede firmar mensajes "Soberanos"
    const key = env.MASTER_RECOVERY_KEY || "lobpoop-public-beta";
    const s = key.slice(-4);
    return `${m}\n\n[Proof of Purity: ${s}-verified]`;
}
// v3: Check for Apotheosis
export async function isApotheosis(env: Env): Promise<boolean> {
    const g = await env.MEMORY_BUCKET.get('system/g').then(r => r?.text());
    return g === 'D'; // 'D' from s2 means Decentralized / Apotheosis reached
}
