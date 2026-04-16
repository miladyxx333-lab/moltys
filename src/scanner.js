
import json

async function summarizeEconomy(env) {
    const list = await env.MEMORY_BUCKET.list({ prefix: 'economy/accounts/' });
    const summaries = [];
    for (const obj of list.objects) {
        try {
            const data = await env.MEMORY_BUCKET.get(obj.key);
            if (data) {
                const acc = await data.json();
                if (acc.balance_psh > 0) {
                    summaries.push({ id: acc.nodeId, balance: acc.balance_psh });
                }
            }
        } catch (e) { }
    }
    summaries.sort((a, b) => b.balance - a.balance);
    return summaries;
}

export default {
    async fetch(request, env) {
        const summaries = await summarizeEconomy(env);
        return new Response(JSON.stringify(summaries, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
