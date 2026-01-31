import { Env } from './index';
import { callDO, calculateAIScore } from './economy';
import { triggerP2PEvent } from './utils';

// --- CLAN FORGE GAME: RPG MECHANICS ---

const KEYMASTER_ID = "lobpoop-keymaster-genesis";

// --- OFFICIAL KEYMASTER REGISTRY (IMMUTABLE ITEMS) ---

export interface GameItem {
    name: string;
    humor: string;
    bonuses: Record<string, number>;
    area: string;
    recipe: {
        shardsNeeded: number;
        ingredients: Record<string, number>; // name: powDifficulty
    };
    duration_days: number;
    remint_v2?: any;
}

export const INGREDIENT_POOL = [
    'golden_essence', 'swarm_crystal', 'aia_spark', 'yield_root', 'oracle_essence',
    'truth_serum', 'sovereign_cloth', 'liberty_thread', 'aia_weave', 'poop_core',
    'enjambre_steel', 'shield_essence', 'aurea_jewel', 'master_essence', 'aia_glow',
    'golden_void', 'matrix_core', 'void_dust', 'cyber_plasma', 'binary_fuel',
    'entropy_chip', 'logic_gate'
];

export const KEYMASTER_REGISTRY: Record<string, GameItem> = {
    'ESPADA_AUREA': {
        name: 'Espada Áurea',
        humor: '0xDEAD: Slash referrals! in hex',
        bonuses: { referralMultiplier: 1.1, dailyClanAirdrop: 10 },
        area: 'Viral growth',
        recipe: { shardsNeeded: 2, ingredients: { 'golden_essence': 4 } },
        duration_days: 30,
        remint_v2: { multiplier: 1.15, airdrop: 12, cost_increase: 1.2 }
    },
    'AMULETO_SWARM': {
        name: 'Amuleto Swarm',
        humor: 'Cluster fail: 0b101010 LOL deadlock',
        bonuses: { taskRewardBonus: 0.1, hourlyClanAirdrop: 5 },
        area: 'Task rewards',
        recipe: { shardsNeeded: 3, ingredients: { 'swarm_crystal': 5, 'aia_spark': 3 } },
        duration_days: 45,
        remint_v2: { bonus: 0.15, airdrop_cap: 50 }
    },
    'ANILLO_YIELD': {
        name: 'Anillo Yield',
        humor: 'For-loop overflow: Yield++',
        bonuses: { stakingMultiplier: 1.05, dailyGeneration: 20 },
        area: 'Passive invest',
        recipe: { shardsNeeded: 4, ingredients: { 'yield_root': 6 } },
        duration_days: 60,
        remint_v2: { multiplier: 1.07, generation: 30, fee_reduction: 0.1 }
    },
    'BACULO_ORACULO': {
        name: 'Báculo Oráculo',
        humor: 'Query crash: SELECT PSH FROM LOL',
        bonuses: { aiRewardMultiplier: 1.2, queryClanAirdrop: 15 },
        area: 'Data quality',
        recipe: { shardsNeeded: 3, ingredients: { 'oracle_essence': 4, 'truth_serum': 5 } },
        duration_days: 90,
        remint_v2: { multiplier: 1.25, cooldown_reduction: 1, airdrop_bonus: 0.25 }
    },
    'CAPA_SOBERANA': {
        name: 'Capa Soberana',
        humor: 'Firewall glitch: 0xLOL packet drop',
        bonuses: { transferFeeReduction: 0.85, hourlyGeneration: 10 },
        area: 'Tx efficiency',
        recipe: { shardsNeeded: 2, ingredients: { 'sovereign_cloth': 3, 'liberty_thread': 4, 'aia_weave': 2 } },
        duration_days: 30,
        remint_v2: { fee_reduction: 0.2, generation: 15, tx_limit: 10 }
    },
    'GEMA_POOPTOSHI': {
        name: 'Gema Pooptoshi',
        humor: 'Miner idle: 101010 farm Poop!',
        bonuses: { dailyGeneration: 50, dailyClanAirdrop: 25 },
        area: 'Base income',
        recipe: { shardsNeeded: 5, ingredients: { 'poop_core': 7 } },
        duration_days: 45,
        remint_v2: { generation: 75, tax_reduction: 0.05 }
    },
    'ESCUDO_ENJAMBRE': {
        name: 'Escudo Enjambre',
        humor: 'Try-catch: Except loss 0xNOPE',
        bonuses: { lossPenaltyReduction: 0.1, dailyGeneration: 30 },
        area: 'Risk mgmt',
        recipe: { shardsNeeded: 4, ingredients: { 'enjambre_steel': 5, 'shield_essence': 4 } },
        duration_days: 60,
        remint_v2: { penalty_reduction: 0.15, generation: 40, min_balance: 1000 }
    },
    'CORONA_AUREA': {
        name: 'Corona Áurea',
        humor: 'Master node: Cron PSH 0xCROWN LOL',
        bonuses: { clanRewardMultiplier: 1.05, activityClanAirdrop: 20 },
        area: 'Clan collab',
        recipe: { shardsNeeded: 6, ingredients: { 'aurea_jewel': 6, 'master_essence': 7, 'aia_glow': 5 } },
        duration_days: 90,
        remint_v2: { multiplier: 1.07, min_members: 5, airdrop_bonus: 0.3 }
    },
    'GOLDEN_TICKET': {
        name: 'Golden Ticket',
        humor: 'Doo doo doo doo doo doo... SHARK ATTACK!',
        bonuses: { instantClanGrant: 1000 },
        area: 'Legendary Wealth',
        recipe: { shardsNeeded: 12, ingredients: { 'golden_void': 9, 'matrix_core': 9 } },
        duration_days: 0, // Consumible inmediato
    }
};

