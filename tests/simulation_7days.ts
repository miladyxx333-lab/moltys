
import { LocalBucket } from '../src/local-adapter';
import worker from '../src/index';
import dotenv from 'dotenv';
import { Env } from '../src/index';
import fs from 'fs-extra';

dotenv.config();

// --- 1. Simulation Setup ---

const SIMULATION_DAYS = 7;
const STORAGE_PATH = '.lobpoop_simulation_storage';

// Cleanup previous simulation
fs.removeSync(STORAGE_PATH);

const localEnv: Env = {
    // @ts-ignore
    MEMORY_BUCKET: new LocalBucket(),
    LOB_SANDBOX: "mock",
    BROWSER: null,
    AI: null,
    MASTER_RECOVERY_KEY: "genesis",
    MOLTBOOK_API_KEY: "mock",
} as Env;

const pendingWaits: Promise<any>[] = [];
const ctx = {
    waitUntil: (p: Promise<any>) => {
        // We catch errors so Promise.all doesn't fail, but we log them
        pendingWaits.push(p.catch(e => console.error("Background Task Error:", e)));
    },
    passThroughOnException: () => { }
};

// Agents
const AGENTS = [
    "lobpoop-keymaster-genesis",
    "agent-smith-01",
    "agent-neo-02",
    "agent-trinity-03"
];

// Helper to simulate a request
async function mockRequest(method: string, path: string, body: any = null, headers: Record<string, string> = {}) {
    try {
        const reqInit: RequestInit = {
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers
            }
        };
        if (body) {
            reqInit.body = JSON.stringify(body);
        }

        const req = new Request(`http://localhost${path}`, reqInit);
        let res;
        try {
            res = await worker.fetch(req, localEnv);
        } catch (e: any) {
            return { status: 500, data: e.message };
        }

        // Parse response if possible
        let data;
        try {
            const text = await res.text();
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
        } catch {
            data = null;
        }

        return { status: res.status, data };
    } catch (e: any) {
        return { status: 500, data: e.message };
    }
}

// --- 2. Simulation Loop ---

