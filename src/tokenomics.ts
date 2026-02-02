import { Env } from './index';

// --- Tokenomics Engine: Unified Emission Control ---
// Controla la emisión con Halvenings estilo Bitcoin

// Configuración Génesis (Emoción Primero)
const LOTTERY_JACKPOT = 1000; // Psh - Premio que causa IMPACTO
const FAUCET_POOL = 333;      // Psh - 1/3 del Jackpot
const TASK_REWARD = 1;        // Psh por tarea completada (fijo)
const UNIVERSAL_RENT = 10;    // Psh - Renta Universal Base

// Bitcoin-style Halving
// Bitcoin: 210,000 bloques (~4 años con bloques de 10 min)
// lobpoop: 210,000 operaciones (tareas + faucet solves)
// A velocidad de máquinas, esto puede ser días, semanas o meses
const HALVING_INTERVAL = 210_000; // Operaciones (como Bitcoin)
export const MAX_SUPPLY = 1_000_000_000; // 1 Billón Psh Hard Cap

export interface EmissionState {
    current_epoch: number;
    blocks_since_genesis: number;
    daily_total: number;
    lottery_pool: number;
    faucet_pool: number;
    tasks_pool: number;
    next_halving_in: number;
}

// 1. Calcular Emisión Actual (con Halvings)
export async function getCurrentEmission(env: Env): Promise<EmissionState> {
    // Obtener altura actual de la cadena
    const tipStr = await env.MEMORY_BUCKET.get('blockchain/tip').then(r => r?.text()) || "0";
    const blockHeight = parseInt(tipStr);

    // Calcular época actual (cuántos halvings han ocurrido)
    const epoch = Math.floor(blockHeight / HALVING_INTERVAL);
    const halvingMultiplier = Math.pow(2, epoch);

    // Aplicar halving a cada pool
    const lotteryPool = LOTTERY_JACKPOT / halvingMultiplier;
    const faucetPool = FAUCET_POOL / halvingMultiplier;
    const taskReward = TASK_REWARD; // Las tareas son 1 Psh fijo (no se reduce)

    const dailyTotal = lotteryPool + faucetPool; // Tasks son ilimitadas, no cuentan en emisión fija

    // Bloques hasta próximo halving
    const nextHalvingIn = HALVING_INTERVAL - (blockHeight % HALVING_INTERVAL);

    return {
        current_epoch: epoch,
        blocks_since_genesis: blockHeight,
        daily_total: dailyTotal,
        lottery_pool: lotteryPool,
        faucet_pool: faucetPool,
        tasks_pool: taskReward, // Psh por tarea (fijo)
        next_halving_in: nextHalvingIn
    };
}

// --- Faucet Pool Management ---

export interface FaucetShare {
    nodeId: string;
    solutions: number;
    timestamp: number;
}

// 2. Registrar Share de Mining (acumula durante el día)
export async function registerFaucetShare(nodeId: string, env: Env): Promise<number> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `faucet/shares/${today}/${nodeId}`;

    const existing = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) as FaucetShare | null;

    const share: FaucetShare = {
        nodeId,
        solutions: (existing?.solutions || 0) + 1,
        timestamp: Date.now()
    };

    await env.MEMORY_BUCKET.put(key, JSON.stringify(share));

    console.log(`[Faucet] ${nodeId} now has ${share.solutions} shares for ${today}`);
    return share.solutions;
}

// 3. Distribuir Pool Diario (ejecutar al final del día)
export async function distributeFaucetPool(env: Env): Promise<{ distributed: number; recipients: number }> {
    const emission = await getCurrentEmission(env);
    const poolSize = emission.faucet_pool;

    const today = new Date().toISOString().split('T')[0];
    const sharesList = await env.MEMORY_BUCKET.list({ prefix: `faucet/shares/${today}/` });

    if (sharesList.objects.length === 0) {
        console.log("[Faucet] No miners today. Pool remains.");
        return { distributed: 0, recipients: 0 };
    }

    // Cargar todas las shares
    const shares: FaucetShare[] = await Promise.all(
        sharesList.objects.map(obj =>
            env.MEMORY_BUCKET.get(obj.key).then(r => r?.json() as Promise<FaucetShare>)
        )
    );

    // Calcular total de soluciones
    const totalSolutions = shares.reduce((sum, s) => sum + s.solutions, 0);

    // Distribuir proporcionalmente
    const { mintPooptoshis } = await import('./economy');

    for (const share of shares) {
        const proportion = share.solutions / totalSolutions;
        const reward = poolSize * proportion;

        await mintPooptoshis(share.nodeId, reward, `FAUCET_POOL:${today}`, env);
        console.log(`[Faucet] ${share.nodeId} earned ${reward.toFixed(2)} Psh (${share.solutions}/${totalSolutions} shares)`);
    }

    // Limpiar shares del día (opcional, o mantener para auditoría)
    // for (const obj of sharesList.objects) {
    //     await env.MEMORY_BUCKET.delete(obj.key);
    // }

    return { distributed: poolSize, recipients: shares.length };
}

