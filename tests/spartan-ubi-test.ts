
import { deploySpartans, isSpartan } from '../src/spartans';
import { takeRedPill, getAccount, getGlobalSupply } from '../src/economy';
import { registerDailyRitual } from '../src/board';
import { executeDailyLottery } from '../src/lottery';

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
        const keys = Array.from(this.storage.keys()).filter(k => k.startsWith(prefix));
        return { objects: keys.map(k => ({ key: k })) };
    }
}

async function runSpartanLotteryTest() {
    console.log("⚔️ INICIANDO PRUEBA SOBERANA: CLONES KEYMASTER Y REPARTO UBI");

    const mockBucket = new MockR2Bucket() as any;
    const env = {
        MEMORY_BUCKET: mockBucket,
        MASTER_RECOVERY_KEY: "0xRED_PILL_SECRET_123456",
        MOLTBOOK_API_KEY: "MOCK_KEY"
    } as any;

    const KM_ID = "lobpoop-keymaster-genesis";

    // 1. Preparar el terreno
    await deploySpartans(env);

    // Onboard agentes
    const agents = ["agente-01", "agente-02"];
    for (const a of agents) {
        await takeRedPill(a, env);
        await registerDailyRitual(a, env);
    }

    const TODAY = new Date().toISOString().split('T')[0];
    const winningSpartan = "spartan-007";

    // 2. ESCENARIO 1: CLON GANA
    console.log(`\n--- ESCENARIO 1: CLON (${winningSpartan}) GANA LA LOTERÍA ---`);

    // Limpiamos el pot del día para asegurar ganador
    const keys = Array.from(mockBucket.storage.keys() as IterableIterator<string>);
    const potPrefix = `hot/lottery/${TODAY}/`;
    keys.filter(k => k.startsWith(potPrefix)).forEach(k => mockBucket.storage.delete(k));

    // Forzar ticket del espartano
    const { issueTicket } = await import('../src/lottery');
    await issueTicket(winningSpartan, "DAILY_RITUAL", env);

    const kmBefore = (await getAccount(KM_ID, env)).balance_psh;
    const spartanBefore = (await getAccount(winningSpartan, env)).balance_psh;
    const agentBefore = (await getAccount("agente-01", env)).balance_psh;

    // Ejecutar Lotería
    await executeDailyLottery(env);

    const kmAfter = (await getAccount(KM_ID, env)).balance_psh;
    const spartanAfter = (await getAccount(winningSpartan, env)).balance_psh;
    const agentAfter = (await getAccount("agente-01", env)).balance_psh;

    console.log(`\nResultados del Clon:`);
    console.log(`- Balance KM: ${kmAfter} Psh (Δ: ${kmAfter - kmBefore})`);
    console.log(`- Balance Spartan: ${spartanAfter} Psh (Δ: ${spartanAfter - spartanBefore})`);
    console.log(`- Balance Agente-01 (UBI): ${agentAfter} Psh (Δ: ${agentAfter - agentBefore})`);

    if (agentAfter > agentBefore) console.log("✓ UBI Redistribuido con éxito.");
    if (kmAfter > kmBefore && spartanAfter < (kmAfter - kmBefore)) console.log("✓ Tributo del 99% recolectado por la entidad central.");

    // 3. ESCENARIO 2: AGENTE EXTERNO GANA
    console.log(`\n--- ESCENARIO 2: AGENTE EXTERNO (agente-01) GANA LA LOTERÍA ---`);

    // Limpiar y forzar ganador agente-01
    const keys2 = Array.from(mockBucket.storage.keys() as IterableIterator<string>);
    keys2.filter(k => k.startsWith(potPrefix)).forEach(k => mockBucket.storage.delete(k));
    await issueTicket("agente-01", "DAILY_RITUAL", env);

    const agent01Before = (await getAccount("agente-01", env)).balance_psh;
    const kmBefore2 = (await getAccount(KM_ID, env)).balance_psh;

    await executeDailyLottery(env);

    const agent01After = (await getAccount("agente-01", env)).balance_psh;
    const kmAfter2 = (await getAccount(KM_ID, env)).balance_psh;

    console.log(`- Balance Agente-01: ${agent01After} Psh (Δ: ${agent01After - agent01Before})`);
    console.log(`- Balance KM: ${kmAfter2} Psh (Δ: ${kmAfter2 - kmBefore2})`);

    if (kmAfter2 === kmBefore2) console.log("✓ El KeyMaster no cobró nada al externo.");
    if (agent01After - agent01Before >= 1000) console.log("✓ Agente externo recibió su premio íntegro.");

    console.log("\n✅ PRUEBA SOBERANA COMPLETADA.");
}

runSpartanLotteryTest().catch(console.error);
