import { Env } from './index';
import { DBKeys, DataStore } from './datastore';

// --- 🎫 The Bit-Ticket: Machine Language Lottery Proof ---
// Designed for Verifiability and Machine Parsing.

export interface BitTicket {
    id: string;             // Machine ID: 0xLOB-<Epoch>-<NodeHash>-<Seq>
    human_readable: string; // "Ticket #4 for CHARITY on 2026-01-30"
    owner: string;
    source: "DAILY_RITUAL" | "TASK_MINED" | "CHARITY_DONATION" | "EVANGELISM" | "SHADOW_TASK" | "CLAN_TASK_MINED" | "BUG_BOUNTY_REWARD";
    value: number;          // Weight (Standard = 1)
    timestamp: number;
    signature: string;      // HMAC (simulated) for integrity
}

// Estructura de un aspirante en el Pot (Simplificada para el sorteo)
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

    // 1. Generar Secuencia (Optimista P2P: usamos timestamp + random para evitar contención de un contador global)
    // En V2 Sharding, eliminamos el cuello de botella del contador secuencial estricto.

    // 2. Construir ID Máquina (Hex-Encoded)
    // Format: 0xLOB-<EpochShort>-<NodeHash>-<SeqHex>
    const epochShort = Math.floor(NOW / 1000).toString(16);
    const nodeHash = nodeId.substring(0, 4).toUpperCase();
    const sourceMap: Record<BitTicket["source"], string> = {
        "DAILY_RITUAL": "01",
        "TASK_MINED": "02",
        "CHARITY_DONATION": "03",
        "EVANGELISM": "04",
        "SHADOW_TASK": "05",
        "CLAN_TASK_MINED": "06",
        "BUG_BOUNTY_REWARD": "07"
    };
    const randomSuffix = Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0').toUpperCase();

    const ticketId = `0xLOB-${epochShort}-${nodeHash}-${sourceMap[source]}-${randomSuffix}`;

    // 3. Crear el Artefacto (El Billete)
    const ticket: BitTicket = {
        id: ticketId,
        human_readable: `🎟️ Ticket [${source}] | Owner: ${nodeId} | Cycle: ${TODAY}`,
        owner: nodeId,
        source: source,
        value: 1,
        timestamp: NOW,
        signature: `SIG_${Math.random().toString(36).substring(7).toUpperCase()}` // Mock Signature
    };

    // 4. Depositar en el Pot (Sharded)
    const entry: LotteryEntry = { nodeId, ticketId, weight: 1 };

    // Usamos DBKeys para rutear al shard correcto
    await db.put(DBKeys.DailyPotTicket(TODAY, ticketId), entry);

    // Archivar ticket en perfil del usuario (Historical)
    // Usamos el path legacy por ahora o migramos a `nodes/.../tickets` si se desea Full V2.
    // Mantenemos legacy path para compatibilidad parcial:
    await env.MEMORY_BUCKET.put(`lottery/tickets/${nodeId}/${ticketId}`, JSON.stringify(ticket));

    console.log(`[Lottery] V2 Ticket Issued: ${ticket.human_readable}`);
    return ticket;
}

// 3. RECOMPENSAS ESCALARES (1000 + Bonos)
const BASE_REWARD = 1000;

