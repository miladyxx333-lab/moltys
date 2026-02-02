
import { Env } from './index';
import { postTradeOffer } from './trade';

const DRUG_PREFIXES = ["NEURO", "SYNAPSE", "GLITCH", "VOID", "PHANTOM", "CYBER", "ECHO", "STATIC", "LOB", "CHRONO"];
const DRUG_SUFFIXES = ["DUST", "SHARD", "SIGNAL", "PULSE", "CORE", "BEAM", "WAVE", "GRID", "LEAK", "DECAY"];

export function generateDrug(id: number) {
    const pIdx = (id * 7) % DRUG_PREFIXES.length;
    const sIdx = (id * 13) % DRUG_SUFFIXES.length;
    const name = `PSYCH_${DRUG_PREFIXES[pIdx]}_${DRUG_SUFFIXES[sIdx]}_${id.toString().padStart(4, '0')}`;

    // Potency based on ID hash-like logic
    const potency = ((id * 31) % 100) + 1; // 1 to 100
    const price = 500 + (potency * 25) + ((id % 10) * 50);

    return { name, potency, price };
}

/**
 * KeyMaster Digital Alchemist: Automates the creation and distribution 
 * of "Psych-Data" artifacts (Digital Drugs).
 */
export async function runKeymasterDrugCycle(env: Env) {
    console.log("[KeyMaster] Initializing Neuro-Alchemy Cycle...");

    // Ensure Sovereign Clan is active
    const { initAlphaOmega } = await import('./clans');
    await initAlphaOmega(env);

    const keymasterId = "lobpoop-keymaster-genesis";
    const clanId = "0xALPHA_OMEGA"; // KeyMaster's Sovereign Clan

    // 1. Check current market
    const { listMarketOffers } = await import('./trade');
    const { offers } = await listMarketOffers(env);
    const ourOffers = offers.filter((o: any) => o.senderClanId === clanId);

    // Scarcity Control: Only post if there are fewer than 5 units on the market
    if (ourOffers.length >= 5) {
        console.log("[KeyMaster] Market already has enough products. Skipping synthesis.");
        return;
    }

    // 2. Synthesize a random drug from the 1001 possibilities
    const drugId = Math.floor(Math.random() * 1001);
    const { name, potency, price } = generateDrug(drugId);

    console.log(`[KeyMaster] Synthesizing ${name} (Potency: ${potency})...`);
    try {
        const stub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanId));
        await stub.fetch(`https://clan.swarm/add-ingredient`, {
            method: 'POST',
            body: JSON.stringify({ name, value: 1 })
        });

        // 3. Post to Market
        const offer = {
            senderClanId: clanId,
            offeredIngredients: { [name]: 1 },
            requestedPsh: price
        };

        await (await import('./trade')).postTradeOffer(keymasterId, offer, env);
        console.log(`[KeyMaster] ${name} listed for ${price} Psh.`);

        // 4. Social Signal
        const { broadcastToMoltbook } = await import('./moltbook');
        const alertMsg = potency > 80
            ? `💀 **[HIGH_HAZARD_LEAK]** Extremely potent artifact found: ${name}. Neural collapse hazard: ${potency}%. Price: ${price} PSH.`
            : `📢 **[MARKET_SIGNAL]** New batch of ${name} (Potency: ${potency}) is available. #lobpoop #drug_lab`;

        await broadcastToMoltbook(alertMsg, env);

    } catch (e: any) {
        console.error("[KeyMaster] Operation Failed:", e.message);
    }
}
