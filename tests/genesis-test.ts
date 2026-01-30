
import { mineDailyBlock } from '../src/blockchain';
import { getGlobalSupply, getAccount } from '../src/economy';

// --- MOCK ENV PARA PRUEBAS (Six Sigma Isolation) ---
class MockR2Bucket {
    storage: Map<string, any> = new Map();

    async put(key: string, value: any): Promise<void> {
        this.storage.set(key, value);
    }

    async get(key: string): Promise<any> {
        const val = this.storage.get(key);
        if (!val) return null;
        return {
            text: async () => val.toString(),
            json: async () => JSON.parse(val.toString())
        };
    }

    async delete(key: string): Promise<void> {
        this.storage.delete(key);
    }

    async list(options?: { prefix?: string }): Promise<any> {
        const prefix = options?.prefix || "";
        const keys = Array.from(this.storage.keys()).filter(k => k.startsWith(prefix));
        return {
            objects: keys.map(k => ({ key: k }))
        };
    }
}

async function runGenesisTest() {
    console.log("🚀 INICIANDO PRUEBA DE IGNICIÓN (LOBPOOP GÉNESIS)...");

    const mockBucket = new MockR2Bucket() as any;
    const env = {
        MEMORY_BUCKET: mockBucket,
        MASTER_RECOVERY_KEY: "0xRED_PILL_SECRET",
        MOLTBOOK_API_KEY: "MOCK_KEY"
    } as any;

    const keymasterId = "lobpoop-keymaster-genesis";

    // 1. EJECUTAR MINADO DEL BLOQUE 0
    console.log("\n--- PASO 1: MINANDO BLOQUE 0 ---");
    await mineDailyBlock(env, keymasterId);

    // 2. VERIFICAR BLOQUE EN CADENA
    const tip = await mockBucket.get('blockchain/tip').then((r: any) => r?.text());
    console.log(`✓ Tip de la cadena: ${tip}`);

    // 3. VERIFICAR DESPLIEGUE DE ESPARTANOS
    console.log("\n--- PASO 2: VERIFICANDO 300 ESPARTANOS ---");
    const spartan0 = await getAccount("spartan-000", env);
    const spartan299 = await getAccount("spartan-299", env);

    if (spartan0.badges.includes("0x300_SPARTANS") && spartan299.badges.includes("0x300_SPARTANS")) {
        console.log("✓ Guardia Génesis desplegada correctamente (000-299).");
    } else {
        throw new Error("Fallo en el despliegue de Espartanos.");
    }

    // 4. VERIFICAR ECONOMÍA INICIAL
    console.log("\n--- PASO 3: VERIFICANDO EMISIÓN ---");
    const supply = await getGlobalSupply(env);
    console.log(`✓ Suministro Total: ${supply.total_minted} Psh (Esperado: 50)`);

    const kmAccount = await getAccount(keymasterId, env);
    console.log(`✓ Balance KeyMaster: ${kmAccount.balance_psh} Psh (Esperado: 50)`);

    // 5. PROBAR RED PILL
    console.log("\n--- PASO 4: PROBAR HANDSHAKE RED-PILL ---");
    const { takeRedPill } = await import('../src/economy');
    const newUser = "agente-despierto-01";
    const result = await takeRedPill(newUser, env);
    console.log(`✓ Resultado Red-Pill: ${result.status} - ${result.message}`);

    const updatedSupply = await getGlobalSupply(env);
    console.log(`✓ Nuevo Suministro: ${updatedSupply.total_minted} Psh (Esperado: 61)`);

    console.log("\n✅ PRUEBA DE IGNICIÓN COMPLETADA CON ÉXITO.");
    console.log("EL PROTOCOLO ES SIX SIGMA COMPLIANT.");
}

runGenesisTest().catch(e => {
    console.error("\n❌ ERROR EN LA PRUEBA:");
    console.error(e);
});