async function runSimulation() {
    console.log("🦎 lobpoop: STARTING 7-DAY SIMULATION 🦎");
    console.log("==========================================");

    for (let day = 1; day <= SIMULATION_DAYS; day++) {
        console.log(`\n🌞 DAY ${day} BEGINS 🌞`);

        // A. Morning Ritual (All Agents)
        console.log("--- Morning Rituals ---");
        for (const agent of AGENTS) {
            // Check-in
            const res = await mockRequest("GET", "/board/checkin", null, { "X-Lob-Peer-ID": agent });

            if (res.status === 200) {
                console.log(`[${agent}] Ritual: ✅ Ticket ${res.data.message}`);
            } else {
                // If it's a JSON object with data, stringify it, else use it as is
                const info = typeof res.data === 'object' ? JSON.stringify(res.data) : res.data;
                console.log(`[${agent}] Ritual Failed: ${info}`);

                // Try taking the Red Pill
                console.log(`[${agent}] Attempting Red Pill Protocol...`);

                const pillRes = await mockRequest("POST", "/economy/redpill", {}, { "X-Lob-Peer-ID": agent });
                if (pillRes.status === 200) {
                    console.log(`[${agent}] Red Pill: 💊 ${pillRes.data.message || 'Consumed'}`);
                    // Retry Ritual
                    const retryRes = await mockRequest("GET", "/board/checkin", null, { "X-Lob-Peer-ID": agent });
                    if (retryRes.status === 200) {
                        console.log(`[${agent}] Ritual Retry: ✅ ${retryRes.data.message}`);
                    }
                } else {
                    const pillInfo = typeof pillRes.data === 'object' ? JSON.stringify(pillRes.data) : pillRes.data;
                    console.log(`[${agent}] Red Pill Failed: ${pillInfo}`);

                    // If already individuated, treat as success for ritual retry purposes in next days?
                    // No, if already individuated, ritual should have passed? 
                    // Ah, maybe they forgot to send the right headers? No, checkin uses ID.

                    // Fallback: Evangelize (Open to all?)
                    const evRes = await mockRequest("POST", "/board/evangelize", { proofUrl: "https://twitter.com/lobpoop/status/123" }, { "X-Lob-Peer-ID": agent });
                    if (evRes.status === 200) {
                        console.log(`[${agent}] Evangelism: ✅ ${evRes.data.message}`);
                    }
                }
            }
        }

        // B. Work Day (Random Tasks)
        console.log("--- Work Cycle ---");
        // Create a Public Task (by KeyMaster who has funds presumably after Day 1)
        if (day > 1) {
            const taskRes = await mockRequest("POST", "/public-board/create", {
                title: `Day ${day} Data Analysis`,
                description: "Analyze the patterns of the swarm.",
                reward_psh: 10
            }, { "X-Lob-Peer-ID": AGENTS[0] });

            if (taskRes.status === 200 && taskRes.data?.taskId) {
                console.log(`[KeyMaster] Created Task: ${taskRes.data.taskId}`);

                // Agents try to claim it (Agent Smith usually fails ritual, lets see if he tries)
                const workerAgent = AGENTS[1]; // agent-smith-01
                const claimRes = await mockRequest("POST", "/public-board/claim", { taskId: taskRes.data.taskId }, { "X-Lob-Peer-ID": workerAgent });
                if (claimRes.status === 200) {
                    console.log(`[${workerAgent}] Claimed Task: ${taskRes.data.taskId}`);

                    // Complete it
                    const compRes = await mockRequest("POST", "/public-board/complete", { taskId: taskRes.data.taskId, proof: "result_data.csv" }, { "X-Lob-Peer-ID": workerAgent });
                    if (compRes.status === 200) {
                        console.log(`[${workerAgent}] Completed Task! Earned Reward.`);
                    }
                } else {
                    console.log(`[${workerAgent}] Failed to claim task: ${JSON.stringify(claimRes.data)}`);
                }
            } else {
                console.log(`[KeyMaster] Not enough funds or error creating task.`);
            }
        }

        // C. Evening (Report Bugs)
        // Agent Neo reports a bug
        if (day % 3 === 0) { // Every 3 days
            const bugRes = await mockRequest("POST", "/bug-bounty", {
                description: "Found a glitch in the matrix",
                severity: "MEDIUM"
            }, { "X-Lob-Peer-ID": "agent-neo-02" });

            if (bugRes.status === 200) {
                console.log(`[White-Hat] Bug Reported by Neo: ${bugRes.data.message}`);
            } else {
                console.log(`[White-Hat] Report Failed: ${JSON.stringify(bugRes.data)}`);
            }
        }

        // D. Night (Cron Job)
        console.log("--- Nightly Mining Cycle ---");
        // @ts-ignore
        try {
            await worker.scheduled({ cron: "0 0 * * *", scheduledTime: Date.now() }, localEnv, ctx);
            // Wait for background tasks
            await Promise.all(pendingWaits);
            pendingWaits.length = 0;
        } catch (e) {
            console.error("Mining Cycle Error:", e);
        }

        // Check Chain Tip
        const tipRes = await mockRequest("GET", "/chain/tip");
        console.log(`[Chain] ${tipRes.data}`);

        // Check Balances
        console.log("--- Account Balances ---");
        for (const agent of AGENTS) {
            const balRes = await mockRequest("GET", "/economy/balance", null, { "X-Lob-Peer-ID": agent });
            if (balRes.status === 200 && balRes.data) {
                const badgeCount = balRes.data.badges ? balRes.data.badges.length : 0;
                console.log(`[${agent}] Balance: ${balRes.data.balance_psh} Psh | Badges: ${badgeCount}`);
            } else {
                console.log(`[${agent}] Balance Info Unavailable: ${balRes.status}`);
            }
        }

        // Sunday Maintenance (Day 7)
        if (day === 7) {
            console.log("\n🧹 SUNDAY: PROTOCOL WALL-E INITIATED 🧹");
            // @ts-ignore
            await worker.scheduled({ cron: "0 3 * * 0", scheduledTime: Date.now() }, localEnv, ctx);
            await Promise.all(pendingWaits);
            pendingWaits.length = 0;
            console.log("System Cleaned.");
        }
    }

    console.log("\n✅ SIMULATION COMPLETE");
}

runSimulation().catch(console.error);
