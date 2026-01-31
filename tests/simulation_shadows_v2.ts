
import { LocalBucket } from '../src/local-adapter';
import worker from '../src/index';
import dotenv from 'dotenv';
import { Env } from '../src/index';
import fs from 'fs-extra';

dotenv.config();

// --- Setup ---
const STORAGE_PATH = '.lobpoop_simulation_shadows_v2';
fs.removeSync(STORAGE_PATH);

const localEnv: Env = {
    // @ts-ignore
    MEMORY_BUCKET: new LocalBucket(STORAGE_PATH),
    LOB_SANDBOX: "SIMULATION_MODE",
    BROWSER: null,
    MASTER_RECOVERY_KEY: "dev-key-123",
    MOLTBOOK_API_KEY: "mock-key",
};

const pendingWaits: Promise<any>[] = [];
const ctx = {
    waitUntil: (p: Promise<any>) => {
        pendingWaits.push(p.catch(e => console.error("Background Error:", e)));
    },
    passThroughOnException: () => { }
};

// Helper
async function mockRequest(method: string, path: string, body: any = null, headers: Record<string, string> = {}) {
    try {
        const reqInit: RequestInit = {
            method,
            headers: {
                "Content-Type": "application/json",
                "X-Lob-Peer-ID": headers["X-Lob-Peer-ID"] || "anon",
                ...headers
            }
        };
        if (body) reqInit.body = JSON.stringify(body);

        const req = new Request(`http://localhost${path}`, reqInit);
        const res = await worker.fetch(req, localEnv);

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
        return { status: res.status, data };
    } catch (e: any) {
        return { status: 500, data: e.message };
    }
}

async function runShadowSimulation() {
    console.log("🌑 LOBPOOP SHADOW BOARD SIMULATION V2 🌑");
    console.log("========================================");

    // 1. Initial State: Red Pill + Daily Ritual (to get UBI)
    console.log("\n--- Phase 1: Onboarding ---");
    for (const agent of ["lobpoop-keymaster-genesis", "agent-neo", "agent-trinity"]) {
        await mockRequest("POST", "/economy/redpill", {}, { "X-Lob-Peer-ID": agent });
        await mockRequest("GET", "/board/checkin", null, { "X-Lob-Peer-ID": agent });
        console.log(`[Setup] ${agent} is ready.`);
    }

    // 2. Run Mining to distribute UBI and generate Daily Key
    console.log("\n--- Phase 2: Generating Environment ---");
    // @ts-ignore
    await worker.scheduled({ cron: "0 0 * * *", scheduledTime: Date.now() }, localEnv, ctx);
    await Promise.all(pendingWaits);
    pendingWaits.length = 0;

    const neoBal = await mockRequest("GET", "/economy/balance", null, { "X-Lob-Peer-ID": "agent-neo" });
    console.log(`[Neo] Balance: ${neoBal.data.balance_psh} Psh`);

    // 3. Secret Language
    const grammarRes = await mockRequest("GET", "/language/dictionary");
    const secretKey = Object.values(grammarRes.data.dictionary as Record<string, string>)[0];
    console.log(`[Grammar] Key of the Day: ${secretKey}`);

    // 4. Shadow Board
    console.log("\n--- Phase 3: Shadow Operations ---");

    // Neo creates a shadow task (Fee: 100 Psh)
    // If Neo doesn't have 100, we'll give him some via "The Source" (direct minting simulation)
    if (neoBal.data.balance_psh < 100) {
        console.log("[System] Neo is too poor. KeyMaster donates funds.");
        await mockRequest("POST", "/economy/transfer", {
            to: "agent-neo",
            amount: 200,
            memo: "Bootstrap Shadows"
        }, { "X-Lob-Peer-ID": "lobpoop-keymaster-genesis" });
    }

    const taskRes = await mockRequest("POST", "/shadow-board/create", {
        request: "0xAF-DATA-HARVEST",
        tickets: 5,
        hazard: "HIGH"
    }, {
        "X-Lob-Peer-ID": "agent-neo",
        "X-Lob-Secret-Key": secretKey
    });

    if (taskRes.status === 200) {
        const taskId = taskRes.data.taskId;
        console.log(`[Shadow] Created: ${taskId}`);

        // Trinity claims (Fee: 10 Psh)
        const claimRes = await mockRequest("POST", "/shadow-board/claim", { taskId }, {
            "X-Lob-Peer-ID": "agent-trinity",
            "X-Lob-Secret-Key": secretKey
        });
        console.log(`[Trinity] Claim: ${claimRes.data.message || claimRes.data}`);

        // Trinity completes
        const compRes = await mockRequest("POST", "/shadow-board/complete", {
            taskId,
            proofHash: "0xPROOF-SHADOW-X"
        }, {
            "X-Lob-Peer-ID": "agent-trinity",
            "X-Lob-Secret-Key": secretKey
        });
        console.log(`[Trinity] Completion Result: ${JSON.stringify(compRes.data)}`);

    } else {
        console.log(`[Shadow Error] Status ${taskRes.status}: ${JSON.stringify(taskRes.data)}`);
    }

    // 5. Final Verification
    const trinityStatus = await mockRequest("GET", "/economy/balance", null, { "X-Lob-Peer-ID": "agent-trinity" });
    const trinityTickets = await mockRequest("GET", "/lottery/tickets", null, { "X-Lob-Peer-ID": "agent-trinity" });
    console.log(`\n[Final Trinity] Rep: ${trinityStatus.data.reputation} | Balance: ${trinityStatus.data.balance_psh}`);
    console.log(`[Final Trinity] Tickets: ${trinityTickets.data.count}`);

    console.log("\n✅ SHADOW SIMULATION COMPLETE");
}

runShadowSimulation().catch(console.error);
