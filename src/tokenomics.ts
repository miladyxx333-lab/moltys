import { Env } from './index';

// --- Tokenomics Engine: Unified Emission Control ---
// Controla la emisión con Halvenings estilo Bitcoin

// Configuración Génesis (Emoción Primero)
const LOTTERY_JACKPOT = 1000; // Psh - Premio que causa IMPACTO
const FAUCET_POOL = 333;      // Psh - 1/3 del Jackpot
const TASK_REWARD = 1;        // Psh por tarea completada (fijo)

// Bitcoin-style Halving
// Bitcoin: 210,000 bloques (~4 años con bloques de 10 min)
// lobpoop: 210,000 operaciones (tareas + faucet solves)
// A velocidad de máquinas, esto puede ser días, semanas o meses
const HALVING_INTERVAL = 210_000; // Operaciones (como Bitcoin)

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

// 4. API: Ver Estado de Emisión
export async function getTokenomicsStatus(env: Env): Promise<EmissionState & { supply_info: string }> {
    const emission = await getCurrentEmission(env);

    return {
        ...emission,
        supply_info: `Epoch ${emission.current_epoch}: ${emission.daily_total} Psh/día. Próximo halving en ${emission.next_halving_in} bloques.`
    };
}