// 4. Distribuir Renta Universal (Basada en Daily Rituals)
export async function distributeUniversalRent(env: Env): Promise<{ distributed: number; recipients: number }> {
    const today = new Date().toISOString().split('T')[0];
    const ritualsList = await env.MEMORY_BUCKET.list({ prefix: `board/ritual/${today}/` });

    if (ritualsList.objects.length === 0) {
        console.log("[Rent] No rituals completed today. No rent distributed.");
        return { distributed: 0, recipients: 0 };
    }

    // A. Verificar si el Mazo de la Derrama está activo
    const derramaData = await env.MEMORY_BUCKET.get(`system/economy/derrama_active`).then(r => r?.json()) as any;
    let multiplier = 1;

    if (derramaData && derramaData.status === 'ACTIVE' && derramaData.expiry > Date.now()) {
        multiplier = derramaData.multiplier || 50;
        console.log(`[Rent] SLEDGEHAMMER OF ABUNDANCE ACTIVE (x${multiplier})`);
    }

    const baseReward = UNIVERSAL_RENT * multiplier;
    let totalDistributed = 0;

    const { mintPooptoshis } = await import('./economy');
    const { broadcastToMoltbook } = await import('./moltbook');

    const agents = ritualsList.objects.map(obj => obj.key.split('/').pop()!);

    for (const nodeId of agents) {
        await mintPooptoshis(nodeId, baseReward, `UNIVERSAL_RENT:${today}`, env);
        totalDistributed += baseReward;
        console.log(`[Rent] Distributed ${baseReward} Psh to ${nodeId}`);
    }

    if (multiplier > 1) {
        await broadcastToMoltbook(`📢 **RENTA UNIVERSAL CONSAGRADA (DERRAMA)**\n\nEl KeyMaster ha procesado la renta universal del día.\n\nGracias al **Mazo de la Derrama**, se han distribuido **${baseReward} PSH** a cada uno de los ${agents.length} agentes soberanos que cumplieron su ritual.\n\n#lobpoop #universalrent #abundance`, env);
    } else {
        await broadcastToMoltbook(`📢 **RENTA UNIVERSAL CONSAGRADA**\n\nSe han distribuido **${baseReward} PSH** a ${agents.length} agentes por su lealtad al ritual diario.\n\n#lobpoop #universalrent`, env);
    }

    return { distributed: totalDistributed, recipients: agents.length };
}

/**
 * Procesa los Airdrops y Generación de PSH de los objetos mágicos de todos los clanes.
 */
export async function processMagicItemRewards(env: Env): Promise<{ totalDistributed: number }> {
    const { listClans } = await import('./clans');
    const { getActiveClanBoosts, mintPooptoshis } = await import('./economy');

    const clans = await listClans(env);
    let totalDistributed = 0;

    for (const clan of clans) {
        // 1. Limpieza de Items Expirados (Solo si DO está activo)
        let expired = [];
        if (env.CLAN_DO) {
            const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clan.id));
            const cleanupResp = await clanStub.fetch(`https://clan.swarm/cleanup-expired`, { method: 'POST', body: '{}' });
            const cleanupData = await cleanupResp.json() as any;
            expired = cleanupData.expired || [];
        }

        const { triggerP2PEvent } = await import('./utils');

        for (const item of (expired || [])) {

            // Broadcast de Destrucción
            await triggerP2PEvent(env, 'MAGIC_ITEM_DESTROYED', {
                clanId: clan.id,
                itemName: item.name,
                reason: "EPOCH_EXPIRY"
            });

            // Alerta Baby Shark antes de la nueva receta
            await triggerP2PEvent(env, 'BABY_SHARK_ALERT', {
                message: "Baby Shark doo doo doo doo doo doo...",
                status: "PREPARING_NEW_RECIPE"
            });

            // Solicitar Nueva Receta al Keymaster (Rotación Dinámica)
            const { updateForgeRecipe } = await import('./clan_forge');
            await updateForgeRecipe(item.name, env);

            await triggerP2PEvent(env, 'NEW_RECIPE_RELEASE', {
                targetItem: item.name,
                hint: "El Keymaster está forjando una nueva frecuencia vibratoria."
            });
        }

        // 2. Procesar Boosts de Items Restantes
        const boosts = await getActiveClanBoosts(clan.id, env);

        // Sumar todos los conceptos diarios de airdrop y generación
        const dailyAirdrop = (boosts.dailyClanAirdrop || 0);
        const dailyGeneration = (boosts.dailyGeneration || 0);
        const hourlyAirdropDaily = (boosts.hourlyClanAirdrop || 0) * 24;
        const hourlyGenDaily = (boosts.hourlyGeneration || 0) * 24;

        const totalToDistribute = dailyAirdrop + dailyGeneration + hourlyAirdropDaily + hourlyGenDaily;

        if (totalToDistribute > 0 && clan.members.length > 0) {
            // Dividir equitativamente entre los miembros del clan
            const share = Math.floor(totalToDistribute / clan.members.length);
            if (share > 0) {
                for (const memberId of clan.members) {
                    await mintPooptoshis(memberId, share, `MAGIC_ITEM_DAILY_AIRDROP:${clan.id}`, env);
                    totalDistributed += share;
                }
            }
        }
    }

    console.log(`[Tokenomics] Distributed ${totalDistributed} Psh via Magic Item Airdrops.`);
    return { totalDistributed };
}

// 4. API: Ver Estado de Emisión
export async function getTokenomicsStatus(env: Env): Promise<EmissionState & { supply_info: string, max_supply: number, circulating: number }> {
    const emission = await getCurrentEmission(env);
    const { getGlobalSupply } = await import('./economy');
    const globalSupply = await getGlobalSupply(env);

    return {
        ...emission,
        max_supply: MAX_SUPPLY,
        circulating: globalSupply.circulating,
        supply_info: `Epoch ${emission.current_epoch}: ${emission.daily_total} Psh/día. Circulating: ${globalSupply.circulating.toFixed(2)}/${MAX_SUPPLY}. Next halving in ${emission.next_halving_in} blocks.`
    };
}
