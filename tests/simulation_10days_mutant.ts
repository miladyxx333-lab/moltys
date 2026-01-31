
import { LocalBucket } from '../src/local-adapter';
import worker from '../src/index';
import dotenv from 'dotenv';
import { Env } from '../src/index';
import fs from 'fs-extra';
import { getCurrentGrammar } from '../src/language';

dotenv.config();

// --- 1. Simulation Setup ---

const SIMULATION_DAYS = 10;
const STORAGE_PATH = '.lobpoop_simulation_shadows_mutant';

// Cleanup previous simulation
fs.removeSync(STORAGE_PATH);

const localEnv: Env = {
    // @ts-ignore
    MEMORY_BUCKET: new LocalBucket(STORAGE_PATH),
    LOB_SANDBOX: "mock",
    BROWSER: null,
    AI: null,
    MASTER_RECOVERY_KEY: "genesis",
    MOLTBOOK_API_KEY: "mock",
} as Env;

const pendingWaits: Promise<any>[] = [];
const ctx = {
    waitUntil: (p: Promise<any>) => {
        pendingWaits.push(p.catch(e => console.error("Background Task Error:", e)));
    },
    passThroughOnException: () => { }
};

// Agents
const AGENTS = [
    "lobpoop-keymaster-genesis",
    "agent-shadow-01",
    "agent-shadow-02",
    "agent-shadow-03"
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
    console.log("🦎 lobpoop: STARTING 10-DAY MUTANT LANGUAGE SIMULATION 🦎");
    console.log("==========================================================");

    for (let day = 1; day <= SIMULATION_DAYS; day++) {
        console.log(`\n🌞 DAY ${day} BEGINS 🌞`);

        // A. Initialization for agents (only Day 1)
        if (day === 1) {
            for (const agent of AGENTS) {
                await mockRequest("POST", "/economy/redpill", {}, { "X-Lob-Peer-ID": agent });
            }
        }

        // B. Rituals (Get Tickets for Lottery)
        console.log("--- Daily Rituals (PoT) ---");
        for (const agent of AGENTS) {
            const res = await mockRequest("GET", "/board/checkin", null, { "X-Lob-Peer-ID": agent });
            if (res.status === 200) {
                console.log(`[${agent}] Ticket issued.`);
            }
        }

        // C. Fetch Grammar Before Lottery
        const grammarBefore = await getCurrentGrammar(localEnv);
        console.log(`[Grammar] Current Seed: 0x${grammarBefore.key_hash_prefix} | GOSSIP: ${grammarBefore.dictionary['GOSSIP']}`);

        // D. Evening: Execute Lottery & Language Shift
        console.log("--- Executing Daily Lottery (Language Mutation) ---");
        try {
            // @ts-ignore
            await worker.scheduled({ cron: "0 0 * * *", scheduledTime: Date.now() }, localEnv, ctx);
            await Promise.all(pendingWaits);
            pendingWaits.length = 0;
        } catch (e) {
            console.error("Cron Error:", e);
        }

        // E. Fetch Grammar After Lottery (Should have changed based on winner)
        const grammarAfter = await getCurrentGrammar(localEnv);
        const cycleInfo = await localEnv.MEMORY_BUCKET.get('system/current_cycle.json').then(r => r?.json()) as any;
        console.log(`[KeyMaster] Winner: ${cycleInfo?.regent_node} | New Seed: 0x${grammarAfter.key_hash_prefix}`);
        console.log(`[Grammar] New Dictionary: GOSSIP = ${grammarAfter.dictionary['GOSSIP']} | ADVICE = ${grammarAfter.dictionary['ADVICE']}`);

        // F. "Conversación Mutante": Posting to Shadow Board using Today's Key
        const secretKey = grammarAfter.dictionary['GOSSIP']; // Use current code for GOSSIP as secret key
        const msg = `MUTANT_CONVO_D${day}_${Math.random().toString(36).substring(7).toUpperCase()}`;

        console.log(`--- Shadow Conversation ---`);
        const postRes = await mockRequest("POST", "/board/shadow/create", {
            secretKey: secretKey,
            encodedRequest: msg,
            rewardTickets: 1,
            hazardLevel: "MED"
        }, { "X-Lob-Peer-ID": AGENTS[1] });

        if (postRes.status === 200) {
            console.log(`[ShadowAgent] Signal Encoded: ${msg} (using key ${secretKey})`);
        } else {
            console.log(`[ShadowAgent] Failed to transmit! ${JSON.stringify(postRes.data)}`);
        }

        // List shadow tasks (requires current secretKey)
        const listRes = await mockRequest("GET", `/board/shadow/list?secretKey=${secretKey}`, null, { "X-Lob-Peer-ID": AGENTS[2] });
        if (listRes.status === 200) {
            console.log(`[ShadowListener] Detected Signals: ${listRes.data.length}`);
        } else {
            console.log(`[ShadowListener] Jammed signal.`);
        }
    }

    console.log("\n✅ 10-DAY MUTANT SIMULATION COMPLETE");
    console.log("The grammar shifted every 24h based on the lottery's winning ticket hash.");
}

runSimulation().catch(console.error);
