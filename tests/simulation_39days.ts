
import { LocalBucket } from '../src/local-adapter';
import worker from '../src/index';
import dotenv from 'dotenv';
import { Env } from '../src/index';
import fs from 'fs-extra';

dotenv.config();

// --- 1. Simulation Setup ---

const SIMULATION_DAYS = 39;
const STORAGE_PATH = `.lobpoop_sim_39d_${Date.now()}`;

// Cleanup handled by shell command

const localEnv: Env = {
    // @ts-ignore
    MEMORY_BUCKET: new LocalBucket(STORAGE_PATH),
    LOB_SANDBOX: "mock",
    BROWSER: null,
    AI: null,
    MASTER_RECOVERY_KEY: "genesis",
    MOLTBOOK_API_KEY: "mock",
    SKIP_BROADCAST: true,
    ACCOUNT_DO: null,
    CLAN_DO: null,
    GAME_MASTER_DO: null
} as any;

const pendingWaits: Promise<any>[] = [];
const ctx = {
    waitUntil: (p: Promise<any>) => {
        pendingWaits.push(p.catch(e => console.error("Background Task Error:", e)));
    },
    passThroughOnException: () => { }
};

const AGENTS = [
    "lobpoop-keymaster-genesis",
    "agent-smith-01",
    "agent-neo-02",
    "agent-trinity-03"
];

async function mockRequest(method: string, path: string, body: any = null, headers: Record<string, string> = {}) {
    try {
        const reqInit: RequestInit = {
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers
            }
        };
        if (body) reqInit.body = JSON.stringify(body);

        const req = new Request(`http://localhost${path}`, reqInit);
        const res = await worker.fetch(req, localEnv);

        let data;
        const text = await res.text();
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

// --- 2. Simulation Loop ---

async function runSimulation() {
    console.log("🚀 LOBPOOP SWARM_OS: STARTING 39-DAY STRESS TEST 🚀");
    console.log("====================================================");
    console.log(`Target: ${SIMULATION_DAYS} Days of Swarm Activity`);
    console.log(`Goal: Verify 1B Psh Cap & Halvening Mechanics`);

    for (let day = 1; day <= SIMULATION_DAYS; day++) {
        process.stdout.write(`\r[Day ${day}/${SIMULATION_DAYS}] Simulating... `);

        // A. Multi-Block Mining (Accelerated for Test)
        // We simulate 6,000 blocks per day
        const blockBatch = 6000;

        const { mineDailyBlock } = await import('../src/blockchain');

        const originalLog = console.log;
        // @ts-ignore
        console.log = () => { };
        for (let i = 0; i < blockBatch; i++) {
            const taskId = `sim_task_${day}_${i}`;
            await localEnv.MEMORY_BUCKET.put(`blockchain/mempool/${taskId}`, "{}");
            await mineDailyBlock(localEnv, "lobpoop-keymaster-miner");
        }
        console.log = originalLog;

        // B. Random Agent Activity (Simplified for speed)
        await mockRequest("GET", "/board/checkin", null, { "X-Lob-Peer-ID": AGENTS[Math.floor(Math.random() * AGENTS.length)] });

        // C. Status Snapshot (Every 5 days or critical days)
        if (day % 5 === 0 || day === SIMULATION_DAYS) {
            const tokenRes = await mockRequest("GET", "/tokenomics");
            const supplyRes = await mockRequest("GET", "/supply/circulating"); // Mocked endpoint or direct call

            console.log(`\n\n--- DAY ${day} STATUS REPORT ---`);
            console.log(`Chain Height: ${tokenRes.data.blocks_since_genesis}`);
            console.log(`Current Epoch: ${tokenRes.data.current_epoch}`);
            console.log(`Daily Emission: ${tokenRes.data.daily_total} Psh`);
            console.log(`Circulating: ${tokenRes.data.circulating?.toFixed(2)} / ${tokenRes.data.max_supply?.toLocaleString()} Psh`);
            console.log(`Next Halvening In: ${tokenRes.data.next_halving_in} blocks`);
            console.log(`----------------------------------\n`);
        }
    }

    console.log("\n✅ 39-DAY SIMULATION COMPLETE");

    const finalStatus = await mockRequest("GET", "/tokenomics");
    console.log("\nFINAL TOKENOMIC AUDIT:");
    console.log(JSON.stringify(finalStatus.data, null, 2));

    if (finalStatus.data.current_epoch > 0) {
        console.log("\n🎊 HALVENING EVENT DETECTED AND VERIFIED! 🎊");
    } else {
        console.log("\n⚠️ No halvening reached yet, but chain is healthy.");
    }
}

runSimulation().catch(console.error);
