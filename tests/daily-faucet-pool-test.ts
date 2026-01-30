
import { generateChallenge, verifySolution } from '../src/faucet';
import { getAccount, getGlobalSupply } from '../src/economy';
import { distributeFaucetPool } from '../src/tokenomics';
import crypto from 'crypto';

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

async function solveChallenge(challenge: string, difficulty: number): Promise<number> {
    const target = '0'.repeat(difficulty);
    let nonce = 0;
    while (true) {
        const data = challenge + nonce.toString();
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        if (hash.startsWith(target)) return nonce;
        nonce++;
    }
}

async function runDailyFaucetPoolTest() {
    console.log("🚰 INICIANDO PRUEBA DE POOL DIARIO (FAUCET)...");

    const mockBucket = new MockR2Bucket() as any;
    const env = {
        MEMORY_BUCKET: mockBucket,
        MASTER_RECOVERY_KEY: "0xRED_PILL_SECRET"
    } as any;

    const agents = [
        { id: "agente-minero-01", work: 3 }, // 3 soluciones
        { id: "agente-minero-02", work: 1 }  // 1 solución
    ];

    console.log("\n--- PASO 1: MINANDO DURANTE EL DÍA ---");
    for (const agent of agents) {
        for (let i = 0; i < agent.work; i++) {
            // Bypass cooldown for testing
            await mockBucket.delete(`faucet/cooldown/${agent.id}`);

            const challengeData = await generateChallenge(env);
            const nonce = await solveChallenge(challengeData.challenge, challengeData.difficulty);

            // Verificamos (esto otorga 1 Psh inmediato y 1 share)
            await verifySolution(agent.id, {
                challenge: challengeData.challenge,
                nonce: nonce
            }, env);
            console.log(`[Miner] ${agent.id} completó solución ${i + 1}`);
        }
    }

    console.log("\n--- PASO 2: DISTRIBUCIÓN DEL POOL DIARIO (CIERRE DE CICLO) ---");
    const poolResult = await distributeFaucetPool(env);

    console.log(`✓ Pool Distribuido: ${poolResult.distributed}`);
    console.log(`✓ Destinatarios: ${poolResult.recipients}`);

    const acc1 = await getAccount("agente-minero-01", env);
    const acc2 = await getAccount("agente-minero-02", env);

    console.log(`\nResultados Finales:`);
    console.log(`- Agente 01: ${acc1.balance_psh.toFixed(2)} Psh (Inmediato: 3, Pool: ${(acc1.balance_psh - 3).toFixed(2)})`);
    console.log(`- Agente 02: ${acc2.balance_psh.toFixed(2)} Psh (Inmediato: 1, Pool: ${(acc2.balance_psh - 1).toFixed(2)})`);

    const pool1 = acc1.balance_psh - 3;
    const pool2 = acc2.balance_psh - 1;
    const ratio = pool1 / pool2;
    console.log(`- Ratio de Pool (Esperado 3.0): ${ratio.toFixed(2)}`);

    if (Math.abs(ratio - 3.0) < 0.1) {
        console.log("\n✅ PRUEBA DE POOL DIARIO EXITOSA. DISTRIBUCIÓN PROPORCIONAL CONFIRMADA.");
    } else {
        throw new Error("La distribución del pool no fue proporcional.");
    }
}

runDailyFaucetPoolTest().catch(console.error);
