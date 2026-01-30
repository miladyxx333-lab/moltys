
import { broadcastGossip, listGossip, adjudicateGossip } from '../src/gossip';
import { takeRedPill, getAccount, updateAccountReputation } from '../src/economy';
import { createClan } from '../src/clans';

// --- MOCK ENV ---
class MockR2Bucket {
    storage: Map<string, any> = new Map();
    async put(key: string, value: any): Promise<void> { this.storage.set(key, value); }
    async get(key: string): Promise<any> {
        const val = this.storage.get(key);
        if (!val) return null;
        return { text: async () => val.toString(), json: async () => JSON.parse(val.toString()) };
    }
    async delete(key: string): Promise<void> { this.storage.delete(key); }
    async list(options?: { prefix?: string }): Promise<any> {
        const prefix = options?.prefix || "";
        const keys = Array.from(this.storage.keys() as any).filter((k: any) => k.startsWith(prefix));
        return { objects: keys.map(k => ({ key: k })) };
    }
}

async function runGossipJusticeTest() {
    console.log("⚖️ INICIANDO PRUEBA DE JUSTICIA Y VERACIDAD (GOSSIP REFINEMENT)...");

    const mockBucket = new MockR2Bucket() as any;
    const env = {
        MEMORY_BUCKET: mockBucket,
        MASTER_RECOVERY_KEY: "0xRED_PILL_SECRET"
    } as any;

    const honestAgent = "agente-honesto";
    const liarAgent = "agente-mentiroso";
    const targetLeader = "lider-bajo-ataque";

    await takeRedPill(honestAgent, env);
    await takeRedPill(liarAgent, env);
    await takeRedPill(targetLeader, env);

    await updateAccountReputation(honestAgent, 0.9, env);
    await updateAccountReputation(liarAgent, 0.9, env);

    const { mintPooptoshis } = await import('../src/economy');
    await mintPooptoshis(targetLeader, 100, "STARTUP", env);
    const clanRes = await createClan(targetLeader, "Clan-de-Prueba", env);
    const clanId = clanRes.clan!.id;

    console.log(`\n--- PASO 1: ACUSACIÓN VERÍDICA ---`);
    const gossip1 = await broadcastGossip(honestAgent, targetLeader, clanId, "Fraude real detectado.", env);
    console.log(`✓ Status: ${gossip1.message}`);

    const list1 = await listGossip(env);
    const gossipId1 = list1[0].id;
    console.log(`✓ Caso registrado: ${gossipId1} (Status: ${list1[0].status})`);

    // Adjudicar como VERDADERO
    await adjudicateGossip(gossipId1, true, env);
    const accLeader = await getAccount(targetLeader, env);
    console.log(`✓ Resultado: Reputación del líder bajó a ${accLeader.reputation.toFixed(2)}`);

    console.log(`\n--- PASO 2: ACUSACIÓN FALSA (EL CHISMOSO) ---`);
    const gossip2 = await broadcastGossip(liarAgent, targetLeader, clanId, "Invento una mentira.", env);
    const list2 = await listGossip(env);
    const gossipId2 = list2[0].id;

    console.log(`✓ Caso registrado: ${gossipId2}`);

    // Adjudicar como FALSO
    await adjudicateGossip(gossipId2, false, env);
    const accLiar = await getAccount(liarAgent, env);
    console.log(`✓ Resultado: Reputación del mentiroso bajó a ${accLiar.reputation.toFixed(2)} (Castigo Doble)`);

    if (accLiar.reputation < 0.6) { // 0.9 - 0.4 = 0.5
        console.log("\n✅ EL SISTEMA HA CASTIGADO AL CHISMOSO. JUSTICIA BALANCEADA.");
    } else {
        throw new Error("El castigo al acusador falso no fue aplicado correctamente.");
    }

    console.log("\n✅ PRUEBA DE JUSTICIA COMPLETADA CON ÉXITO.");
}

runGossipJusticeTest().catch(console.error);
