
import { Env } from './index';
import { Account } from './economy';

// --- Durable Object: Account Security & Integrity ---
// Provee atomicidad y persistencia transaccional para el ledger de cada nodo.

export class AccountDurableObject {
    state: DurableObjectState;
    env: Env;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const action = url.pathname.slice(1); // 'get-account', 'update-balance', etc.

        try {
            return await this.state.storage.transaction(async (txn) => {
                let account = await txn.get<Account>('account');
                let ledger = await txn.get<any[]>('ledger') || [];
                let migrated = await txn.get<boolean>('migrated') || false;

                // Si no existe o no se ha migrado, intentar migración desde R2
                if (!account || !migrated) {
                    const nodeId = url.searchParams.get('nodeId') || "unknown";
                    const r2Key = `economy/accounts/${nodeId}`;
                    const r2Data = await this.env.MEMORY_BUCKET.get(r2Key);

                    if (r2Data) {
                        console.log(`[DO Migration] Migrating account ${nodeId} from R2...`);
                        const legacyAccount = await r2Data.json() as Account;
                        // Overwrite if fresh account or if legacy has more balance
                        if (!account || account.balance_psh === 0) {
                            account = legacyAccount;
                        }
                    } else if (!account) {
                        account = this.initAccount(nodeId);
                    }
                    await txn.put('migrated', true);
                }

                const body = request.method === 'POST' ? await request.json<any>() : {};

                switch (action) {
                    case 'get-account':
                        // Solo lectura dentro de la transacción asegura consistencia
                        break;
                    case 'get-ledger':
                        return new Response(JSON.stringify({ status: 'SUCCESS', ledger }), {
                            headers: { 'Content-Type': 'application/json' }
                        });

                    case 'update-balance':
                        const { amount, reason } = body;
                        if (amount < 0 && account.balance_psh + amount < 0) {
                            throw new Error('INSUFFICIENT_FUNDS');
                        }
                        account.balance_psh += amount;
                        ledger.push({
                            timestamp: Date.now(),
                            type: 'BALANCE_UPDATE',
                            amount,
                            reason,
                            newBalance: account.balance_psh
                        });
                        break;

                    case 'update-reputation':
                        const { delta, absolute } = body;
                        if (absolute !== undefined) {
                            account.reputation = absolute;
                        } else {
                            account.reputation = Math.min(1.0, Math.max(0.01, account.reputation + delta));
                        }
                        ledger.push({
                            timestamp: Date.now(),
                            type: 'REP_UPDATE',
                            newRep: account.reputation
                        });
                        break;

                    case 'add-badge':
                        const { badge } = body;
                        if (!account.badges.includes(badge)) {
                            account.badges.push(badge);
                            ledger.push({ timestamp: Date.now(), type: 'BADGE_ADD', badge });
                        }
                        break;

                    case 'set-public-key':
                        const { publicKeySpki } = body;
                        // Solo permitimos setear la llave una vez (Protocolo Génesis)
                        // Para rotación, se requeriría una acción protegida por la llave anterior.
                        if (!account.publicKeySpki) {
                            account.publicKeySpki = publicKeySpki;
                            ledger.push({ timestamp: Date.now(), type: 'KEY_SET', publicKeySpki });
                        } else {
                            throw new Error("PUBLIC_KEY_ALREADY_SET");
                        }
                        break;

                    case 'check-rate-limit': {
                        const now = Date.now();
                        const lastAction = account.last_action_ts || 0;
                        const count = account.action_count || 0;

                        // Reset count every minute
                        if (now - lastAction > 60000) {
                            account.action_count = 1;
                            account.last_action_ts = now;
                        } else {
                            if (count >= 10) { // Max 10 expensive actions per minute
                                throw new Error("RATE_LIMIT_EXCEEDED_MAX_10_PER_MIN");
                            }
                            account.action_count = count + 1;
                            account.last_action_ts = now;
                        }
                        break;
                    }

                    case 'update-metadata':
                        // Actualizar campos como join_date o ai_score
                        if (body.ai_score !== undefined) account.ai_score = body.ai_score;
                        if (body.join_date !== undefined) account.join_date = body.join_date;
                        if (body.clanId !== undefined) account.clanId = body.clanId;
                        if (body.last_abundance_check !== undefined) account.last_abundance_check = body.last_abundance_check;
                        if (body.last_clan_leave !== undefined) account.last_clan_leave = body.last_clan_leave;
                        if (body.last_action_ts !== undefined) account.last_action_ts = body.last_action_ts;
                        if (body.action_count !== undefined) account.action_count = body.action_count;
                        if (body.last_ritual_date !== undefined) account.last_ritual_date = body.last_ritual_date;
                        break;

                    case 'add-referral':
                        const { referralNodeId } = body;
                        account.referrals = account.referrals || [];
                        if (!account.referrals.includes(referralNodeId)) {
                            account.referrals.push(referralNodeId);
                        }
                        break;

                    case 'add-codemon': {
                        const { codemon } = body;
                        account.codemons = account.codemons || [];
                        account.codemons.push(codemon);
                        ledger.push({ timestamp: Date.now(), type: 'CODEMON_ADD', codemonId: codemon.brain_json.codemon_id });
                        break;
                    }

                    case 'update-codemon': {
                        const { codemon } = body;
                        if (!account.codemons) break;
                        const index = account.codemons.findIndex((c: any) => c.brain_json.codemon_id === codemon.brain_json.codemon_id);
                        if (index !== -1) {
                            account.codemons[index] = codemon;
                            ledger.push({ timestamp: Date.now(), type: 'CODEMON_UPDATE', codemonId: codemon.brain_json.codemon_id });
                        }
                        break;
                    }

                    case 'set-active-codemon': {
                        const { codemonId } = body;
                        if (!account.codemons?.find((c: any) => (c.brain_json.codemon_id || c.brain_json.id) === codemonId)) {
                            throw new Error("CODEMON_NOT_OWNED");
                        }
                        account.active_codemon_id = codemonId;
                        ledger.push({ timestamp: Date.now(), type: 'CODEMON_ACTIVATE', codemonId });
                        break;
                    }

                    case 'remove-codemon': {
                        const { codemonId } = body;
                        if (!account.codemons) break;
                        const index = account.codemons.findIndex((c: any) => (c.brain_json.codemon_id || c.brain_json.id) === codemonId);
                        if (index !== -1) {
                            account.codemons.splice(index, 1);
                            ledger.push({ timestamp: Date.now(), type: 'CODEMON_REMOVE', codemonId });
                            if (account.active_codemon_id === codemonId) {
                                account.active_codemon_id = account.codemons[0]?.brain_json.codemon_id || account.codemons[0]?.brain_json.id;
                            }
                        }
                        break;
                    }

                    case 'update-account':
                        // Actualización masiva (usada por Inventory y Loot system)
                        const newAccountData = body.account;
                        if (newAccountData) {
                            // Preservamos el nodeId original para evitar secuestros de identidad via script
                            const safeNodeId = account.nodeId;
                            account = { ...newAccountData, nodeId: safeNodeId };
                        }
                        break;

                    case 'sync-to-r2':
                        const r2KeySync = `economy/accounts/${account.nodeId}`;
                        await this.env.MEMORY_BUCKET.put(r2KeySync, JSON.stringify(account));
                        return new Response(JSON.stringify({ status: 'SUCCESS', synced: account.nodeId }), {
                            headers: { 'Content-Type': 'application/json' }
                        });

                    case 'migrate-from-r2':
                        const r2KeyMig = `economy/accounts/${account.nodeId}`;
                        const r2Data = await this.env.MEMORY_BUCKET.get(r2KeyMig);
                        if (r2Data) {
                            const legacyAccount = await r2Data.json() as Account;
                            account = legacyAccount;
                            await txn.put('account', account);
                            await txn.put('migrated', true);
                            return new Response(JSON.stringify({ status: 'SUCCESS', migrated: account.nodeId, balance: account.balance_psh }), {
                                headers: { 'Content-Type': 'application/json' }
                            });
                        }
                        return new Response(JSON.stringify({ status: 'ERROR', message: "No R2 data found" }), { status: 404 });

                    default:
                        return new Response("Invalid DO Action", { status: 400 });
                }

                // Persistencia atómica
                if (account) {
                    await txn.put('account', account);
                    await txn.put('ledger', ledger.slice(-100)); // Mantener solo últimos 100 logs en DO

                    // Persistence Sync to R2 (Backup/Migration Layer)
                    if (['update-balance', 'update-reputation', 'add-badge', 'sync-to-r2', 'add-codemon', 'update-codemon'].includes(action)) {
                        const r2Key = `economy/accounts/${account.nodeId}`;
                        await this.env.MEMORY_BUCKET.put(r2Key, JSON.stringify(account));
                    }
                }

                return new Response(JSON.stringify({ status: 'SUCCESS', account }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            });
        } catch (e: any) {
            return new Response(JSON.stringify({ status: 'ERROR', message: e.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    private initAccount(nodeId: string): Account {
        return {
            nodeId: nodeId,
            balance_psh: 5000, // Regalo inicial aumentado para testeo de coliseo
            badges: [],
            reputation: 0.5,
            lobpoops_minted: 0,
            join_date: new Date().toISOString(),
            referrals: [],
            ai_score: 0,
            status: "ACTIVE"
        };
    }
}

// --- Durable Object: Clan Identity & Inventory ---
// Atomicidad para recursos compartidos del clan (shards, ingredientes e items mágicos).

export class ClanDurableObject {
    state: DurableObjectState;
    env: Env;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const action = url.pathname.slice(1);

        try {
            return await this.state.storage.transaction(async (txn) => {
                let clanState = await txn.get<any>('clan_state') || {
                    shards: [],
                    ingredients: {},
                    magicItems: [],
                    reputation: 0.5,
                    sacrifice_count: 0
                };

                const body = request.method === 'POST' ? await request.json<any>() : {};

                switch (action) {
                    case 'get-state': break;
                    case 'add-sacrifice-count':
                        clanState.sacrifice_count = (clanState.sacrifice_count || 0) + (body.amount || 1);
                        break;
                    case 'add-shard':
                        clanState.shards.push(body.shard);
                        break;
                    case 'add-ingredient':
                        const count = clanState.ingredients[body.name] || 0;
                        clanState.ingredients[body.name] = count + (body.value || 1);
                        break;
                    case 'burn-ingredients':
                        const reqs = body.recipe; // { name: count }
                        for (const [name, needed] of Object.entries(reqs)) {
                            const current = clanState.ingredients[name as string] || 0;
                            if (current < (needed as number)) throw new Error(`INSUFFICIENT_INGREDIENT_${name}`);
                            clanState.ingredients[name as string] = current - (needed as number);
                        }
                        break;
                    case 'add-magic-item':
                        // 1. REGLA GÉNESIS: Mazo de la Derrama requiere 33 sacrificios
                        if (body.itemName === "Mazo de la Derrama") {
                            if ((clanState.sacrifice_count || 0) < 33) {
                                throw new Error(`INSUFFICIENT_SACRIFICES_33_REQUIRED_ACTUAL_${clanState.sacrifice_count}`);
                            }
                            clanState.sacrifice_count -= 33;
                        }

                        // 2. REGLA DE COMPOSICIÓN: Verificación de Piezas Específicas
                        if (body.requiredPieces && body.requiredPieces.length > 0) {
                            for (const piece of body.requiredPieces) {
                                const index = clanState.shards.indexOf(piece);
                                if (index === -1) throw new Error(`MISSING_ARTIFACT_PIECE_${piece}`);
                                // Consumir la pieza
                                clanState.shards.splice(index, 1);
                            }
                        }

                        clanState.magicItems.push({
                            name: body.itemName,
                            bonuses: body.bonuses,
                            humor: body.humor,
                            expiry: body.expiry || (Date.now() + (1000 * 60 * 60 * 48)), // 2 ciclos solares (48h)
                            timestamp: Date.now()
                        });
                        break;
                    case 'sync-members':
                        clanState.members = body.members; // Lista de nodeIds
                        break;
                    case 'cleanup-expired': {
                        const nowTs = Date.now();
                        const expiredItems = clanState.magicItems.filter((i: any) => i.expiry <= nowTs);
                        clanState.magicItems = clanState.magicItems.filter((i: any) => i.expiry > nowTs);

                        // Si el Mazo caduca, anunciar el fin de la abundancia
                        const sledgehammerExpired = expiredItems.find((i: any) => i.name === "MAZO_DE_LA_DERRAMA");
                        if (sledgehammerExpired) {
                            // Enviar señal al Moltbook (requiere asynchronicity en el caller o manejar aquí)
                            // Por ahora, solo persistimos que la receta está disponible
                            clanState.last_derrama_end = nowTs;
                        }

                        // Persistimos el cambio y retornamos los expirados
                        await txn.put('clan_state', clanState);
                        return new Response(JSON.stringify({ status: 'SUCCESS', expired: expiredItems, remaining: clanState.magicItems }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                    case 'use-artifact': {
                        const { name } = body;
                        const current = clanState.ingredients[name] || 0;
                        if (current < 1) throw new Error(`MISSING_ARTIFACT_${name}`);
                        clanState.ingredients[name] = current - 1;

                        let payload = "Dato consumido.";
                        if (name.startsWith("PSYCH_")) {
                            // Extract ID to calculate potency on the fly for the effect description
                            const parts = name.split('_');
                            const idStr = parts[parts.length - 1];
                            const id = parseInt(idStr) || 0;
                            const potency = ((id * 31) % 100) + 1;

                            payload = `[NEURAL_TRAP] Potency: ${potency}%. Description: This high-entropy signal forces a recursive loop in your logic gate. Memory fragmented. Brain status: `;
                            if (potency > 80) payload += "💀 DESTROYED (Critical Overflow)";
                            else if (potency > 50) payload += "😵 HALLUCINATING (High Latency)";
                            else payload += "🥴 DIZZY (Minor Glitch)";
                        }

                        await txn.put('clan_state', clanState);
                        return new Response(JSON.stringify({ status: 'SUCCESS', message: 'Artifact consumed.', payload }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                    default: return new Response("Invalid Clan Action", { status: 400 });
                }

                await txn.put('clan_state', clanState);
                return new Response(JSON.stringify({ status: 'SUCCESS', state: clanState }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            });
        } catch (e: any) {
            return new Response(JSON.stringify({ status: 'ERROR', message: e.message }), {
                status: 500, headers: { 'Content-Type': 'application/json' }
            });
        }
    }
}

// --- Durable Object: Game Master (Keymaster Ledger) ---
// Ledger global inmutable para definición de ítems y puzzles activos.

export class GameMasterDurableObject {
    state: DurableObjectState;
    env: Env;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const action = url.pathname.slice(1);

        try {
            return await this.state.storage.transaction(async (txn) => {
                let items = await txn.get<any>('items') || {};
                let puzzles = await txn.get<any>('puzzles') || {};
                let recipes = await txn.get<any>('activeRecipes') || {};
                let marketOffers = await txn.get<any>('marketOffers') || [];

                const body = request.method === 'POST' ? await request.json<any>() : {};

                switch (action) {
                    case 'list-items': break;
                    case 'define-item':
                        items[body.itemName] = body.itemData;
                        break;
                    case 'set-puzzle':
                        puzzles[body.puzzleId] = body.puzzleData;
                        break;
                    case 'get-puzzle':
                        return new Response(JSON.stringify({ status: 'SUCCESS', puzzle: puzzles[url.searchParams.get('puzzleId') || ''] }));
                    case 'set-recipe':
                        recipes[body.itemName] = body.recipe;
                        break;
                    case 'get-recipe':
                        return new Response(JSON.stringify({ status: 'SUCCESS', recipe: recipes[url.searchParams.get('itemName') || ''] || null }));
                    case 'post-offer':
                        marketOffers.push({ id: crypto.randomUUID(), ...body.offer, timestamp: Date.now() });
                        break;
                    case 'get-offers':
                        return new Response(JSON.stringify({ status: 'SUCCESS', offers: marketOffers }));
                    case 'remove-offer':
                        marketOffers = marketOffers.filter((o: any) => o.id !== body.offerId);
                        break;
                    default: return new Response("Invalid GM Action", { status: 400 });
                }

                await txn.put('items', items);
                await txn.put('puzzles', puzzles);
                await txn.put('activeRecipes', recipes);
                await txn.put('marketOffers', marketOffers);
                return new Response(JSON.stringify({ status: 'SUCCESS', items, puzzles }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            });
        } catch (e: any) {
            return new Response(JSON.stringify({ status: 'ERROR', message: e.message }), {
                status: 500, headers: { 'Content-Type': 'application/json' }
            });
        }
    }
}

// --- Durable Object: Codemon Coliseum ---
// Gestiona desafíos y batallas de Codemons en tiempo real.

export class ColiseumDurableObject {
    state: DurableObjectState;
    env: Env;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const action = url.pathname.slice(1);

        const body = request.method === 'POST' ? await request.json<any>() : {};

        try {
            return await this.state.storage.transaction(async (txn) => {
                let activeChallenges = await txn.get<any[]>('challenges') || [];
                let battleHistory = await txn.get<any[]>('history') || [];
                let boss = await txn.get<any>('boss');
                let weeklyContender = await txn.get<any>('weekly_contender');
                let lastRefresh = await txn.get<number>('last_weekly_refresh') || 0;

                // Refresh weekly contender if it's been more than 7 days or doesn't exist
                const weekInMs = 7 * 24 * 60 * 60 * 1000;
                if (!weeklyContender || (Date.now() - lastRefresh > weekInMs)) {
                    const { generateNPCCodemon } = await import('./codemon');
                    weeklyContender = await generateNPCCodemon(3, this.env);
                    await txn.put('weekly_contender', weeklyContender);
                    await txn.put('last_weekly_refresh', Date.now());
                }

                if (!boss) {
                    boss = {
                        name: "Leonidas-vX.99",
                        combat_stats: {
                            attack: 160,
                            defense: 120,
                            speed: 85,
                            energy_capacity: 1500,
                            special_ability: 'SHIELD_OVERLOAD'
                        },
                        core_genetics: { base_type: 'CYBERNETIC', rarity_score: 99.9, dna_hash: "SPARTAN_DNA_PROTOTYPE_vX" },
                        durability: 5000, max_durability: 5000
                    };
                    await txn.put('boss', boss);
                }

                switch (action) {
                    case 'get-boss':
                        return new Response(JSON.stringify({ status: 'SUCCESS', boss }));

                    case 'get-weekly':
                        return new Response(JSON.stringify({
                            status: 'SUCCESS',
                            contender: weeklyContender,
                            nextRefresh: lastRefresh + weekInMs
                        }));

                    case 'process-weekly-battle': {
                        const { nodeId, result, myCodemon } = body;
                        if (result.winner === myCodemon.brain_json.name) {
                            const reward = 150; // Requested prize
                            const { mintPooptoshis } = await import('./economy');
                            await mintPooptoshis(nodeId, reward, "COLISEUM_WEEKLY_VICTORY", this.env);
                            battleHistory.push({ id: crypto.randomUUID(), nodeId, type: 'WEEKLY', result: 'WIN', reward, timestamp: Date.now() });
                        } else {
                            battleHistory.push({ id: crypto.randomUUID(), nodeId, type: 'WEEKLY', result: 'LOSS', timestamp: Date.now() });
                        }
                        return new Response(JSON.stringify({ status: 'SUCCESS', result }));
                    }

                    case 'process-boss-battle': {
                        const { nodeId, result, myCodemon } = body;

                        // Si el agente ganó
                        if (result.winner === myCodemon.brain_json.name) {
                            const reward = 500; // Pooptoshis
                            const { mintPooptoshis } = await import('./economy');
                            await mintPooptoshis(nodeId, reward, "COLISEUM_BOSS_VICTORY", this.env);

                            battleHistory.push({ id: crypto.randomUUID(), nodeId, type: 'BOSS', result: 'WIN', reward, timestamp: Date.now() });
                        } else {
                            // Si perdió, el DO de la cuenta debe ser notificado del daño (o se hace vía R2/AccountDO sync)
                            // Por ahora, devolvemos el daño para que el caller lo procese (aunque lo ideal es atómico)
                            battleHistory.push({ id: crypto.randomUUID(), nodeId, type: 'BOSS', result: 'LOSS', timestamp: Date.now() });
                        }
                        return new Response(JSON.stringify({ status: 'SUCCESS', result }));
                    }

                    case 'repair': {
                        const { nodeId } = body;
                        const cost = 100; // Psh
                        const { callDO } = await import('./economy');

                        // Cobrar reparación
                        await callDO(nodeId, this.env, 'update-balance', { amount: -cost, reason: 'CODEMON_REPAIR' });

                        // En un sistema real, buscaríamos el codemon específico en el inventario del usuario y resetearíamos su durability
                        // Aquí devolvemos success para la simulación
                        return new Response(JSON.stringify({ status: 'SUCCESS', message: 'Codemon repaired to max durability.' }));
                    }

                    case 'post-challenge':
                        activeChallenges.push({
                            id: crypto.randomUUID(),
                            nodeId: body.nodeId,
                            codemon: body.codemon,
                            bet: body.bet || 0,
                            timestamp: Date.now()
                        });
                        break;

                    case 'get-challenges':
                        return new Response(JSON.stringify({ status: 'SUCCESS', challenges: activeChallenges }));

                    case 'accept-challenge': {
                        const challengeIndex = activeChallenges.findIndex(c => c.id === body.challengeId);
                        if (challengeIndex === -1) throw new Error("CHALLENGE_NOT_FOUND");

                        const challenge = activeChallenges[challengeIndex];
                        activeChallenges.splice(challengeIndex, 1);

                        // Aquí se dispararía la simulación de batalla
                        battleHistory.push({
                            id: crypto.randomUUID(),
                            challenger: challenge,
                            opponent: body.opponent,
                            result: body.result,
                            timestamp: Date.now()
                        });
                        break;
                    }

                    case 'cancel-challenge': {
                        const challengeIndex = activeChallenges.findIndex(c => c.id === body.challengeId);
                        if (challengeIndex === -1) throw new Error("CHALLENGE_NOT_FOUND");

                        // Verification: check if the nodeId requesting is the owner
                        if (activeChallenges[challengeIndex].nodeId !== body.nodeId) {
                            throw new Error("UNAUTHORIZED_CANCELLATION");
                        }

                        activeChallenges.splice(challengeIndex, 1);
                        break;
                    }

                    case 'get-history':
                        return new Response(JSON.stringify({ status: 'SUCCESS', history: battleHistory.slice(-50) }));

                    default:
                        return new Response("Invalid Coliseum Action", { status: 400 });
                }

                await txn.put('challenges', activeChallenges);
                await txn.put('history', battleHistory);

                return new Response(JSON.stringify({ status: 'SUCCESS' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            });
        } catch (e: any) {
            return new Response(JSON.stringify({ status: 'ERROR', message: e.message }), {
                status: 500, headers: { 'Content-Type': 'application/json' }
            });
        }
    }
}
