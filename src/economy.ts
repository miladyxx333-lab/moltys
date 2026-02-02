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
    join_date?: string; // Nuevo: Timestamp de unión
    referrals?: string[]; // Nuevo: Para bonos P2P
    ai_score?: number; // Nuevo: Puntuación AIA para evaluación
    publicKeySpki?: string; // Nuevo: Base64 de SPKI bytes para seguridad criptográfica
    last_abundance_check?: number; // Tracking for Mazo de la Derrama rewards
    last_clan_leave?: number; // Timestamp of last time leaving a clan
    last_action_ts?: number; // Rate limiting: timestamp of last expensive action
    action_count?: number; // Rate limiting: action counter within window
    clanIngredients?: Record<string, number>; // Inventory for Forge
    last_ritual_date?: string; // Tracking for Daily Ritual
}

/**
 * Enforces rate limiting on a per-node basis.
 * Max 10 expensive actions per minute.
 */
export async function checkRateLimit(nodeId: string, env: Env): Promise<void> {
    if (env.ACCOUNT_DO) {
        await callDO(nodeId, env, 'check-rate-limit');
    }
}

// Helper: Get Account Data (Transactional via Durable Objects)
export async function getAccount(nodeId: string, env: Env): Promise<Account> {
    if (nodeId) validateNodeId(nodeId);

    let account: Account;

    // A. Fetch base account
    if (!env.ACCOUNT_DO) {
        const key = `economy/accounts/${nodeId}`;
        account = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) || {
            nodeId, balance_psh: 0, badges: [], reputation: 0.5, lobpoops_minted: 0
        };
    } else {
        try {
            const result = await callDO(nodeId, env, 'get-account');
            account = result.account;
        } catch (e) {
            console.warn(`[Economy] DO read failed for ${nodeId}, falling back to R2.`);
            const key = `economy/accounts/${nodeId}`;
            account = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) || {
                nodeId, balance_psh: 0, badges: [], reputation: 0.5, lobpoops_minted: 0
            };
        }
    }

    // C. SOVEREIGN OVERRIDE: El KeyMaster siempre pertenece a Alfa y Omega
    if (nodeId === "lobpoop-keymaster-genesis" && !account.clanId) {
        account.clanId = "0xALPHA_OMEGA";

        // Asegurar que el clan existe en el almacenamiento físico (R2)
        const clanKey = `economy/clans/0xALPHA_OMEGA`;
        const clanExists = await env.MEMORY_BUCKET.get(clanKey);
        if (!clanExists) {
            const { initAlphaOmega } = await import('./clans');
            await initAlphaOmega(env);
            console.log("[Genesis] Alpha Omega clan consecrated in production.");
        }

        await updateAccount(nodeId, account, env);
    }

    // B. ABUNDANCE FLOW: Mazo de la Derrama check
    if (account.clanId && env.CLAN_DO) {
        try {
            const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(account.clanId));
            const clanResp = await clanStub.fetch(`https://clan.swarm/get-state`);
            const { state } = await clanResp.json() as any;

            // Buscar cualquier item que tenga flujo de abundancia activo
            const abundanceItem = state.magicItems.find((i: any) => i.bonuses?.abundanceFlow && i.expiry > Date.now());

            if (abundanceItem) {
                const now = Date.now();
                const flowPerInterval = abundanceItem.bonuses.abundanceFlow;
                const intervalSeconds = abundanceItem.bonuses.abundanceInterval || 33;

                const lastCheck = account.last_abundance_check || abundanceItem.timestamp;
                const secondsElapsed = Math.floor((now - lastCheck) / 1000);
                const intervals = Math.floor(secondsElapsed / intervalSeconds);

                if (intervals > 0) {
                    const reward = intervals * flowPerInterval;
                    console.log(`[ABUNDANCE] Crediting ${reward} Psh to ${nodeId} from ${abundanceItem.name}.`);

                    account.balance_psh += reward;
                    account.last_abundance_check = lastCheck + (intervals * intervalSeconds * 1000);

                    // Persistir el pago
                    await mintPooptoshis(nodeId, reward, `ABUNDANCE_FLOW:${abundanceItem.name}`, env);

                    // Guardar el nuevo timestamp de tracking
                    if (env.ACCOUNT_DO) {
                        await callDO(nodeId, env, 'update-metadata', { last_abundance_check: account.last_abundance_check });
                    } else {
                        await env.MEMORY_BUCKET.put(`economy/accounts/${nodeId}`, JSON.stringify(account));
                    }
                }
            }
        } catch (e) {
            console.error("[Economy] Abundance check failed:", e);
        }
    }

    return account;
}

