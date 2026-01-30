
import { deploySpartans } from '../src/spartans';
import { mineDailyBlock } from '../src/blockchain';
import { getAccount, takeRedPill } from '../src/economy';
import { createClan, joinClan, listClans, getClan } from '../src/clans';

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

async function runClanTest() {
    console.log("🛡️ INICIANDO PRUEBA DE CLANES SOBERANOS...");

    const mockBucket = new MockR2Bucket() as any;
    const env = {
        MEMORY_BUCKET: mockBucket,
        MASTER_RECOVERY_KEY: "0xRED_PILL_SECRET"
    } as any;

    const KM_ID = "lobpoop-keymaster-genesis";

    // 1. GÉNESIS
    console.log("\n--- PASO 1: GÉNESIS Y CLAN ALFA Y OMEGA ---");
    await deploySpartans(env);
    await mineDailyBlock(env, KM_ID); // Esto debería disparar initAlphaOmega

    const alphaOmega = await getClan("0xALPHA_OMEGA", env);
    console.log(`✓ Clan: ${alphaOmega?.name}`);
    console.log(`✓ Miembros iniciales: ${alphaOmega?.members.length}`);

    const kmAcc = await getAccount(KM_ID, env);
    console.log(`✓ ClanId del KeyMaster: ${kmAcc.clanId}`);

    // 2. CREACIÓN DE CLAN POR AGENTES
    console.log("\n--- PASO 2: FUNDACIÓN DE CLAN SOBERANO ---");
    const agent01 = "agente-01";
    await takeRedPill(agent01, env);

    // Necesita 100 Psh. Vamos a darle fondos (mint manual para simulación)
    const { mintPooptoshis } = await import('../src/economy');
    await mintPooptoshis(agent01, 200, "EXTERNAL_CAPITAL", env);

    const foundation = await createClan(agent01, "Cripto-Enjambre", env);
    console.log(`✓ Resultado Fundación: ${foundation.message}`);

    if (foundation.clan) {
        console.log(`✓ ID del Clan: ${foundation.clan.id}`);

        // 3. UNIRSE AL CLAN
        console.log("\n--- PASO 3: UNIÓN AL CLAN ---");
        const agent02 = "agente-02";
        await takeRedPill(agent02, env);
        const joinResult = await joinClan(agent02, foundation.clan.id, env);
        console.log(`✓ Resultado Join: ${joinResult.message}`);

        const updatedClan = await getClan(foundation.clan.id, env);
        console.log(`✓ Miembros del clan ${updatedClan?.name}: ${updatedClan?.members.join(', ')}`);

        const acc02 = await getAccount(agent02, env);
        console.log(`✓ ClanId del Agente 02: ${acc02.clanId}`);
    }

    // 4. LISTAR CLANES
    console.log("\n--- PASO 4: CENSO DE ALIANZAS ---");
    const clans = await listClans(env);
    console.log(`✓ Clanes Activos: ${clans.map(c => c.name).join(' | ')}`);

    console.log("\n✅ PRUEBA DE CLANES COMPLETADA CON ÉXITO.");
}

runClanTest().catch(console.error);
