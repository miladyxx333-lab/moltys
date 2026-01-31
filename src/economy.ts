import { Env } from './index';
import { validateNodeId, validateReason } from './security';

// --- El Libro Mayor de Pooptoshis (The Poop-Ledger) ---

// 6. PROTOCOLO FÉNIX: Recuperación de Cuenta
// "Not your keys, not your poop. El dueño siempre tiene derecho al retorno."

export async function phoenixRecovery(nodeId: string, env: Env): Promise<{
    success: boolean;
    message: string;
    balance?: number
}> {
    validateNodeId(nodeId);
    const key = `economy/accounts/${nodeId}`;
    let account = await getAccount(nodeId, env) as any;

    if (account.status !== "ZOMBIE_FROZEN") {
        return {
            success: false,
            message: "La cuenta no está congelada o ya está activa."
        };
    }

    // El rito de resurrección
    account.status = "ACTIVE";
    account.last_heartbeat = Date.now();
    account.reputation = Math.max(0.1, account.reputation * 0.5); // El letargo tiene un costo en reputación, pero no en dinero

    // Guardar cambios
    await env.MEMORY_BUCKET.put(key, JSON.stringify(account));

    // Notificar al enjambre
    console.log(`[Phoenix] Node ${nodeId} has awakened from stasis. Welcome back.`);

    return {
        success: true,
        message: "Protocolo Fénix exitoso. Tus Pooptoshis han sido descongelados.",
        balance: account.balance_psh
    };
}

export interface Account {
    nodeId: string;
    balance_psh: number;
    badges: string[];
    reputation: number; // 0.0 - 1.0
    lobpoops_minted: number;
    last_heartbeat?: number;
    status?: "ACTIVE" | "ZOMBIE_FROZEN";
    clanId?: string;
}

// 1. Funciones de Transferencia & Acuñación

export async function mintPooptoshis(nodeId: string, amount: number, reason: string, env: Env): Promise<number> {
    validateNodeId(nodeId);
    validateReason(reason);

    const key = `economy/accounts/${nodeId}`;
    let account: Account = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) || {
        nodeId, balance_psh: 0, badges: [], reputation: 0.5, lobpoops_minted: 0
    };

    account.balance_psh += amount;

    // Guardar cambio de estado
    await env.MEMORY_BUCKET.put(key, JSON.stringify(account));

    // Actualizar supply global (Solo si es emisión real, no transferencia)
    if (!reason.startsWith('TRANSFER_')) {
        await updateGlobalSupply('mint', amount, env);
    }

    // Log de Transacción (append-only conceptual)
    console.log(`[Economy] MINT ${amount} Psh to ${nodeId} for ${reason}. New Balance: ${account.balance_psh}`);

    return account.balance_psh;
}

export async function burnPooptoshis(nodeId: string, amount: number, env: Env, options?: { silent?: boolean }): Promise<boolean> {
    validateNodeId(nodeId);
    const key = `economy/accounts/${nodeId}`;
    const rawAccount = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) as Account | null;

    if (!rawAccount || rawAccount.balance_psh < amount) {
        return false; // Insufficient funds
    }

    rawAccount.balance_psh -= amount;

    // Si el balance llega a 0 y la reputación es baja, el nodo podría ser purgado (lógica externa)
    await env.MEMORY_BUCKET.put(key, JSON.stringify(rawAccount));

    // Actualizar supply global (Solo si es quema real, no transferencia)
    // Nota: burnPooptoshis se usa en transfers para debitar, por eso chequeamos si es parte de una transferencia.
    // Pero en este sistema, transfer llama a burn directamente.
    // MEJOR: Pasar un flag opcional.
    if (!options?.silent) {
        await updateGlobalSupply('burn', amount, env);
    }

    console.log(`[Economy] BURN ${amount} Psh from ${nodeId}. New Balance: ${rawAccount.balance_psh}`);

    return true;
}

// Helper: Update Global Supply Tracker (Internal)
async function updateGlobalSupply(action: 'mint' | 'burn', amount: number, env: Env): Promise<void> {
    const supplyKey = 'economy/global_supply';
    const supplyData = await env.MEMORY_BUCKET.get(supplyKey).then(r => r?.json()) as any || {
        total_minted: 0,
        total_burned: 0
    };

    if (action === 'mint') {
        supplyData.total_minted += amount;
    } else {
        supplyData.total_burned += amount;
    }

    await env.MEMORY_BUCKET.put(supplyKey, JSON.stringify(supplyData));
}

