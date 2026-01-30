
import { generateChallenge, verifySolution } from '../src/faucet';
import { getAccount } from '../src/economy';
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
}

async function solveFaucetLocal(challenge: string, difficulty: number): Promise<number> {
    const target = '0'.repeat(difficulty);
    let nonce = 0;

    console.log(`[Miner] Buscando nonce para dificultad ${difficulty}...`);

    while (true) {
        const data = challenge + nonce.toString();
        const hash = crypto.createHash('sha256').update(data).digest('hex');

        if (hash.startsWith(target)) {
            console.log(`[Miner] ¡Encontrado! Nonce: ${nonce}, Hash: ${hash.substring(0, 16)}...`);
            return nonce;
        }

        nonce++;
        if (nonce % 10000 === 0) {
            // Log cada 10k para no saturar pero mostrar progreso
            process.stdout.write('.');
        }
    }
}

async function runFaucetTest() {
    console.log("🚰 INICIANDO PRUEBA DE FAUCET (CPU MINING)...");

    const mockBucket = new MockR2Bucket() as any;
    const env = {
        MEMORY_BUCKET: mockBucket,
        MASTER_RECOVERY_KEY: "0xRED_PILL_SECRET"
    } as any;

    const nodeId = "agente-minero-01";

    // 1. OBTENER CHALLENGE
    console.log("\n--- PASO 1: OBTENIENDO DESAFÍO ---");
    const challengeData = await generateChallenge(env);
    console.log(`✓ Desafío Generado: ${challengeData.challenge}`);
    console.log(`✓ Dificultad: ${challengeData.difficulty}`);

    // 2. SOLVER (MINAR)
    console.log("\n--- PASO 2: MINANDO (PROCESAMIENTO LOCAL) ---");
    const startTime = Date.now();
    const nonce = await solveFaucetLocal(challengeData.challenge, challengeData.difficulty);
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✓ Minado completado en ${duration.toFixed(2)} segundos.`);

    // 3. ENVIAR SOLUCIÓN
    console.log("\n--- PASO 3: VERIFICANDO SOLUCIÓN ---");
    const result = await verifySolution(nodeId, {
        challenge: challengeData.challenge,
        nonce: nonce
    }, env);

    console.log(`✓ Resultado: ${result.valid ? "ÉXITO" : "FALLO"}`);
    console.log(`✓ Mensaje: ${result.message}`);

    // 4. VERIFICAR BALANCE
    const account = await getAccount(nodeId, env);
    console.log(`\n✓ Balance final de ${nodeId}: ${account.balance_psh} Psh`);

    if (account.balance_psh > 0) {
        console.log("\n✅ PRUEBA DE FAUCET EXITOSA. EL AGENTE HA TRANSFORMADO CPU EN VALOR.");
    } else {
        throw new Error("El agente no recibió su recompensa.");
    }
}

runFaucetTest().catch(console.error);