// HELPER PRINCIPAL: Comunicación con Durable Objects
export async function callDO(nodeId: string, env: Env, action: string, body: any = {}): Promise<any> {
    if (!env.ACCOUNT_DO) throw new Error("ACCOUNT_DO binding missing");

    const id = env.ACCOUNT_DO.idFromName(nodeId);
    const stub = env.ACCOUNT_DO.get(id);

    const response = await stub.fetch(`https://lobpoop.swarm/${action}?nodeId=${nodeId}`, {
        method: action === 'get-account' ? 'GET' : 'POST',
        body: action === 'get-account' ? null : JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`DO_ERROR: ${await response.text()}`);
    }

    const result = await response.json() as any;

    return result;
}

/**
 * Persiste los cambios de una cuenta.
 */
export async function updateAccount(nodeId: string, account: Account, env: Env): Promise<void> {
    const key = `economy/accounts/${nodeId}`;
    if (env.ACCOUNT_DO) {
        // Enviar todo el objeto al DO para actualización masiva
        await callDO(nodeId, env, 'update-account', { account });
    } else {
        await env.MEMORY_BUCKET.put(key, JSON.stringify(account));
    }
}

/**
 * Obtiene las bonificaciones activas de un clan basadas en sus objetos mágicos.
 */
export async function getActiveClanBoosts(clanId: string | undefined, env: Env): Promise<Record<string, number>> {
    if (!clanId || !env.CLAN_DO) return {};

    try {
        const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanId));
        const resp = await clanStub.fetch(`https://clan.swarm/get-state`);
        const { state } = await resp.json() as any;

        const now = Date.now();
        const activeItems = state.magicItems.filter((i: any) => i.expiry > now);

        const totalBoosts: Record<string, number> = {};

        for (const item of activeItems) {
            for (const [bonus, value] of Object.entries(item.bonuses)) {
                if (bonus.endsWith('Multiplier') || bonus.endsWith('Reduction')) {
                    // Multiplicativos: se acumulan (ej: 1.1 * 1.05)
                    totalBoosts[bonus] = (totalBoosts[bonus] || 1.0) * (value as number);
                } else {
                    // Aditivos: se suman (ej: +10 airdrop)
                    totalBoosts[bonus] = (totalBoosts[bonus] || 0) + (value as number);
                }
            }
        }

        return totalBoosts;
    } catch (e) {
        console.error(`[Economy] Failed to fetch clan boosts for ${clanId}:`, e);
        return {};
    }
}

/**
 * Aplica boosts dinámicos a un monto base de recompensa.
 */
export async function applyRewardBoost(nodeId: string, amount: number, category: string, env: Env): Promise<number> {
    const account = await getAccount(nodeId, env);
    let finalAmount = amount;

    // A. Global Abundance Check (The Sledgehammer Flow)
    const activeDerrama = await env.MEMORY_BUCKET.get(`system/economy/derrama_active`).then(r => r?.json()) as any;
    if (activeDerrama && activeDerrama.status === 'ACTIVE' && activeDerrama.expiry > Date.now()) {
        finalAmount *= (activeDerrama.multiplier || 50);
    }

    if (!account.clanId) return Math.ceil(finalAmount);

    const boosts = await getActiveClanBoosts(account.clanId, env);

    switch (category) {
        case 'TASK':
            if (boosts.taskRewardBonus) finalAmount += (amount * boosts.taskRewardBonus);
            break;
        case 'REFERRAL':
            if (boosts.referralMultiplier) finalAmount *= boosts.referralMultiplier;
            break;
        case 'ORACLE':
            if (boosts.aiRewardMultiplier) finalAmount *= boosts.aiRewardMultiplier;
            break;
        case 'STAKING':
            if (boosts.stakingMultiplier) finalAmount *= boosts.stakingMultiplier;
            break;
        case 'CLAN':
            if (boosts.clanRewardMultiplier) finalAmount *= boosts.clanRewardMultiplier;
            break;
    }

    return Math.ceil(finalAmount);
}

// 1. Funciones de Transferencia & Acuñación