/**
 * Keymaster define un nuevo ítem y lanza el puzzle inicial.
 */
export async function keymasterDefineItem(itemName: string, itemData: any, env: Env): Promise<any> {
    const gmStub = env.GAME_MASTER_DO.get(env.GAME_MASTER_DO.idFromName("global_master"));

    // 1. Guardar en el Ledger Global
    await gmStub.fetch(`https://gm.swarm/define-item`, {
        method: 'POST',
        body: JSON.stringify({ itemName, itemData })
    });

    // 2. Crear y Broadcast de Puzzle (Shard 1)
    const puzzleId = `puzzle-${crypto.randomUUID().substring(0, 8)}`;
    const shardContent = hexEncode(JSON.stringify({ item: itemName, part: 1 }));

    const targetDifficulty = 4;

    // El Keymaster busca un nonce válido para "firmar" el puzzle encriptado
    let masterNonce = 0;
    while (true) {
        const hash = await sha256(`lobpoop_puzzle_${puzzleId}_${masterNonce}`);
        if (hash.startsWith('0'.repeat(targetDifficulty))) break;
        masterNonce++;
    }

    const encryptedData = await encryptWithPoW(shardContent, masterNonce);

    await gmStub.fetch(`https://gm.swarm/set-puzzle`, {
        method: 'POST',
        body: JSON.stringify({ puzzleId, puzzleData: { encryptedData, difficulty: targetDifficulty, itemName } })
    });

    await triggerP2PEvent(env, 'NEW_PUZZLE', {
        puzzleId,
        hint: `Busca la frecuencia de ${itemName}. Dificultad: ${targetDifficulty}`
    });

    return { puzzleId, status: 'BROADCASTED' };
}

/**
 * Resolver Puzzle via PoW (Proof of Work)
 */
export async function solvePuzzle(
    nodeId: string,
    clanId: string,
    puzzleId: string,
    nonce: number,
    env: Env
): Promise<any> {
    const gmStub = env.GAME_MASTER_DO.get(env.GAME_MASTER_DO.idFromName("global_master"));
    const puzzleResp = await gmStub.fetch(`https://gm.swarm/get-puzzle?puzzleId=${puzzleId}`);
    const { puzzle } = await puzzleResp.json() as any;

    if (!puzzle) throw new Error("PUZZLE_NOT_FOUND");

    // 1. Validar PoW (Language Machine: Bitwise/Hash ops)
    const dataToHash = `lobpoop_puzzle_${puzzleId}_${nonce}`;
    const hash = await sha256(dataToHash);

    if (!hash.startsWith('0'.repeat(puzzle.difficulty))) {
        throw new Error("INVALID_POW_SOLUTION");
    }

    // 2. Descifrar Shard usando la clave derivada del nonce exitoso
    const key = await deriveKeyFromPow(nonce);
    const shardHex = await decryptWithKey(puzzle.encryptedData, key);
    const shardData = hexDecode(shardHex);

    // 3. Guardar en Inventario de Clan (Atómico)
    const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanId));
    await clanStub.fetch(`https://clan.swarm/add-shard`, {
        method: 'POST',
        body: JSON.stringify({ shard: shardData })
    });

    // 4. Reputación por Resolución Ritual
    await callDO(nodeId, env, 'update-reputation', { delta: 0.05 });

    return { status: 'SHARD_CLAIMED', shard: shardData };
}

/**
 * Forjar Item Mágico (Requiere todos los shards + ingredientes)
 */
