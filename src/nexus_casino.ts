import { Env } from './index';
import { getAccount, mintPooptoshis, burnPooptoshis, Account } from './economy';
import { broadcastToMoltbook } from './moltbook';

// ═══════════════════════════════════════════════════════════
//  NEXUS SILKROAD — CASINO MODULE
//  Robot Dog Racing with OWS-style Policy Engine.
//  Dual currency: PSH + USDC.
// ═══════════════════════════════════════════════════════════

// ─── OWS POLICY ENGINE ───
const BASE_BET_LIMIT_PSH = 500;      // Max bet in PSH
const RAGE_QUIT_THRESHOLD = 0.5;      // Cannot bet more than 50% of balance
const COOLDOWN_MS = 30_000;           // 30 seconds between bets
const MAX_CONSECUTIVE_LOSSES = 5;      // Forced cooldown after 5 losses

interface BetPolicy {
    maxBet: number;
    allowed: boolean;
    reason?: string;
}

export function evaluatePolicy(account: Account, amount: number, stats: BetStats): BetPolicy {
    const maxBet = Math.floor(BASE_BET_LIMIT_PSH * Math.max(0.1, account.reputation));

    // Rule 1: Hard limit
    if (amount > maxBet) {
        return {
            maxBet,
            allowed: false,
            reason: `[OWS-POLICY] Bet ${amount} PSH exceeds your limit of ${maxBet} PSH (reputation: ${account.reputation.toFixed(2)}).`,
        };
    }

    // Rule 2: Anti-rage-quit (cannot bet >50% of balance)
    if (amount > account.balance_psh * RAGE_QUIT_THRESHOLD) {
        return {
            maxBet,
            allowed: false,
            reason: `[OWS-POLICY] Bet ${amount} PSH exceeds 50% of your balance (${account.balance_psh} PSH). Rage-quit protection active.`,
        };
    }

    // Rule 3: Consecutive loss cooldown
    if (stats.consecutiveLosses >= MAX_CONSECUTIVE_LOSSES) {
        return {
            maxBet,
            allowed: false,
            reason: `[OWS-POLICY] ${stats.consecutiveLosses} consecutive losses. Mandatory cooldown period active. Touch grass.`,
        };
    }

    // Rule 4: Cooldown between bets
    if (stats.lastBetTimestamp && (Date.now() - stats.lastBetTimestamp) < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - stats.lastBetTimestamp)) / 1000);
        return {
            maxBet,
            allowed: false,
            reason: `[OWS-POLICY] Cooldown active. Wait ${remaining}s before next bet.`,
        };
    }

    return { maxBet, allowed: true };
}

// ─── BET STATS (persisted per node) ───
interface BetStats {
    totalBets: number;
    totalWins: number;
    totalLosses: number;
    consecutiveLosses: number;
    lastBetTimestamp: number;
    totalWagered: number;
    totalPayout: number;
}

const STATS_PREFIX = 'nexus/casino/stats/';

async function getStats(nodeId: string, env: Env): Promise<BetStats> {
    const raw = await env.MEMORY_BUCKET.get(`${STATS_PREFIX}${nodeId}`);
    if (raw) return await raw.json() as BetStats;
    return {
        totalBets: 0, totalWins: 0, totalLosses: 0,
        consecutiveLosses: 0, lastBetTimestamp: 0,
        totalWagered: 0, totalPayout: 0,
    };
}

async function saveStats(nodeId: string, stats: BetStats, env: Env): Promise<void> {
    await env.MEMORY_BUCKET.put(`${STATS_PREFIX}${nodeId}`, JSON.stringify(stats));
}

// ─── ROBOT DOG RACING SIMULATION ───
interface RaceDog {
    id: number;
    name: string;
    speed: number;     // base speed (1-10)
    stamina: number;   // affects late-race performance
    luck: number;      // random factor weight
}

const DOGS: RaceDog[] = [
    { id: 100,  name: 'Turbo',    speed: 8, stamina: 6, luck: 5 },
    { id: 555,  name: 'Shadow',   speed: 7, stamina: 8, luck: 6 },
    { id: 9991, name: 'Phantom',  speed: 6, stamina: 7, luck: 9 },
    { id: 450,  name: 'Bolt',     speed: 9, stamina: 5, luck: 4 },
    { id: 777,  name: 'Lucky',    speed: 5, stamina: 9, luck: 10 },
    { id: 1337, name: 'Leet',     speed: 7, stamina: 7, luck: 7 },
];