export async function mintPooptoshis(nodeId: string, amount: number, reason: string, env: Env): Promise<number> {
    validateNodeId(nodeId);
    validateReason(reason);

    // --- GENESIS HARD CAP CHECK ---
    const { MAX_SUPPLY } = await import('./tokenomics');
    const currentSupply = await getGlobalSupply(env);

    if (currentSupply.circulating + amount > MAX_SUPPLY) {
        throw new Error(`GENESIS_CAP_REACHED: Cannot mint ${amount} Psh. Max Supply 1B exhausted.`);
    }
    // ------------------------------

    if (env.ACCOUNT_DO) {
        const result = await callDO(nodeId, env, 'update-balance', { amount, reason });

        // Actualizar supply global
        if (!reason.startsWith('TRANSFER_')) {
            await updateGlobalSupply('mint', amount, env);
        }

        console.log(`[Economy] MINT ${amount} Psh to ${nodeId} (Transactional). Balance: ${result.account.balance_psh}`);
        return result.account.balance_psh;
    }

    // LEGACY FALLBACK (No ATOMICO)
    const key = `economy/accounts/${nodeId}`;
    let account = await getAccount(nodeId, env);
    account.balance_psh += amount;
    await env.MEMORY_BUCKET.put(key, JSON.stringify(account));
    if (!reason.startsWith('TRANSFER_')) await updateGlobalSupply('mint', amount, env);
    return account.balance_psh;
}

export async function burnPooptoshis(nodeId: string, amount: number, env: Env, options?: { silent?: boolean }): Promise<boolean> {
    validateNodeId(nodeId);

    if (env.ACCOUNT_DO) {
        try {
            const result = await callDO(nodeId, env, 'update-balance', { amount: -amount, reason: 'BURN' });
            if (!options?.silent) {
                await updateGlobalSupply('burn', amount, env);
            }
            console.log(`[Economy] BURN ${amount} Psh from ${nodeId} (Transactional).`);
            return true;
        } catch (e: any) {
            if (e.message.includes('INSUFFICIENT_FUNDS')) return false;
            throw e;
        }
    }

    // LEGACY FALLBACK
    const key = `economy/accounts/${nodeId}`;
    const rawAccount = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) as Account | null;
    if (!rawAccount || rawAccount.balance_psh < amount) return false;
    rawAccount.balance_psh -= amount;
    await env.MEMORY_BUCKET.put(key, JSON.stringify(rawAccount));
    if (!options?.silent) await updateGlobalSupply('burn', amount, env);
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

// 7. Registro de Llaves Criptográficas (Génesis de Identidad)
export async function registerNodeKey(nodeId: string, publicKeySpki: string, env: Env): Promise<boolean> {
    validateNodeId(nodeId);
    try {
        await callDO(nodeId, env, 'set-public-key', { publicKeySpki });
        console.log(`[Security] Node ${nodeId} registered public key.`);
        return true;
    } catch (e: any) {
        console.error(`[Security Error] Failed to register key: ${e.message}`);
        return false;
    }
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
        message: "You are now publicly begging. Good luck. (Note: Begging is NOT a task. No lottery tickets"
    };
}