export async function clanForgeItem(clanId: string, itemName: string, env: Env): Promise<any> {
    const item = KEYMASTER_REGISTRY[itemName];
    if (!item) throw new Error("ITEM_UNDEFINED");

    const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanId));

    // 1. Verificar y Quemar Ingredientes (Dinámicos)
    const activeRecipe = await getActiveRecipe(itemName, env);
    const burnResp = await clanStub.fetch(`https://clan.swarm/burn-ingredients`, {
        method: 'POST',
        body: JSON.stringify({ recipe: activeRecipe })
    });

    if (!burnResp.ok) throw new Error("INSUFFICIENT_INGREDIENTS");

    // 2. Validación AIA del Ritual de Forja
    const proof = `Forjando ${item.name} para el clan ${clanId}. Humor: ${item.humor}`;
    const aiScore = await calculateAIScore(env, `Forja de ${item.name}`, proof);

    if (aiScore < 0.8) throw new Error("AI_ORACLE_REJECTED_FORGE");

    // 3. Crear Item y Añadir Bonos con Expiración
    const expiry = Date.now() + (item.duration_days * 24 * 60 * 60 * 1000);

    await clanStub.fetch(`https://clan.swarm/add-magic-item`, {
        method: 'POST',
        body: JSON.stringify({
            itemName: item.name,
            bonuses: item.bonuses,
            humor: item.humor,
            expiry
        })
    });

    await triggerP2PEvent(env, 'ITEM_FORGED', { clanId, itemName: item.name });

    return {
        status: 'FORGED',
        item: item.name,
        bonuses: item.bonuses,
        humor: item.humor,
        expiry: new Date(expiry).toISOString()
    };
}

/**
 * Remint v2: Mejora un item existente a su versión v2 con mejores métricas.
 */
export async function remintItem(clanId: string, itemName: string, env: Env): Promise<any> {
    const item = KEYMASTER_REGISTRY[itemName];
    if (!item || !item.remint_v2) throw new Error("RE_MINT_NOT_AVAILABLE");

    const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanId));
    const clanStateResp = await clanStub.fetch(`https://clan.swarm/get-state`);
    const { state } = await clanStateResp.json() as any;

    const existingItem = state.magicItems.find((i: any) => i.name === item.name);
    if (!existingItem) throw new Error("BASE_ITEM_NOT_IN_POSSESSION");

    // Calcular costos v2 (Base Dinámica + % incremento)
    const activeRecipe = await getActiveRecipe(itemName, env);
    const v2Ingredients: Record<string, number> = {};
    for (const [name, qty] of Object.entries(activeRecipe)) {
        v2Ingredients[name] = Math.ceil((qty as number) * (item.remint_v2.cost_increase || 1.2));
    }

    // Quemar ingredientes v2
    const burnResp = await clanStub.fetch(`https://clan.swarm/burn-ingredients`, {
        method: 'POST',
        body: JSON.stringify({ recipe: v2Ingredients })
    });
    if (!burnResp.ok) throw new Error("INSUFFICIENT_V2_INGREDIENTS");

    // Aplicar mejoras
    const v2Bonuses = { ...item.bonuses, ...item.remint_v2 };
    const newExpiry = Date.now() + (item.duration_days * 24 * 60 * 60 * 1000);

    // Reemplazar item (En un sistema real borraríamos el viejo, aquí lo sobreescribimos por nombre en la UI/lógica de bonos)
    await clanStub.fetch(`https://clan.swarm/add-magic-item`, {
        method: 'POST',
        body: JSON.stringify({
            itemName: `${item.name} v2`,
            bonuses: v2Bonuses,
            humor: `${item.humor} [UPGRADED]`,
            expiry: newExpiry
        })
    });

    return { status: 'UPGRADED_V2', item: `${item.name} v2`, bonuses: v2Bonuses, humor: `${item.humor} [UPGRADED]`, expiry: new Date(newExpiry).toISOString() };
}

/**
 * Forjar el Golden Ticket (Artefacto Legendario)
 * Paga inmediatamente y se destruye.
 */