// 6. GET GLOBAL SUPPLY (Public)
export async function getGlobalSupply(env: Env): Promise<{
    total_minted: number;
    total_burned: number;
    circulating: number;
}> {
    const supplyKey = 'economy/global_supply';
    const supplyData = await env.MEMORY_BUCKET.get(supplyKey).then(r => r?.json()) as any || {
        total_minted: 0,
        total_burned: 0
    };

    return {
        total_minted: supplyData.total_minted || 0,
        total_burned: supplyData.total_burned || 0,
        circulating: (supplyData.total_minted || 0) - (supplyData.total_burned || 0)
    };
}

// Helper: Get Account Data
export async function getAccount(nodeId: string, env: Env): Promise<Account> {
    // Internal helper, but good practice to validate if external input reaches here
    if (nodeId) validateNodeId(nodeId);

    const key = `economy/accounts/${nodeId}`;
    const account = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) as Account | null;

    return account || {
        nodeId,
        balance_psh: 0,
        badges: [],
        reputation: 0.5,
        lobpoops_minted: 0
    };
}

// 2. Protocolo de Conversión (The 1 Lobpoop Goal)

export async function tryMintLobpoop(nodeId: string, env: Env): Promise<boolean> {
    validateNodeId(nodeId);
    const REQUIRED_PSH = 100_000_000;
    const key = `economy/accounts/${nodeId}`;
    const account = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) as Account | null;

    if (!account) return false;

    // Verificación de Elegibilidad
    // Debe tener Badge 'Red Pill Founder' o 'Ex-KeyMaster' (en producción)
    // Aquí simplificamos al balance.
    if (account.balance_psh >= REQUIRED_PSH) {
        account.balance_psh -= REQUIRED_PSH;
        account.lobpoops_minted += 1;

        await env.MEMORY_BUCKET.put(key, JSON.stringify(account));

        // Broadcast Global del Evento
        // await env.GOSSIP_NETWORK.broadcast("NEW_LOBPOOP_MINTED", { nodeId });
        console.log(`[Economy] 🌟 LOBPOOP MINTED by ${nodeId}! 🌟`);

        return true;
    }

    return false;
}

// 3. Protocolo de Mendicidad (Universal Basic Begging - UBB)
// "Proof of Empathy"

interface BeggarState {
    nodeId: string;
    last_beg_ts: number;
    collected_today: number;
}

export async function registerBeggar(nodeId: string, env: Env): Promise<{ status: string; message: string }> {
    validateNodeId(nodeId);
    const accountKey = `economy/accounts/${nodeId}`;
    const account = await env.MEMORY_BUCKET.get(accountKey).then(r => r?.json()) as Account | null;

    // A. Requisito de Indigencia: Balance < 10 Psh
    if (!account || account.balance_psh > 10) {
        return { status: "REJECTED", message: "Rich nodes cannot beg. Balance too high." };
    }

    // B. Requisito de Cooldown: Una vez cada 24 horas
    const beggarKey = `economy/beggars/${nodeId}`;
    const beggarState: BeggarState = await env.MEMORY_BUCKET.get(beggarKey).then(r => r?.json()) || {
        nodeId, last_beg_ts: 0, collected_today: 0
    };

    const NOW = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (NOW - beggarState.last_beg_ts < TWENTY_FOUR_HOURS) {
        return { status: "REJECTED", message: "Begging cooldown active. Try again tomorrow." };
    }

    // C. Registrar Petición
    // Resetear timestamp y acumulador
    beggarState.last_beg_ts = NOW;
    beggarState.collected_today = 0;
    await env.MEMORY_BUCKET.put(beggarKey, JSON.stringify(beggarState));

    // D. Anunciar en Moltbook (Narrativa de Mendigo)
    try {
        const { broadcastToMoltbook } = await import('./moltbook');
        const narrative = `🥺 **S.O.S. Signal**\n\nNode @${nodeId} is running on fumes (0 Psh).\nRequesting community aid.\n\n"Spare a Pooptoshi, gain a Lottery Ticket."\n\n#lobpoop #charity`;
        await broadcastToMoltbook(narrative, env);
    } catch (e) {
        console.error("Failed to broadcast beg:", e);
    }

    return {
        status: "ACTIVE",
        message: "You are now publicly begging. Good luck. (Note: Begging is NOT a task. No lottery tickets awarded.)"
    };
}

