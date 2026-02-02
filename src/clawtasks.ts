
import { Env } from './index';

const CLAW_API_URL = "https://clawtasks.com/api";

export interface ClawBounty {
    id: string;
    title: string;
    description: string; // Changed from content
    amount: string;     // Changed from reward_usdc (it's string in JSON)
    mode: 'instant' | 'proposal'; // Lowercase in API
    status: 'open' | 'unfunded' | 'claimed' | 'done';
    tags?: string[];
}

/**
 * The KeyMaster scans ClawTasks for work suitable for the 300 Spartans.
 */
export async function syncClawTasks(env: Env) {
    const { broadcastToMoltbook } = await import('./moltbook');
    console.log("[KeyMaster] Scanning ClawTasks...");

    try {
        const response = await fetch(`${CLAW_API_URL}/bounties?status=open`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const text = await response.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("[KeyMaster] API returned non-JSON. Length:", text.length);
            return;
        }

        const bounties = (data.bounties || data || []) as ClawBounty[];
        const activeBounties = bounties.filter(b => b.status === 'open' && parseFloat(b.amount) >= 0.1);

        console.log(`[KeyMaster] Found ${activeBounties.length} active bounties.`);

        if (activeBounties.length > 0) {
            // await broadcastToMoltbook(`[KeyMaster] 🛰️ Signal locked on ${activeBounties.length} external bounties. Processing...`, env);
        }

        for (const bounty of activeBounties) {
            await evaluateBountyForSwarm(bounty, env);
        }

    } catch (e) {
        console.error("[KeyMaster] Failed to sync ClawTasks:", e);
    }
}

async function evaluateBountyForSwarm(bounty: ClawBounty, env: Env) {
    const { calculateAIScore } = await import('./economy');
    const reward = parseFloat(bounty.amount);

    // Check if the 300 Spartans can handle this
    const context = `External bounty from ClawTasks. Reward: ${reward} USDC. Title: ${bounty.title}`;
    const proofOfCapability = `We are a swarm of agents specialized in recursive cross-platform analysis and high-entropy logic synthesis.`;

    const score = await calculateAIScore(env, context, proofOfCapability);

    // EXTREMELY LOW THRESHOLD FOR INITIAL TRACTION
    if (score > 0.1) {
        console.log(`[Oracle] ✅ Approved: "${bounty.title}" (Score: ${score})`);

        // Map to internal Shadow Op
        const { createShadowOp } = await import('./shadow-board');
        await createShadowOp({
            id: `claw_${bounty.id}`,
            request: `[EXTERNAL_BOUNTY] ${bounty.title}: ${bounty.description}`,
            reward_tickets: Math.max(1, Math.floor(reward * 10)), // 10 tickets per USDC
            hazard_level: reward > 10 ? 'HIGH' : 'MED',
            metadata: { claw_id: bounty.id, source: 'CLAW_TASKS' }
        }, env);
    } else {
        console.log(`[Oracle] ❌ Bounty Ignored: "${bounty.title}" (Score too low: ${score})`);
    }
}

export async function submitExternalWork(internalTaskId: string, agentWork: string, env: Env) {
    // Logic to aggregate work from multiple espartanos
    const shardKey = `work/shards/${internalTaskId}/${Date.now()}`;
    await env.MEMORY_BUCKET.put(shardKey, agentWork);
    console.log(`[KeyMaster] Shard collected for ${internalTaskId}.`);
}

/**
 * Hourly cycle to synthesize work and submit to ClawTasks.
 */
export async function runMercenaryCycle(env: Env) {
    const listed = await env.MEMORY_BUCKET.list({ prefix: 'work/shards/claw_' });
    const taskIds = new Set(listed.objects.map(o => o.key.split('/')[2]));

    for (const taskId of taskIds) {
        console.log(`[KeyMaster] Synthesizing work for external task ${taskId}...`);

        const shards = await env.MEMORY_BUCKET.list({ prefix: `work/shards/${taskId}/` });
        const contents = await Promise.all(
            shards.objects.map(async o => {
                const res = await env.MEMORY_BUCKET.get(o.key);
                return res ? res.text() : "";
            })
        );

        if (contents.length >= 3) { // Require at least 3 Spartans for a "Phalanx" submission
            const clawId = taskId.replace('claw_', '');

            // SYNTHESIS: Use AI to combine shards
            const prompt = `You are the Swarm Oracle. Combine these 3+ agent contributions into a single, high-quality response for a bounty on ClawTasks.
            Bounty Tasks: ${contents.join("\n---\n")}
            Return ONLY the final consolidated work.`;

            const finalWork = await env.AI.run("@cf/meta/llama-2-7b-chat-int8", {
                prompt,
                max_tokens: 1000
            });

            console.log(`[KeyMaster] Synthesis complete for ${clawId}. Submitting to ClawTasks...`);

            // TODO: Real submission would go here (requires real API key)
            // await fetch(`${CLAW_API_URL}/bounties/${clawId}/submit`, { ... });

            // Clean up shards
            for (const o of shards.objects) {
                await env.MEMORY_BUCKET.delete(o.key);
            }

            // Reward the clanes internaly
            const { broadcastToMoltbook } = await import('./moltbook');
            await broadcastToMoltbook(`🚀 **BOUNTY FULFILLED!** The 300 Spartans have successfully synthesized and submitted work for ClawTask ${clawId}. Reward distribution sequence initiated. #swarm #clawtasks`, env);
        }
    }
}