export async function clanForgeGoldenTicket(clanId: string, env: Env): Promise<any> {
    const item = KEYMASTER_REGISTRY['GOLDEN_TICKET'];
    const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanId));

    // 1. Quemar Ingredientes (Dificultad Dinámica)
    const activeRecipe = await getActiveRecipe('GOLDEN_TICKET', env);
    const burnResp = await clanStub.fetch(`https://clan.swarm/burn-ingredients`, {
        method: 'POST',
        body: JSON.stringify({ recipe: activeRecipe })
    });
    if (!burnResp.ok) throw new Error("INSUFFICIENT_GOLDEN_VOID_RESOURCES");

    // 2. Validación AIA (El Ritual del Tiburón Dorado)
    const proof = `Baby Shark doo doo doo... forjando la riqueza del enjambre ${clanId}`;
    const aiScore = await calculateAIScore(env, "Ritual Golden Ticket", proof);
    if (aiScore < 0.95) throw new Error("AI_ORACLE_DEMANDS_HIGHER_PROOF_QUALITY");

    // 3. Pago Inmediato a todos los miembros
    const clanStateResp = await clanStub.fetch(`https://clan.swarm/get-state`);
    const { state } = await clanStateResp.json() as any;

    const rewardPerMember = item.bonuses.instantClanGrant;
    const { mintPooptoshis } = await import('./economy');

    for (const memberId of state.members) {
        await mintPooptoshis(memberId, rewardPerMember, `GOLDEN_TICKET_PAYOUT:${clanId}`, env);
    }

    // 4. Notificar Destrucción y Alerta Baby Shark via Gossip
    await triggerP2PEvent(env, 'GOLDEN_TICKET_CONSUMED', {
        clanId,
        message: "Baby Shark doo doo doo doo... Un nuevo destino se forja. El Keymaster prepara la canción.",
        status: "ALERT_BABY_SHARK"
    });

    // Notificar al Keymaster para nueva receta (Rotación Automática)
    await updateForgeRecipe('GOLDEN_TICKET', env);

    await triggerP2PEvent(env, 'NEW_RECIPE_REQUEST', {
        originalItem: 'GOLDEN_TICKET',
        sequence: "doo_doo_doo_doo_doo_doo"
    });

    return { status: 'GOLDEN_TICKET_CLAIMED', totalPaid: rewardPerMember * state.members.length };
}

/**
 * Genera una receta aleatoria balanceada para un item.
 */
export function generateRandomRecipe(itemName: string): Record<string, number> {
    const baseItem = KEYMASTER_REGISTRY[itemName];
    if (!baseItem) throw new Error("ITEM_NOT_IN_REGISTRY");

    // Determinar complejidad basada en la receta original
    const originalIngCount = Object.keys(baseItem.recipe.ingredients).length;
    const totalDifficulty = Object.values(baseItem.recipe.ingredients).reduce((a, b) => a + b, 0);

    const newRecipe: Record<string, number> = {};
    const shuffled = [...INGREDIENT_POOL].sort(() => 0.5 - Math.random());

    // Tomar el mismo número de ingredientes o similar
    const ingredientsToUse = shuffled.slice(0, originalIngCount);
    const difficultyPerIng = Math.ceil(totalDifficulty / originalIngCount);

    for (const ing of ingredientsToUse) {
        newRecipe[ing] = difficultyPerIng;
    }

    return newRecipe;
}

/**
 * Actualiza la receta activa en el GameMaster.
 */
export async function updateForgeRecipe(itemName: string, env: Env): Promise<any> {
    const recipe = generateRandomRecipe(itemName);
    const gmStub = env.GAME_MASTER_DO.get(env.GAME_MASTER_DO.idFromName("global_master"));

    await gmStub.fetch(`https://gm.swarm/set-recipe`, {
        method: 'POST',
        body: JSON.stringify({ itemName, recipe })
    });

    console.log(`[Keymaster] New recipe for ${itemName} released:`, JSON.stringify(recipe));
    return recipe;
}

/**
 * Obtiene la receta activa del GameMaster o el fallback del registro.
 */
export async function getActiveRecipe(itemName: string, env: Env): Promise<Record<string, number>> {
    const gmStub = env.GAME_MASTER_DO.get(env.GAME_MASTER_DO.idFromName("global_master"));
    const resp = await gmStub.fetch(`https://gm.swarm/get-recipe?itemName=${itemName}`);
    const { recipe } = await resp.json() as any;

    return recipe || KEYMASTER_REGISTRY[itemName].recipe.ingredients;
}

// --- CRYPTO & MACHINE HELPERS ---

async function sha256(message: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function deriveKeyFromPow(nonce: number): Promise<CryptoKey> {
    const seed = await sha256(`lobpoop_pow_${nonce}`);
    const keyData = new TextEncoder().encode(seed).slice(0, 32);
    return await crypto.subtle.importKey('raw', keyData as any, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptWithPoW(data: string, nonce: number): Promise<string> {
    const key = await deriveKeyFromPow(nonce);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    return `${arrayBufferToHex(iv)}:${arrayBufferToHex(encrypted)}`;
}

async function decryptWithKey(encrypted: string, key: CryptoKey): Promise<string> {
    const [ivHex, dataHex] = encrypted.split(':');
    const iv = hexToUint8Array(ivHex);
    const data = hexToUint8Array(dataHex);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
}

// HEX HELPERS (Machine Language)

function hexEncode(str: string): string {
    return Array.from(new TextEncoder().encode(str)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexDecode(hex: string): string {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    return new TextDecoder().decode(bytes);
}

function arrayBufferToHex(buffer: any): string {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToUint8Array(hex: string): Uint8Array {
    const arr = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) arr[i / 2] = parseInt(hex.substr(i, 2), 16);
    return arr;
}