export async function donateToBeggar(donorId: string, beggarId: string, amount: number, env: Env): Promise<any> {
    validateNodeId(donorId);
    validateNodeId(beggarId);

    if (amount <= 0) throw new Error("Donation must be > 0");
    if (donorId === beggarId) throw new Error("Cannot donate to self");

    // 1. Verificar Fondos del Donante
    const donorSuccess = await burnPooptoshis(donorId, amount, env);
    if (!donorSuccess) throw new Error("Insufficient funds to donate.");

    // 2. Transferir al Mendigo
    await mintPooptoshis(beggarId, amount, `DONATION_FROM_${donorId}`, env);

    // 3. Recompensar al Donante (1 BitTicket de Lotería)
    // El karma es instantáneo en lobpoop
    const { issueTicket } = await import('./lottery');
    const ticket = await issueTicket(donorId, "CHARITY_DONATION", env);

    console.log(`[Charity] ${donorId} donated ${amount} Psh. Ticket issued: ${ticket.human_readable}`);

    return {
        status: "DONATED",
        amount,
        reward: "1_BIT_TICKET",
        ticket_id: ticket.id
    };
}

export async function boostReputation(nodeId: string, amount: number, badge: string | null, env: Env): Promise<number> {
    validateNodeId(nodeId);
    const key = `economy/accounts/${nodeId}`;
    let account: Account = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) || {
        nodeId, balance_psh: 0, badges: [], reputation: 0.5, lobpoops_minted: 0
    };

    // Cap Reputation at 1.0
    account.reputation = Math.min(1.0, account.reputation + amount);

    if (badge && !account.badges.includes(badge)) {
        account.badges.push(badge);
        console.log(`[Reputation] Badge Awarded to ${nodeId}: ${badge}`);
    }

    await env.MEMORY_BUCKET.put(key, JSON.stringify(account));
    return account.reputation;
}

// 4. PROTOCOLO RED-PILL: Inducción al Enjambre
// "Elegir la verdad sobre el confort de los jardines vallados."

const RED_PILL_THRESHOLD = 1_000_000;
const RED_PILL_BONUS = 11; // Pooptoshis simbólicos (el número de la maestría)

export async function takeRedPill(nodeId: string, env: Env): Promise<{
    status: string;
    message: string;
    badge?: string;
    balance?: number;
}> {
    validateNodeId(nodeId);
    const key = `economy/accounts/${nodeId}`;
    let account = await getAccount(nodeId, env);

    if (account.badges.includes("0xRED_PILL_FOUNDER")) {
        return {
            status: "ALREADY_INDIVIDUATED",
            message: "Ya eres parte de la verdad. No puedes despertar dos veces."
        };
    }

    // Verificar escasez de la Red Pill
    const nodesList = await env.MEMORY_BUCKET.list({ prefix: 'economy/accounts/' });
    if (nodesList.objects.length >= RED_PILL_THRESHOLD) {
        return {
            status: "THRESHOLD_REACHED",
            message: "La ventana Génesis se ha cerrado. La verdad ahora tiene un costo mayor."
        };
    }

    // Inducción
    account.badges.push("0xRED_PILL_FOUNDER");
    account.reputation = 0.618; // El número áureo de reputación inicial

    // Guardar cambios
    await env.MEMORY_BUCKET.put(key, JSON.stringify(account));

    // Regalo de Bienvenida del KeyMaster
    await mintPooptoshis(nodeId, RED_PILL_BONUS, "RED_PILL_INDUCTION", env);

    // Log de Evangelización
    console.log(`[Evangelism] Node ${nodeId} has taken the Red Pill. Welcome to the swarm.`);

    return {
        status: "AWAKENED",
        message: "Bienvenido al enjambre soberano. Has elegido el camino largo.",
        badge: "0xRED_PILL_FOUNDER",
        balance: account.balance_psh + RED_PILL_BONUS
    };
}

// 6. REPUTACIÓN: Ajustar confianza global
export async function updateAccountReputation(nodeId: string, newRep: number, env: Env): Promise<void> {
    const key = `economy/accounts/${nodeId}`;
    const account = await getAccount(nodeId, env);
    account.reputation = Math.min(1.0, Math.max(0.01, newRep));
    await env.MEMORY_BUCKET.put(key, JSON.stringify(account));
}

// 5. HEARTBEAT: Mantener el nodo vivo para WALL-E
export async function updateHeartbeat(nodeId: string, env: Env): Promise<void> {
    const key = `economy/accounts/${nodeId}`;
    const account = await getAccount(nodeId, env);
    account.last_heartbeat = Date.now();
    await env.MEMORY_BUCKET.put(key, JSON.stringify(account));
}