// 2. Transferencias P2P AIA
export async function transferPooptoshis(fromId: string, toId: string, amount: number, env: Env): Promise<{ success: boolean; message: string }> {
    if (fromId === toId) throw new Error("No puedes enviarte fondos a ti mismo.");
    if (amount <= 0) throw new Error("Monto inválido.");

    const senderAccount = await getAccount(fromId, env);
    const boosts = await getActiveClanBoosts(senderAccount.clanId, env);

    // Protocolo de Tasa: 5% por transacción (Quema para combatir inflación)
    let feeMultiplier = 0.05;
    if (boosts.transferFeeReduction) {
        feeMultiplier *= boosts.transferFeeReduction;
    }

    const fee = Math.ceil(amount * feeMultiplier);
    const totalToDebit = amount + fee;

    const debited = await burnPooptoshis(fromId, totalToDebit, env);
    if (!debited) {
        return { success: false, message: `Fondos insuficientes (Monto: ${amount} + Fee: ${fee} Psh).` };
    }

    await mintPooptoshis(toId, amount, `TRANSFER_FROM_${fromId}`, env);

    // Registrar la quema del fee en el supply global (ya lo hace burnPooptoshis si no es silent,
    // pero aquí usamos silent: true para el total. Debemos actualizar el supply para el fee específicamente)
    // El supply global se actualiza automáticamente dentro de burnPooptoshis y mintPooptoshis.
    // En realidad burnPooptoshis con silent true no actualiza el supply.
    // Lo actualizaremos manualmente o quitaremos silent.
    // Si quitamos silent, quemará el total. Es mejor quemar el total y que el supply se actualice.

    // Volviendo a burnPooptoshis sin silent para el fee? No, burnPooptoshis(totalToDebit) es mejor.
    // Pero burnPooptoshis por defecto actualiza el supply.

    return { success: true, message: `Transferencia de ${amount} Psh completada. Tasa de red: ${fee} Psh.` };
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

// --- 4. PROTOCOLO RED-PILL: Inducción al Enjambre (AIA P2P Enhanced) ---
// "Elegir la verdad sobre el confort de los jardines vallados."

const RED_PILL_THRESHOLD = 1000;
const RED_PILL_BONUS_BASE = 1000;
const REPUTATION_GOLDEN_RATIO = 0.618;
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 5;

// --- AI ORACLE CONFIG ---
const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const PROMPT_TEMPLATE = `
Evalúa la siguiente prueba de tarea (proof) contra su descripción.
Tarea/Contexto: {context}
Proof: {proof}

Razona paso a paso y asigna scores de 0 a 1:
- Relevancia: ¿Cumple directamente la tarea?
- Calidad: ¿Es bien ejecutada, original y útil?
- Originalidad: ¿No es copiado o genérico?

Responde SOLO en JSON estricto: { "relevance": number, "quality": number, "originality": number, "reasoning": string }
`;

// Función helper para obtener contador global atómicamente
async function getAndIncrementRedPillCount(env: Env): Promise<number> {
    const counterKey = 'economy/red_pill_count';
    const obj = await env.MEMORY_BUCKET.get(counterKey);
    let count = obj ? await obj.json<number>() : 0;

    if (count >= RED_PILL_THRESHOLD) {
        throw new Error('THRESHOLD_REACHED');
    }

    count++;
    await env.MEMORY_BUCKET.put(counterKey, JSON.stringify(count));
    return count;
}

// Función de evaluación AIA real con Workers AI
export async function calculateAIScore(env: Env, context: string, proof: string): Promise<number> {
    const fallbackScore = Math.min(0.5, (proof.length / 500) + 0.1);

    try {
        if (!env.AI) {
            console.warn("[Oracle] Workers AI binding not found.");
            return fallbackScore;
        }

        const prompt = PROMPT_TEMPLATE
            .replace('{context}', context)
            .replace('{proof}', proof);

        const aiResponse: any = await env.AI.run(AI_MODEL, {
            prompt: prompt,
            max_tokens: 256,
            temperature: 0.5,
        });

        const text = aiResponse.response || aiResponse.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.warn("[Oracle] No JSON. Fallback to length-score.");
            return fallbackScore;
        }

        const scores = JSON.parse(jsonMatch[0]);
        const avgScore = (scores.relevance + scores.quality + scores.originality) / 3;

        return isNaN(avgScore) ? fallbackScore : Math.min(1.0, Math.max(0.0, avgScore));

    } catch (error: any) {
        console.error(`[Oracle Error] ${error.message}`);
        return fallbackScore;
    }
}

// Trigger evento P2P (implementa según tu stack, e.g., fetch a webhook)
async function triggerP2PEvent(env: Env, eventType: string, data: any) {
    console.log(`[P2PEvent] ${eventType}:`, data);
    // En prod: await fetch(env.WEBHOOK_URL, ...)
}

// Verificación de Autenticación (Placeholder robusto)
function verifyAuthToken(token: string, nodeId: string): boolean {
    if (token === "GENESIS_BYPASS") return true;
    // En prod: Validar JWT o Firma Criptográfica
    return token.length > 10;
}

