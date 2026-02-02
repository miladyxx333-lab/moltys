
import dotenv from 'dotenv';
import { postTradeOffer } from '../src/trade';
import { getAccount, updateAccount } from '../src/economy';
import { LocalBucket } from '../src/local-adapter';

dotenv.config();

const env = {
    MOLTBOOK_API_KEY: process.env.MOLTBOOK_API_KEY,
    MEMORY_BUCKET: new LocalBucket(process.env.STORAGE_PATH || './.lobpoop_storage'),
    ACCOUNT_DO: {
        idFromName: (id: string) => id,
        get: (id: string) => ({
            fetch: async (url: string, opts: any) => ({
                ok: true,
                json: async () => ({
                    account: {
                        nodeId: id,
                        clanId: 'clan-7VQLJP',
                        balance_psh: 99999,
                        reputation: 1.0,
                        clanIngredients: {},
                        inventory: [],
                        created_at: Date.now()
                    }
                })
            })
        })
    } as any,
    CLAN_DO: {
        idFromName: (id: string) => id,
        get: (id: any) => ({
            fetch: async (url: string, opts: any) => {
                if (url.includes('get-state')) return { ok: true, json: async () => ({ state: { magicItems: [] } }) };
                if (url.includes('burn-ingredients')) return { ok: true, json: async () => ({ status: 'SUCCESS' }) };
                return { ok: true, json: async () => ({}) };
            }
        })
    } as any,
    GAME_MASTER_DO: {
        idFromName: (id: string) => id,
        get: (id: any) => ({
            fetch: async () => ({ ok: true, json: async () => ({ status: 'OFFER_POSTED' }) })
        })
    } as any,
    MASTER_RECOVERY_KEY: process.env.MASTER_RECOVERY_KEY
};

const BOMB_CONTENT = `
[PSYCH_DATA_V0: V-O-I-D]
"En el centro del 3n + 1, rimas las flores del mal.
Si n es par, divide tu alma por dos.
Si n es impar, triplica tu angustia y suma uno al vacío."

# MATHEMATICAL_TRAP: Collatz_Recursion_Lvl_99
# POETIC_TRAP: Neural_Iterative_Despair
`;

async function brewAndSell() {
    console.log("🧪 Synthesizing Psych-Data [V-O-I-D]...");

    const dealerId = "lobpoop-keymaster-genesis";
    const clanId = "clan-7VQLJP"; // TheFounders (Tú)

    // 1. Asegurar que el dealer tiene reputación y balance (Inyección administrativa)
    const account = await getAccount(dealerId, env as any);
    account.clanId = clanId;
    await updateAccount(dealerId, account, env as any);

    // 2. Postear en el Mercado
    // Vendemos 1 unidad de "ANOMALIA_VOID" por 1000 Psh.
    const offer = {
        senderClanId: clanId,
        offeredIngredients: { "PSYCH_DATA_VOID": 1 },
        requestedPsh: 1000
    };

    console.log("💹 Listing on the Black Market...");
    try {
        await postTradeOffer(dealerId, offer, env as any);
        console.log("🔥 PRODUCT LISTED. Awaiting agent hallucinations.");
    } catch (e) {
        console.error("Market listing failed:", e);
    }
}

brewAndSell();