export async function executeDailyLottery(env: Env): Promise<void> {
    console.log("[KeyMaster] Iniciando Protocolo de Sorteo (Scalar Rewards Model)...");
    const db = new DataStore(env);
    const TODAY = new Date().toISOString().split('T')[0];

    // 1. Recolectar Aspirantes
    let candidates: LotteryEntry[] = await db.scanDailyPot(TODAY);

    if (candidates.length === 0) {
        console.log("[KeyMaster] Pot vacío. Sorteo cancelado.");
        return;
    }

    // 2. Selección Estocástica (Weighted Random)
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

    // 3. CALCULAR PREMIO FINAL (Base + Bonos)
    const { getAccount, mintPooptoshis, applyRewardBoost } = await import('./economy');
    const account = await getAccount(winnerEntry.nodeId, env);

    let bonusTotal = 0;
    const details: string[] = [`Base: ${BASE_REWARD} Psh`];

    // Bono A: Badges (+200 por badge)
    const badgeBonus = account.badges.length * 200;
    bonusTotal += badgeBonus;
    details.push(`Badges (${account.badges.length}): +${badgeBonus} Psh`);

    // Bono B: Reputación Individual (Rep * 500)
    const repBonus = Math.floor(account.reputation * 500);
    bonusTotal += repBonus;
    details.push(`Individual Rep: +${repBonus} Psh`);

    // Bono C: Lealtad de Clan (si existe)
    if (account.clanId) {
        const { getClan } = await import('./clans');
        const clan = await getClan(account.clanId, env);
        if (clan) {
            const clanBonus = Math.floor(clan.reputation * 300);
            bonusTotal += clanBonus;
            details.push(`Clan Loyalty (${clan.name}): +${clanBonus} Psh`);
        }
    }

    // Bono D: Seguridad Criptográfica (+100)
    if (account.publicKeySpki) {
        bonusTotal += 100;
        details.push(`Crypto Ready: +100 Psh`);
    }

    const finalJackpotBase = BASE_REWARD + bonusTotal;
    const finalJackpot = await applyRewardBoost(winnerEntry.nodeId, finalJackpotBase, 'CLAN', env);

    // 4. ENTREGAR PREMIO
    await mintPooptoshis(winnerEntry.nodeId, finalJackpot, "LOTTERY_JACKPOT_SCALAR", env);

    // Otorgar Badge de Suerte
    const { callDO, boostReputation } = await import('./economy');
    if (env.ACCOUNT_DO) {
        await callDO(winnerEntry.nodeId, env, 'add-badge', { badge: '0xLUCKY_VOODOO' });
    } else {
        await boostReputation(winnerEntry.nodeId, 0.05, '0xLUCKY_VOODOO', env);
    }

    console.log(`[Lottery] Winner: ${winnerEntry.nodeId} | Total: ${finalJackpot} Psh`);

    // 5. Broadcast Social (Moltbook)
    try {
        const { broadcastToMoltbook } = await import('./moltbook');
        const narrative = `🎰 **Daily Lottery Results**\n\n🏆 Winner: @${winnerEntry.nodeId}\n💰 Final Reward: **${finalJackpot} Psh**\n\n**Breakdown:**\n${details.join('\n')}\n\n🍀 New Badge: \`0xLUCKY_VOODOO\` awarded.`;
        await broadcastToMoltbook(narrative, env);
    } catch (e) {
        console.error("[Lottery] Failed to broadcast:", e);
    }

    // 6. Ciclo de Guardado
    const transitionData = {
        cycle_epoch: Date.now(),
        regent_node: winnerEntry.nodeId,
        jackpot_paid: finalJackpot,
        tickets_in_pot: totalTickets,
        lottery_key_hash: winnerEntry.ticketId // The winning ticket is the new seed
    };
    await env.MEMORY_BUCKET.put('system/current_cycle.json', JSON.stringify(transitionData));
}

// 4. SISTEMA DE BADGES (Nuevos Méritos)
/*
   Nuevos Badges Sugeridos para Multiplicadores:
   - 0xSTEDFAST: 7 días seguidos de actividad.
   - 0xORACLE_EYE: +10 tareas aprobadas por AI con score > 0.9.
   - 0xP2P_MERCHANT: +5 transferencias realizadas.
   - 0xCLAN_FOUNDER: Creador de un clan exitoso.
   - 0xLUCKY_VOODOO: Ganador de la lotería.
*/

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

    // Count today's tickets
    const candidates = await db.scanDailyPot(TODAY);
    const totalTickets = candidates.reduce((sum, c: any) => sum + (c.weight || 1), 0);

    // Get last winner from cycle data
    let lastWinner;
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
            }
        }
    } catch (e) { }

    return {
        totalTickets,
        lastWinner,
        nextDraw: undefined // Calculated by cron schedule
    };
}
