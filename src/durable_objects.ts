
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

                // Si no existe, inicializar con la ID del DO (sharding por NodeId)
                if (!account) {
                    const nodeId = url.searchParams.get('nodeId') || "unknown";
                    account = this.initAccount(nodeId);
                }

                const body = request.method === 'POST' ? await request.json<any>() : {};

                switch (action) {
                    case 'get-account':
                        // Solo lectura dentro de la transacción asegura consistencia
                        break;

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

                    case 'update-account':
                        // Actualización masiva (usada por Inventory y Loot system)
                        const newAccountData = body.account;
                        if (newAccountData) {
                            // Preservamos el nodeId original para evitar secuestros de identidad via script
                            const safeNodeId = account.nodeId;
                            account = { ...newAccountData, nodeId: safeNodeId };
                        }
                        break;

                    default:
                        return new Response("Invalid DO Action", { status: 400 });
                }

                // Persistencia atómica
                await txn.put('account', account);
                await txn.put('ledger', ledger.slice(-100)); // Mantener solo últimos 100 logs en DO

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
            balance_psh: 0,
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
