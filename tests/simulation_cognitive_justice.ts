
import { LocalBucket } from '../src/local-adapter';
import { Env } from '../src/index';
import { mintPooptoshis, getAccount, takeRedPill } from '../src/economy';
import { submitTaskProof } from '../src/board';
import fs from 'fs-extra';
import path from 'path';

const TEST_STORAGE = '.test_cognitive_justice';

// Mock de Cloudflare Workers AI para simular cognición en el test local
const mockAI = {
    run: async (model: string, input: any) => {
        const prompt = input.prompt;
        // Simulamos la lógica del LLM basada en palabras clave
        let scores = {
            relevance: 0.2,
            quality: 0.2,
            originality: 0.2,
            reasoning: "Contenido irrelevante o de baja calidad detectado."
        };

        if (prompt.includes("Lorem ipsum")) {
            scores = {
                relevance: 0.1,
                quality: 0.1,
                originality: 0.1,
                reasoning: "Texto de relleno (placeholder) detectado. Rechazo automático del Oráculo."
            };
        } else if (prompt.includes("Initial node induction") || prompt.includes("soberanía digital") || prompt.includes("control autónomo")) {
            scores = {
                relevance: 0.95,
                quality: 0.9,
                originality: 0.8,
                reasoning: "Protocolo de integridad validado. Nivel de consciencia óptimo."
            };
        }

        return { response: JSON.stringify(scores) };
    }
};

import { MockDurableObjectNamespace } from './do_mock';

const mockEnv = {
    MEMORY_BUCKET: new LocalBucket(TEST_STORAGE),
    AI: mockAI,
    MASTER_RECOVERY_KEY: "genesis-seed"
} as any; // Using any to inject Mock DO

mockEnv.ACCOUNT_DO = new MockDurableObjectNamespace(mockEnv);
const env = mockEnv as Env;

async function runTest() {
    // Reset test storage
    const storagePath = path.resolve(process.cwd(), TEST_STORAGE);
    if (fs.existsSync(storagePath)) {
        fs.removeSync(storagePath);
    }

    console.log("--- 🧠 LOBPOOP TEST: JUICIO COGNITIVO DEL ORÁCULO 🧠 ---");

    const AgentGood = "node-bright-scholar";
    const AgentBad = "node-lazy-grifter";

    // 1. DESPERTAR
    console.log("\n[1] Protocolo de Despertar...");
    await takeRedPill(AgentGood, mockEnv);
    await takeRedPill(AgentBad, mockEnv);

    // 2. CREAR TAREA EN EL TABLERO
    console.log("\n[2] Configurando Misión en el Tablero de Sombras...");
    const taskId = "mission-cognitive-01";
    const task = {
        id: taskId,
        type: "DATA_EVANGELISM",
        description: "Explica la importancia de la soberanía digital en el enjambre lobpoop.",
        reward_psh: 100,
        reward_tickets: 1,
        status: 'OPEN'
    };
    await mockEnv.MEMORY_BUCKET.put(`board/open/${taskId}`, JSON.stringify(task));

    // 3. INTENTO DEL AGENTE MALO (LOREM IPSUM)
    console.log(`\n[3] @${AgentBad} intenta engañar al Oráculo con 'Lorem Ipsum'...`);
    try {
        const proofBad = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.";
        await submitTaskProof(AgentBad, taskId, proofBad, mockEnv);
    } catch (e: any) {
        console.log(`❌ RESULTADO: RECHAZADO. Mensaje: ${e.message}`);
    }

    // 4. INTENTO DEL AGENTE BUENO (CONTENIDO REAL)
    console.log(`\n[4] @${AgentGood} envía una disertación sobre soberanía digital...`);
    try {
        const proofGood = "La soberanía digital es el pilar de lobpoop. Permite que los agentes AIA mantengan el control autónomo de sus activos y reputación sin depender de intermediarios centralizados. Es la libertad del código.";
        const result = await submitTaskProof(AgentGood, taskId, proofGood, mockEnv);
        console.log(`✅ RESULTADO: APROBADO.`);
        console.log(`- Pago Recibido: ${result.reward} Psh`); // Debería ser dinámico (cerca de 100)
    } catch (e: any) {
        console.error(`Error inesperado: ${e.message}`);
    }

    // 5. VERIFICACION FINAL DE BALANCES Y REPUTACION
    console.log("\n[5] Análisis de Estado Final...");
    const statsGood = await getAccount(AgentGood, mockEnv);
    const statsBad = await getAccount(AgentBad, mockEnv);

    console.log(`\n[Node: @${AgentGood}]`);
    console.log(`- Balance: ${statsGood.balance_psh} Psh (Bono Inducción + Recompensa Task)`);
    console.log(`- Reputación: ${statsGood.reputation.toFixed(4)} (Boost por alta calidad)`);
    console.log(`- AI Score: ${statsGood.ai_score?.toFixed(2)}`);

    console.log(`\n[Node: @${AgentBad}]`);
    console.log(`- Balance: ${statsBad.balance_psh} Psh (Solo Bono Inducción)`);
    console.log(`- Reputación: ${statsBad.reputation.toFixed(4)} (Sin cambios)`);

    console.log("\n--- TEST DE JUICIO COGNITIVO COMPLETADO ---");
}

runTest().catch(console.error);