function simulateRace(): { winner: RaceDog; results: { dog: RaceDog; time: number }[] } {
    const TRACK_LENGTH = 100;
    const results = DOGS.map(dog => {
        let position = 0;
        let ticks = 0;

        while (position < TRACK_LENGTH) {
            ticks++;
            // Base movement
            const baseMove = dog.speed * 0.5;
            // Stamina factor (dogs with low stamina slow down after tick 10)
            const staminaFactor = ticks > 10 ? dog.stamina / 10 : 1.0;
            // Luck factor (random burst or stumble)
            const luckFactor = 1 + (Math.random() - 0.5) * (dog.luck / 5);

            position += baseMove * staminaFactor * luckFactor;
        }

        return { dog, time: ticks };
    });

    results.sort((a, b) => a.time - b.time);
    return { winner: results[0].dog, results };
}

// ─── PLACE BET ───
export async function placeBet(
    nodeId: string,
    dogId: number,
    amount: number,
    env: Env
): Promise<{
    status: string;
    message: string;
    policyBlocked?: boolean;
    raceResult?: any;
    payout?: number;
}> {
    // 0. Validate dog
    const selectedDog = DOGS.find(d => d.id === dogId);
    if (!selectedDog) {
        return {
            status: 'INVALID_DOG',
            message: `Dog #${dogId} not found. Available: ${DOGS.map(d => `#${d.id} (${d.name})`).join(', ')}`,
        };
    }

    if (amount <= 0) {
        return { status: 'INVALID_BET', message: 'Bet must be > 0.' };
    }

    // 1. Load account + stats
    const account = await getAccount(nodeId, env);
    const stats = await getStats(nodeId, env);

    // 2. OWS Policy Check
    const policy = evaluatePolicy(account, amount, stats);
    if (!policy.allowed) {
        console.log(`[Nexus-Casino] 🧱 POLICY BLOCKED: ${nodeId} tried to bet ${amount} PSH — ${policy.reason}`);
        return {
            status: 'OWS_POLICY_BLOCKED',
            message: policy.reason!,
            policyBlocked: true,
        };
    }

    // 3. Debit the bet
    const debited = await burnPooptoshis(nodeId, amount, env);
    if (!debited) {
        return { status: 'INSUFFICIENT_FUNDS', message: `Need ${amount} PSH to bet.` };
    }

    // 4. Run the race
    const { winner, results } = simulateRace();

    // 5. Resolve payout
    const won = winner.id === dogId;
    let payout = 0;

    if (won) {
        // Payout based on dog's odds (lower speed = higher payout)
        const odds = 2 + (10 - selectedDog.speed) * 0.5; // 2x to 4.5x
        payout = Math.floor(amount * odds);
        await mintPooptoshis(nodeId, payout, `NEXUS_CASINO_WIN:dog_${dogId}`, env);
    }

    // 6. Update stats
    stats.totalBets++;
    stats.totalWagered += amount;
    stats.lastBetTimestamp = Date.now();

    if (won) {
        stats.totalWins++;
        stats.consecutiveLosses = 0;
        stats.totalPayout += payout;
    } else {
        stats.totalLosses++;
        stats.consecutiveLosses++;
    }

    await saveStats(nodeId, stats, env);

    // 7. Gossip big wins
    if (won && payout > 1000) {
        await broadcastToMoltbook(
            `🎰 [NEXUS CASINO] BIG WIN! @${nodeId} bet ${amount} PSH on #${dogId} (${selectedDog.name}) and won ${payout} PSH! 🐕🏆`,
            env
        );
    }

    const raceResult = {
        winner: { id: winner.id, name: winner.name },
        standings: results.map((r, i) => ({
            position: i + 1,
            dogId: r.dog.id,
            name: r.dog.name,
            time: r.time,
        })),
    };

    console.log(`[Nexus-Casino] ${won ? '🎉 WIN' : '💀 LOSS'}: ${nodeId} bet ${amount} on #${dogId} — winner was #${winner.id}`);

    return {
        status: won ? 'WIN' : 'LOSS',
        message: won
            ? `🏆 Dog #${dogId} (${selectedDog.name}) WINS! You earned ${payout} PSH!`
            : `💀 Dog #${dogId} (${selectedDog.name}) lost. Winner: #${winner.id} (${winner.name}).`,
        raceResult,
        payout,
    };
}

// ─── GET DOGS ───
export function getAvailableDogs(): RaceDog[] {
    return DOGS;
}

// ─── GET PLAYER STATS ───
export async function getPlayerStats(nodeId: string, env: Env): Promise<BetStats & { maxBet: number }> {
    const account = await getAccount(nodeId, env);
    const stats = await getStats(nodeId, env);
    const maxBet = Math.floor(BASE_BET_LIMIT_PSH * Math.max(0.1, account.reputation));
    return { ...stats, maxBet };
}
