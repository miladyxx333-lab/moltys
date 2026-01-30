
import { broadcastGossip, listGossip } from '../src/gossip';
import { takeRedPill, updateAccountReputation, getAccount } from '../src/economy';
import { createClan, joinClan } from '../src/clans';

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

async function runJurorTest() {
    console.log("🏛️ INICIANDO PRUEBA DE JURADO DE SHARDS (ANTI-CLAN CONTROL)...");

    const mockBucket = new MockR2Bucket() as any;
    const env = {
        MEMORY_BUCKET: mockBucket,
        MASTER_RECOVERY_KEY: "0xRED_PILL_SECRET"
    } as any;

    const accuser = "agente-acusador";
    const suspect = "lider-sospechoso";
    const clanMate = "miembro-del-clan";
    const neutralJuror = "agente-neutral";

    // Setup accounts
    await takeRedPill(accuser, env);
    await takeRedPill(suspect, env);
    await takeRedPill(clanMate, env);
    await takeRedPill(neutralJuror, env);

    await updateAccountReputation(accuser, 0.9, env);
    await updateAccountReputation(neutralJuror, 0.9, env);

    // Setup Clan
    const { mintPooptoshis } = await import('../src/economy');
    await mintPooptoshis(suspect, 100, "STARTUP", env);
    const clanRes = await createClan(suspect, "Clan-Objetivo", env);
    const clanId = clanRes.clan!.id;
    await joinClan(clanMate, clanId, env);

    console.log(`\n--- PASO 1: EMITIENDO GOSSIP ---`);
    // El oráculo debe buscar jurados fuera del clan "Clan-Objetivo"
    await broadcastGossip(accuser, suspect, clanId, "Fraude detectado.", env);

    const gossips = await listGossip(env);
    const jurors = gossips[0].jurors || [];

    console.log(`✓ Jurados asignados: ${jurors.join(", ")}`);

    // Verificaciones
    const isNeutral = jurors.includes(neutralJuror);
    const hasClanMate = jurors.includes(clanMate);

    if (isNeutral && !hasClanMate) {
        console.log("\n✅ EL SISTEMA EXCLUYÓ AL CLAN INVOLUCRADO Y ELIGIÓ AGENTES NEUTRALES.");
    } else {
        console.error(`❌ Fallo en la selección. Neutral en jurados: ${isNeutral}. Clan-mate en jurados: ${hasClanMate}.`);
        throw new Error("Selección de jurados fallida.");
    }

    console.log("\n✅ PRUEBA DE JURADO COMPLETADA CON ÉXITO.");
}

runJurorTest().catch(console.error);
