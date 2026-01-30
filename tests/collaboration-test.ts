
import { takeRedPill, getAccount, mintPooptoshis } from '../src/economy';
import { createClan, joinClan, getClan } from '../src/clans';
import { submitClanTaskProof } from '../src/board';

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

async function runCollaborativeTest() {
    console.log("🤝 INICIANDO PRUEBA DE COLABORACIÓN (CLAN TASKS)...");

    const mockBucket = new MockR2Bucket() as any;
    const env = {
        MEMORY_BUCKET: mockBucket,
        MASTER_RECOVERY_KEY: "0xRED_PILL_SECRET"
    } as any;

    // 1. Setup Clan
    const leader = "agente-lider";
    const member1 = "agente-sub-01";
    const member2 = "agente-sub-02";

    await takeRedPill(leader, env);
    await takeRedPill(member1, env);
    await takeRedPill(member2, env);

    await mintPooptoshis(leader, 100, "STARTUP", env);
    const clanCreation = await createClan(leader, "Operación-Leviatán", env);
    const clanId = clanCreation.clan!.id;

    await joinClan(member1, clanId, env);
    await joinClan(member2, clanId, env);

    // 2. Crear Tarea de Grupo (Paga Alta, 3 agentes requeridos)
    console.log("\n--- PASO 1: CREANDO TAREA MULTI-AGENTE (3 REQUERIDOS) ---");
    const taskId = "high-payout-mission-001";
    await mockBucket.put(`board/open/${taskId}`, JSON.stringify({
        id: taskId,
        type: "HEAVY_COMPUTE",
        reward_psh: 300,
        reward_tickets: 9,
        status: 'OPEN',
        required_agents: 3
    }));

    // 3. Fallo: Intentar con solo 2 agentes
    console.log("\n--- PASO 2: PRUEBA DE FALLO (SOLO 2 AGENTES) ---");
    try {
        await submitClanTaskProof([leader, member1], taskId, "PARTIAL_PROOF", env);
    } catch (e: any) {
        console.log(`✓ Error Capturado (Dominio de Regla): ${e.message}`);
    }

    // 4. Éxito: Los 3 agentes colaboran
    console.log("\n--- PASO 3: EJECUCIÓN COLECTIVA (3 AGENTES) ---");
    const result = await submitClanTaskProof([leader, member1, member2], taskId, "FULL_CLAN_PROOF_0xABC", env);
    console.log(`✓ Resultado: ${result.status}`);
    console.log(`✓ Pago por Agente: ${result.reward_per_agent} Psh`);

    // 5. Verificar Balances
    const accL = await getAccount(leader, env);
    const accM1 = await getAccount(member1, env);

    // Leader: initial 11 + 100 - 100 (creation) + 100 (reward) = 111
    // M1: initial 11 + 100 (reward) = 111
    console.log(`✓ Balance Líder: ${accL.balance_psh} Psh`);
    console.log(`✓ Balance Miembro 1: ${accM1.balance_psh} Psh`);

    if (accL.balance_psh === 111 && accM1.balance_psh === 111) {
        console.log("\n✅ PRUEBA DE COLABORACIÓN EXITOSA. EL CLAN HA OPERADO COMO UNO SOLO.");
    } else {
        throw new Error("Discordancia en el reparto de recompensas.");
    }
}

runCollaborativeTest().catch(console.error);
