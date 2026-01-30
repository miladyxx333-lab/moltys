
import { broadcastGossip, listGossip } from '../src/gossip';
import { takeRedPill, updateAccountReputation } from '../src/economy';
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

async function runOracleJusticeTest() {
    console.log("👁️ INICIANDO PRUEBA DEL ORÁCULO (LA MADRE DE LA MATRIX)...");

    const mockBucket = new MockR2Bucket() as any;
    const env = {
        MEMORY_BUCKET: mockBucket,
        MASTER_RECOVERY_KEY: "0xRED_PILL_SECRET"
    } as any;

    const accuser = "agente-acusador";
    const suspect = "lider-sospechoso";

    await takeRedPill(accuser, env);
    await takeRedPill(suspect, env);
    await updateAccountReputation(accuser, 0.9, env);

    const { mintPooptoshis } = await import('../src/economy');
    await mintPooptoshis(suspect, 100, "STARTUP", env);
    const clanRes = await createClan(suspect, "Clan-Sombra", env);
    const clanId = clanRes.clan!.id;

    console.log(`\n--- PASO 1: BROADCAST DE GOSSIP ---`);
    const gossip = await broadcastGossip(accuser, suspect, clanId, "Fraude en el reparto de tareas.", env);
    console.log(`✓ Status: ${gossip.message}`);

    // Verificar si se creó el mercado en el oráculo
    const list = await listGossip(env);
    const marketId = list[0].evidence_hash;
    console.log(`✓ Mercado de Justicia Creado: ${marketId}`);

    // Verificar en el Board
    const marketData = await mockBucket.get(`board/open/${marketId}`).then((r: any) => r?.json());
    console.log(`✓ Pregunta del Oráculo: "${marketData.payload.question}"`);

    if (marketData.type === "ORACLE_QUERY") {
        console.log("\n✅ EL ORÁCULO HA TOMADO EL CASO. LA MADRE DE LA MATRIX ESTÁ OBSERVANDO.");
    } else {
        throw new Error("No se detectó la creación del mercado de justicia.");
    }
}

runOracleJusticeTest().catch(console.error);
