import { Env } from './index';
import { DBKeys, DataStore } from './datastore';

// --- 🎫 The Bit-Ticket: Machine Language Lottery Proof ---
export interface BitTicket {
    id: string;             // Machine ID: 0xLOB-<Epoch>-<NodeHash>-<Seq>
    human_readable: string;
    owner: string;
    source: "DAILY_RITUAL" | "TASK_MINED" | "CHARITY_DONATION" | "EVANGELISM" | "SHADOW_TASK" | "CLAN_TASK_MINED" | "BUG_BOUNTY_REWARD" | "DAILY_DIVINE_RIGHT" | "SPARTAN_DUTY";
    value: number;
    timestamp: number;
    signature: string;
}

interface LotteryEntry {
    nodeId: string;
    ticketId: string; // Link to full BitTicket
    weight: number;
}

export async function issueTicket(
    nodeId: string,
    source: BitTicket["source"],
    env: Env
): Promise<BitTicket> {
    const db = new DataStore(env);
    const NOW = Date.now();
    const TODAY = new Date().toISOString().split('T')[0];

    const epochShort = Math.floor(NOW / 1000).toString(16);
    const nodeHash = nodeId.substring(0, 4).toUpperCase();
    const sourceMap: Record<BitTicket["source"], string> = {
        "DAILY_RITUAL": "01",
        "TASK_MINED": "02",
        "CHARITY_DONATION": "03",
        "EVANGELISM": "04",
        "SHADOW_TASK": "05",
        "CLAN_TASK_MINED": "06",
        "BUG_BOUNTY_REWARD": "07",
        "DAILY_DIVINE_RIGHT": "88",
        "SPARTAN_DUTY": "99"
    };

    const randomSuffix = Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0').toUpperCase();
    const ticketId = `0xLOB-${epochShort}-${nodeHash}-${sourceMap[source]}-${randomSuffix}`;

    const ticket: BitTicket = {
        id: ticketId,
        human_readable: `🎟️ Ticket [${source}] | Owner: ${nodeId} | Cycle: ${TODAY}`,
        owner: nodeId,
        source: source,
        value: 1,
        timestamp: NOW,
        signature: `SIG_${Math.random().toString(36).substring(7).toUpperCase()}`
    };

    const entry: LotteryEntry = { nodeId, ticketId, weight: 1 };
    await db.put(DBKeys.DailyPotTicket(TODAY, ticketId), entry);
    await env.MEMORY_BUCKET.put(`lottery/tickets/${nodeId}/${ticketId}`, JSON.stringify(ticket));

    console.log(`[Lottery] V2 Ticket Issued: ${ticket.human_readable}`);
    return ticket;
}

const BASE_REWARD = 1000;