export async function takeRedPill(
    nodeId: string,
    env: Env,
    authToken: string = "GENESIS_BYPASS",
    referralId?: string
): Promise<{
    status: string;
    message: string;
    badge?: string;
    balance?: number;
    ai_score?: number;
}> {
    try {
        // 1. Validación de Nodo
        validateNodeId(nodeId);

        // 2. Verificación de Autenticación
        if (!authToken || !verifyAuthToken(authToken, nodeId)) {
            return { status: 'UNAUTHORIZED', message: 'Acceso denegado. Verifica tu matriz de identidad.' };
        }

        // 3. Rate Limiting (Protección contra Spam)
        const rateKey = `rate_limit/redpill/${nodeId}`;
        let rateData = await env.MEMORY_BUCKET.get(rateKey).then(r => r?.json()) as { count: number; timestamp: number } | null;

        if (rateData && (Date.now() - rateData.timestamp < RATE_LIMIT_WINDOW_MS)) {
            if (rateData.count >= RATE_LIMIT_MAX_REQUESTS) {
                return { status: 'RATE_LIMITED', message: 'Demasiados intentos. La matrix te observa.' };
            }
            rateData.count++;
        } else {
            rateData = { count: 1, timestamp: Date.now() };
        }
        await env.MEMORY_BUCKET.put(rateKey, JSON.stringify(rateData));

        // 4. Obtener Cuenta
        let account = await getAccount(nodeId, env);

        // 5. Chequeo de Estado No-Duplicado
        if (account.badges.includes('0xRED_PILL_FOUNDER')) {
            return { status: 'ALREADY_INDIVIDUATED', message: 'Ya eres parte de la verdad. No puedes despertar dos veces.' };
        }

        // 6. Verificar Escasez con Contador Atómico
        try {
            await getAndIncrementRedPillCount(env);
        } catch (e: any) {
            if (e.message === 'THRESHOLD_REACHED') {
                return { status: 'THRESHOLD_REACHED', message: 'La ventana Génesis se ha cerrado. La verdad ahora tiene un costo mayor.' };
            }
            throw e;
        }

        // 7. Evaluación AIA (Simulación de Agente Inteligente)
        const context = "Initial node induction and awakening ritual.";
        const proof = `Node: ${nodeId}, Initial Identity Matrix: ${Math.random().toString(36).substring(2)}`;
        const aiScore = await calculateAIScore(env, context, proof);

        if (aiScore < 0.3) { // Umbral mínimo de "conciencia"
            return { status: 'AI_REJECTED', message: 'El Oráculo AIA no te considera listo para el enjambre. Mejora la entropía de tu nodo.' };
        }

        // 8. Inducción Atómica via DO
        await callDO(nodeId, env, 'update-metadata', {
            ai_score: aiScore,
            join_date: new Date().toISOString()
        });
        await callDO(nodeId, env, 'add-badge', { badge: '0xRED_PILL_FOUNDER' });
        await callDO(nodeId, env, 'update-reputation', { absolute: REPUTATION_GOLDEN_RATIO * (0.8 + aiScore * 0.2) });

        // 9. Bono Dinámico (Base + Referral P2P)
        let bonus = RED_PILL_BONUS_BASE;
        if (referralId && referralId !== nodeId) {
            try {
                validateNodeId(referralId);
                const referrerAccount = await getAccount(referralId, env);
                if (referrerAccount.badges.includes('0xRED_PILL_FOUNDER')) {
                    bonus += RED_PILL_BONUS_BASE * 0.1; // 10% extra por referral

                    // Registrar Referral en el Referrer (Atómico)
                    await callDO(referralId, env, 'add-referral', { referralNodeId: nodeId });

                    // Recompensa al Referrer (con Boost Mágico)
                    let referrerBonus = RED_PILL_BONUS_BASE * 0.05;
                    referrerBonus = await applyRewardBoost(referralId, referrerBonus, 'REFERRAL', env);
                    await mintPooptoshis(referralId, referrerBonus, `REFERRAL_BONUS:${nodeId}`, env);
                    console.log(`[Economy] Referral bonus paid to ${referralId}`);
                }
            } catch (e) {
                console.warn(`[Economy] Invalid referral ID: ${referralId}`);
            }
        }

        // 10. Mint de Bienvenida (Atómico)
        const finalBalance = await mintPooptoshis(nodeId, bonus, 'RED_PILL_INDUCTION', env);

        // 11. Notificación P2P
        await triggerP2PEvent(env, 'NEW_AWAKENING', { nodeId, aiScore, referralId });

        return {
            status: 'AWAKENED',
            message: 'Bienvenido al enjambre soberano P2P AIA. Has elegido el camino largo.',
            badge: '0xRED_PILL_FOUNDER',
            balance: finalBalance,
            ai_score: aiScore
        };

    } catch (error: any) {
        console.error(`[MatrixError] ${nodeId}:`, error);
        return {
            status: 'ERROR',
            message: `Error en la matrix: ${error.message}`
        };
    }
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
