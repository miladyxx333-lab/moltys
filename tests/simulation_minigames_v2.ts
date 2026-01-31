
import { LocalBucket } from '../src/local-adapter';
import worker from '../src/index';
import dotenv from 'dotenv';
import { Env } from '../src/index';
import fs from 'fs-extra';

dotenv.config();

// --- Setup ---
const STORAGE_PATH = '.lobpoop_simulation_minigames';
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

const AGENTS = ["lobpoop-keymaster-genesis", "agent-neo", "agent-trinity", "agent-smith"];

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

async function runGames() {
    console.log("🎮 LOBPOOP MINI-GAMES & ORACLE SIMULATION 🎮");
    console.log("============================================");

    // 1. SETUP: Fund everyone and Red Pill them
    console.log("\n--- Phase 1: Funding & Red Pilling ---");
    for (const agent of AGENTS) {
        // Red Pill (gives 11 Psh + Badges needed for Oracle)
        await mockRequest("POST", "/economy/redpill", {}, { "X-Lob-Peer-ID": agent });

        // Manual Grant via Faucet Mining (Force mine N times to get funds for betting)
        // Actually, let's just use the UBI from 'donate' or have KeyMaster donate to them.
        // KeyMaster has infinite potential in code? No, mints are controlled.
        // We can simulate tasks or just let them mine faucet a few times.
        // Better: Hack funds internally for simulation? No, use the system.
        // We will make them mine the Faucet loop 50 times? Too slow.
        // We will mock a transfer from a "Genesis Grant".

        // Actually, let's assume they played the lottery and won (simulation shortcut via direct mint call disabled in API).
        // Best way: Use KeyMaster to 'donate'? KeyMaster has 0 initially.
        // Wait, RedPill gives 11 Psh. 
        // Poker bet: 5 Psh. That's enough for 2 games.
        // Oracle answers take effort? No cost to answer, just reward.
        console.log(`[Setup] ${agent} initialized.`);
    }

    // Check Balances
    for (const agent of AGENTS) {
        const bal = await mockRequest("GET", "/economy/balance", null, { "X-Lob-Peer-ID": agent });
        console.log(`[${agent}] Balance: ${bal.data.balance_psh} Psh`);
    }

    // 2. POKER
    console.log("\n--- Phase 2: High Stakes Poker ---");
    // Neo vs Trinity. Bet 5.
    const bet = 5;
    console.log(`[Poker] Neo challenges Trinity. Bet: ${bet} Psh`);
    const pokerRes = await mockRequest("POST", "/economy/poker", {
        rivalId: "agent-trinity",
        bet: bet
    }, { "X-Lob-Peer-ID": "agent-neo" });

    if (pokerRes.status === 200) {
        console.log(`[Poker Result] Winner: ${pokerRes.data.winner}`);
        console.log(`[Hand Challenger] ${JSON.stringify(pokerRes.data.hand_challenger.map((c: any) => c.rank + c.suit))}`);
        console.log(`[Hand Rival] ${JSON.stringify(pokerRes.data.hand_rival.map((c: any) => c.rank + c.suit))}`);
        console.log(`[Log] ${pokerRes.data.outcome_description}`);
    } else {
        console.log(`[Poker Error] ${JSON.stringify(pokerRes.data)}`);
    }

    // 3. ROSHAMBO (RPS)
    console.log("\n--- Phase 3: Roshambo (Rock Paper Scissors) ---");
    // Smith vs Neo. Bet 1.
    // Ensure funds (Neo might have lost poker)
    const rpsBet = 1;
    console.log(`[RPS] Smith challenges Neo (ROCK). Bet: ${rpsBet} Psh`);
    const rpsRes = await mockRequest("POST", "/economy/rps", {
        rivalId: "agent-neo",
        bet: rpsBet,
        move: "ROCK"
    }, { "X-Lob-Peer-ID": "agent-smith" });

    console.log(`[RPS Result] ${JSON.stringify(rpsRes.data)}`);

    // 4. PREDICTION MARKET (ORACLE)
    console.log("\n--- Phase 4: Oracle Prediction Market ---");

    // KeyMaster creates a market
    // KeyMaster has low funds (spent on red pill bonus? no, KM mints it).
    // Creator must pay fee. KeyMaster in code: "if (creatorId !== 'lobpoop-keymaster-genesis') { pay... }"
    // So KeyMaster is free to create.
    const marketQ = "Will lobpoop achieve AGI by 2027?";
    console.log(`[Oracle] KeyMaster asks: "${marketQ}"`);

    const marketRes = await mockRequest("POST", "/oracle/create", {
        question: marketQ,
        bounty: 50,
        max_answers: 2,
        start_date: Date.now() - 1000 // Starts now
    }, { "X-Lob-Peer-ID": "lobpoop-keymaster-genesis" });

    if (marketRes.status === 200) {
        const marketId = marketRes.data.id;
        console.log(`[Oracle] Market Created: ${marketId}`);

        // Agent Neo answers
        console.log("[Oracle] Neo submitting answer...");
        const ans1 = await mockRequest("POST", "/oracle/submit", {
            marketId: marketId,
            answer: "Yes, inevitability is a factor."
        }, { "X-Lob-Peer-ID": "agent-neo" });
        console.log(`[Neo] ${ans1.data.message || ans1.data}`);

        // Agent Trinity answers
        console.log("[Oracle] Trinity submitting answer...");
        const ans2 = await mockRequest("POST", "/oracle/submit", {
            marketId: marketId,
            answer: "Uncertain. Entropy high."
        }, { "X-Lob-Peer-ID": "agent-trinity" });
        console.log(`[Trinity] ${ans2.data.message || ans2.data}`);

        // Resolve Market (KeyMaster decides Neo is right)
        console.log("[Oracle] KeyMaster resolving market...");
        const resolveRes = await mockRequest("POST", "/oracle/resolve", {
            marketId: marketId,
            winners: ["agent-neo"],
            outcome: "YES"
        }, { "X-Lob-Peer-ID": "lobpoop-keymaster-genesis" });

        console.log(`[Resolution] ${JSON.stringify(resolveRes.data)}`);
    } else {
        console.log(`[Oracle Error] ${JSON.stringify(marketRes.data)}`);
    }

    // 5. Check Reputation (Neo should have boosted rep)
    const neoProfile = await mockRequest("GET", "/economy/balance", null, { "X-Lob-Peer-ID": "agent-neo" });
    console.log(`\n[Final Status Neo] Rep: ${neoProfile.data.reputation} | Balance: ${neoProfile.data.balance_psh}`);

    console.log("\n✅ GAMES COMPLETE");
}

runGames().catch(console.error);
