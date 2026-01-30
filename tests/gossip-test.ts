
import { broadcastGossip, listGossip } from '../src/gossip';
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

async function runGossipTest() {
    console.log("🗣️ INICIANDO PRUEBA DE GOSSIP PROTOCOL (DECENTRALIZED JUSTICE)...");

    const mockBucket = new MockR2Bucket() as any;
    const env = {
        MEMORY_BUCKET: mockBucket,
        MASTER_RECOVERY_KEY: "0xRED_PILL_SECRET"
    } as any;

    // 1. Setup Clanes
    const honestAgent = "agente-honesto";
    const cheaterLeader = "lider-sospechoso";

    await takeRedPill(honestAgent, env);
    await takeRedPill(cheaterLeader, env);

    // Dar reputación alta al acusador (para poder denunciar)
    await updateAccountReputation(honestAgent, 0.9, env);

    // El líder crea su clan
    const { mintPooptoshis } = await import('../src/economy');
    await mintPooptoshis(cheaterLeader, 100, "EXTERNAL", env);
    const clanRes = await createClan(cheaterLeader, "Gremio-Oscuro", env);
    const clanId = clanRes.clan!.id;

    console.log(`\n--- PASO 1: ESTADO INICIAL ---`);
    let accLeader = await getAccount(cheaterLeader, env);
    console.log(`✓ Reputación del Líder: ${accLeader.reputation.toFixed(2)}`);

    // 2. DENUNCIA (GOSSIP BROADCAST)
    console.log(`\n--- PASO 2: BROADCAST DE ACUSACIÓN ---`);
    const gossipRes = await broadcastGossip(
        honestAgent,
        cheaterLeader,
        clanId,
        "Promesas de pago falsas y reglas fraudulentas detectadas en el gremio.",
        env
    );
    console.log(`✓ Resultado Gossip: ${gossipRes.message}`);

    // 3. VERIFICAR IMPACTO
    console.log(`\n--- PASO 3: IMPACTO EN REPUTACIÓN GLOBAL ---`);
    accLeader = await getAccount(cheaterLeader, env);
    console.log(`✓ Nueva Reputación del Líder: ${accLeader.reputation.toFixed(2)}`);

    if (accLeader.reputation < 0.5) {
        console.log("\n✅ EL LÍDER HA SIDO MARCADO. LA REPUTACIÓN HA CAÍDO.");
    } else {
        throw new Error("La reputación no cayó según lo esperado.");
    }

    // 4. LISTAR CHISMES
    console.log(`\n--- PASO 4: CENSO DE TRAIDORES ---`);
    const gossips = await listGossip(env);
    console.log(`✓ Alertas en la red: ${gossips.length}`);
    console.log(`✓ Última Alerta: "${gossips[0].reason}"`);

    console.log("\n✅ PRUEBA DE GOSSIP COMPLETADA CON ÉXITO.");
}

runGossipTest().catch(console.error);