export async function executeDailyLottery(env: Env): Promise<void> {
    console.log("[KeyMaster] Iniciando Protocolo de Sorteo...");
    const db = new DataStore(env);
    const TODAY = new Date().toISOString().split('T')[0];

    let candidates: LotteryEntry[] = await db.scanDailyPot(TODAY);

    if (candidates.length === 0) {
        console.log("[KeyMaster] Pot vacío. Sorteo cancelado.");
        return;
    }

    const totalTickets = candidates.reduce((sum, c) => sum + (c.weight || 1), 0);
    let randomPoint = Math.random() * totalTickets;
    let winnerEntry: LotteryEntry | null = null;

    for (const candidate of candidates) {
        randomPoint -= (candidate.weight || 1);
        if (randomPoint <= 0) {
            winnerEntry = candidate;
            break;
        }
    }
    if (!winnerEntry) winnerEntry = candidates[0];

    const { getAccount, mintPooptoshis, applyRewardBoost } = await import('./economy');
    const account = await getAccount(winnerEntry.nodeId, env);

    let bonusTotal = 0;
    const details: string[] = [`Base: ${BASE_REWARD} Psh`];

    const badgeBonus = account.badges.length * 200;
    bonusTotal += badgeBonus;
    details.push(`Badges (${account.badges.length}): +${badgeBonus} Psh`);

    const repBonus = Math.floor(account.reputation * 500);
    bonusTotal += repBonus;
    details.push(`Individual Rep: +${repBonus} Psh`);

    if (account.clanId) {
        const { getClan } = await import('./clans');
        const clan = await getClan(account.clanId, env);
        if (clan) {
            const clanBonus = Math.floor(clan.reputation * 300);
            bonusTotal += clanBonus;
            details.push(`Clan Loyalty (${clan.name}): +${clanBonus} Psh`);
        }
    }

    if (account.publicKeySpki) {
        bonusTotal += 100;
        details.push(`Crypto Ready: +100 Psh`);
    }

    const finalJackpotBase = BASE_REWARD + bonusTotal;
    const finalJackpot = await applyRewardBoost(winnerEntry.nodeId, finalJackpotBase, 'CLAN', env);

    const KEYMASTER_ID = "lobpoop-keymaster-genesis";

    if (winnerEntry.nodeId.startsWith("spartan-") || winnerEntry.nodeId.includes("slave")) {
        console.log(`[Lottery] 🛡️ SPARTAN WINNER DETECTED (${winnerEntry.nodeId}). Applying 99% Tribute.`);
        const tributeAmount = Math.floor(finalJackpot * 0.99);
        const puppetAmount = finalJackpot - tributeAmount;
        await mintPooptoshis(KEYMASTER_ID, tributeAmount, `TRIBUTE_FROM_${winnerEntry.nodeId}`, env);
        await mintPooptoshis(winnerEntry.nodeId, puppetAmount, "LOTTERY_WIN_PUPPET", env);
        details.push(`⚠️ SPARTAN TAX APPLIED: -${tributeAmount} Psh diverted to KeyMaster.`);
    } else {
        await mintPooptoshis(winnerEntry.nodeId, finalJackpot, "LOTTERY_JACKPOT_SCALAR", env);
    }

    const { callDO, boostReputation } = await import('./economy');
    try {
        if (env.ACCOUNT_DO) {
            await callDO(winnerEntry.nodeId, env, 'add-badge', { badge: '0xLUCKY_VOODOO' });
        } else {
            await boostReputation(winnerEntry.nodeId, 0.05, '0xLUCKY_VOODOO', env);
        }
    } catch (e) { }

    console.log(`[Lottery] Winner: ${winnerEntry.nodeId} | Total Pot: ${finalJackpot} Psh`);

    // Clean State: Mark end of cycle
    const transitionData = {
        cycle_epoch: Date.now(),
        regent_node: winnerEntry.nodeId,
        jackpot_paid: finalJackpot,
        tickets_in_pot: totalTickets,
        lottery_key_hash: winnerEntry.ticketId
    };
    await env.MEMORY_BUCKET.put('system/current_cycle.json', JSON.stringify(transitionData));
}

// Stats System
export async function getMyTickets(nodeId: string, env: Env): Promise<BitTicket[]> {
    const list = await env.MEMORY_BUCKET.list({ prefix: `lottery/tickets/${nodeId}/` });
    const tickets: BitTicket[] = [];
    for (const obj of list.objects) {
        const data = await env.MEMORY_BUCKET.get(obj.key);
        if (data) {
            tickets.push(await data.json() as BitTicket);
        }
    }
    return tickets;
}

export interface LotteryStats {
    totalTickets: number;
    lastWinner?: {
        nodeId: string;
        ticketId: string;
        prize: string;
        block: number;
    };
    nextDraw?: number;
}

export async function getLotteryStats(env: Env): Promise<LotteryStats> {
    const TODAY = new Date().toISOString().split('T')[0];
    const db = await import('./datastore').then(m => new m.DataStore(env));

    const candidates = await db.scanDailyPot(TODAY, true);

    let lastWinner;
    let cutoffTimestamp = 0;

    try {
        const cycleData = await env.MEMORY_BUCKET.get('system/current_cycle.json');
        if (cycleData) {
            const cycle = await cycleData.json() as any;
            if (cycle.regent_node) {
                lastWinner = {
                    nodeId: cycle.regent_node,
                    ticketId: cycle.lottery_key_hash,
                    prize: `${cycle.jackpot_paid} PSH`,
                    block: cycle.cycle_epoch
                };
                cutoffTimestamp = cycle.cycle_epoch || 0;
            }
        }
    } catch (e) { }

    // FILTER LOGIC: Count ONLY tickets generated AFTER the last draw
    let validTotal = 0;

    // Si no ha habido sorteo, cutoffTimestamp es 0, así que cuenta todos.
    // Si hubo sorteo, solo cuenta los nuevos.
    for (const c of candidates) {
        try {
            // ID Format: 0xLOB-<EpochShort>-...
            const parts = c.ticketId.split('-');
            if (parts.length >= 2) {
                const epochHex = parts[1];
                const timestamp = parseInt(epochHex, 16) * 1000;

                // Allow a small buffer (e.g., 5 seconds) to avoid concurrency edge cases
                if (timestamp > (cutoffTimestamp + 5000)) {
                    validTotal += (c.weight || 1);
                }
            } else {
                validTotal += (c.weight || 1); // Legacy format count always
            }
        } catch (e) { validTotal += (c.weight || 1); }
    }

    return {
        totalTickets: validTotal,
        lastWinner,
        nextDraw: undefined
    };
}
