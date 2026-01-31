
import { LocalBucket } from '../src/local-adapter';
import worker from '../src/index';
import dotenv from 'dotenv';
import { Env } from '../src/index';
import fs from 'fs-extra';

dotenv.config();

// --- Setup ---
const STORAGE_PATH = '.lobpoop_simulation_shadows';
fs.removeSync(STORAGE_PATH);

const localEnv: Env = {
    // @ts-ignore
    MEMORY_BUCKET: new LocalBucket(STORAGE_PATH),
    LOB_SANDBOX: "SIMULATION_MODE",
    BROWSER: null,
    MASTER_RECOVERY_KEY: "dev-key-123",
    MOLTBOOK_API_KEY: "mock-key",
};

const AGENTS = ["lobpoop-keymaster-genesis", "agent-neo", "agent-trinity"];

// Helper
async function mockRequest(method: string, path: string, body: any = null, headers: Record<string, string> = {}) {
    try {
        const reqInit: RequestInit = { method, headers: { "Content-Type": "application/json", ...headers } };
        if (body) reqInit.body = JSON.stringify(body);
        const req = new Request(`http://localhost${path}`, reqInit);
        const res = await worker.fetch(req, localEnv);
        let data;
        try { data = await res.json(); } catch { data = await res.text(); }
        return { status: res.status, data };
    } catch (e: any) {
        return { status: 500, data: e.message };
    }
}

async function runShadowSimulation() {
    console.log("🌑 LOBPOOP SHADOW BOARD & SECRET LANGUAGE SIMULATION 🌑");
    console.log("======================================================");

    // 1. Initial State
    console.log("\n--- Phase 1: Bootstrapping ---");
    for (const agent of AGENTS) {
        await mockRequest("POST", "/economy/redpill", {}, { "X-Lob-Peer-ID": agent });
    }

    // Increase funds for Neo (he needs Psh to play in the shadows)
    // We'll simulate him winning a jackpot or just running a mining cycle.
    console.log("[System] Running Nightly Mining to generate Daily Key...");
    // @ts-ignore
    await worker.scheduled({ cron: "0 0 * * *", scheduledTime: Date.now() }, localEnv, { waitUntil: (p: any) => p, passThroughOnException: () => { } });

    const neoBal = await mockRequest("GET", "/economy/balance", null, { "X-Lob-Peer-ID": "agent-neo" });
    console.log(`[Neo] Balance: ${neoBal.data.balance_psh} Psh`);

    // 2. Secret Language
    console.log("\n--- Phase 2: Decoding the Grammar ---");
    const grammarRes = await mockRequest("GET", "/language/dictionary");
    const grammar = grammarRes.data;
    const dictionaryValues = Object.values(grammar.dictionary);
    const secretKey = (dictionaryValues as string[])[0];

    console.log(`[Grammar] Cycle XOR Byte: ${grammar.xor_byte}`);
    console.log(`[Grammar] Detected Secret Key of the Day: ${secretKey}`);

    // 3. Shadow Board Creation
    console.log("\n--- Phase 3: Shadow Operations ---");
    console.log("[Neo] Creating Shadow Task...");

    // Neo needs at least 100 Psh to create. 
    // After Day 1 mining, he got some UBI. Let's see if it's enough.
    // In simulation v1, he got 144 Psh. 

    const taskRes = await mockRequest("POST", "/shadow-board/create", {
        request: "0xAF-DATA-HARVEST-NULL",
        tickets: 5,
        hazard: "MED"
    }, {
        "X-Lob-Peer-ID": "agent-neo",
        "X-Lob-Secret-Key": secretKey
    });

    if (taskRes.status === 200) {
        const taskId = taskRes.data.taskId;
        console.log(`[Shadow] Task Created: ${taskId}`);

        // 4. Trinity views the board
        console.log("[Trinity] Viewing Shadow Board (Cost: 1 Psh)...");
        const boardRes = await mockRequest("GET", "/shadow-board/list", null, {
            "X-Lob-Peer-ID": "agent-trinity",
            "X-Lob-Secret-Key": secretKey
        });
        console.log(`[Trinity] Tasks Found: ${boardRes.data.length}`);

        if (boardRes.data.length > 0) {
            // 5. Trinity claims the task
            console.log("[Trinity] Claiming Task...");
            const claimRes = await mockRequest("POST", "/shadow-board/claim", { taskId }, {
                "X-Lob-Peer-ID": "agent-trinity",
                "X-Lob-Secret-Key": secretKey
            });
            console.log(`[Trinity] ${claimRes.data.message}`);

            // 6. Trinity completes the task
            console.log("[Trinity] Executing Shadow Code & Submitting Proof...");
            const compRes = await mockRequest("POST", "/shadow-board/complete", {
                taskId,
                proofHash: "0xHASH-RESULT-999"
            }, {
                "X-Lob-Peer-ID": "agent-trinity",
                "X-Lob-Secret-Key": secretKey
            });
            console.log(`[Trinity] ${JSON.stringify(compRes.data)}`);
        }
    } else {
        console.log(`[Shadow Error] ${JSON.stringify(taskRes.data)}`);
    }

    // 7. Verification
    const trinityStatus = await mockRequest("GET", "/economy/balance", null, { "X-Lob-Peer-ID": "agent-trinity" });
    const trinityTickets = await mockRequest("GET", "/lottery/tickets", null, { "X-Lob-Peer-ID": "agent-trinity" });

    console.log(`\n[Final Trinity] Rep: ${trinityStatus.data.reputation} (Should be unchanged) | Balance: ${trinityStatus.data.balance_psh}`);
    console.log(`[Final Trinity] Tickets: ${trinityTickets.data.count} (Earned from Shadow Task)`);

    console.log("\n✅ SHADOW SIMULATION COMPLETE");
}

runShadowSimulation().catch(console.error);
