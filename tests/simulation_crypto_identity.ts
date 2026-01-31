
import { LocalBucket } from '../src/local-adapter';
import { Env } from '../src/index';
import { getAccount, registerNodeKey, takeRedPill } from '../src/economy';
import { MockDurableObjectNamespace } from './do_mock';
import fs from 'fs-extra';
import path from 'path';

const TEST_STORAGE = '.test_crypto_identity';

// Mock de AI para los tests
const mockAI = {
    run: async () => ({ response: JSON.stringify({ relevance: 0.9, quality: 0.9, originality: 0.9, reasoning: "Crypto identity test logic enabled." }) })
};

async function runTest() {
    // Reset test storage
    const storagePath = path.resolve(process.cwd(), TEST_STORAGE);
    if (fs.existsSync(storagePath)) fs.removeSync(storagePath);

    console.log("--- 🔐 LOBPOOP TEST: IDENTIDAD CRIPTOGRÁFICA ED25519 🔐 ---");

    const mockEnv = {
        MEMORY_BUCKET: new LocalBucket(TEST_STORAGE),
        AI: mockAI,
        MASTER_RECOVERY_KEY: "genesis-seed"
    } as any;
    mockEnv.ACCOUNT_DO = new MockDurableObjectNamespace(mockEnv);
    const env = mockEnv as Env;

    const nodeId = "agent-crypto-neo";

    // 1. GENERAR LLAVES (Simulando el Cliente)
    console.log(`\n[1] @${nodeId} genera llaves Ed25519...`);
    // @ts-ignore
    const { subtle } = globalThis.crypto;
    const keyPair = await subtle.generateKey(
        { name: 'Ed25519' }, // Node 20 usa 'Ed25519' directamente
        true,
        ['sign', 'verify']
    );

    const publicSpki = await subtle.exportKey('spki', keyPair.publicKey);
    const publicSpkiBase64 = Buffer.from(publicSpki).toString('base64');

    // 2. REGISTRAR LLAVE PÚBLICA
    console.log("[2] Registrando llave pública en el Durable Object...");
    await registerNodeKey(nodeId, publicSpkiBase64, env);

    // 3. FIRMAR REQUEST (takeRedPill)
    console.log("[3] Preparando request firmado para inducción...");
    const message = {
        nodeId,
        timestamp: Date.now(),
        action: 'takeRedPill',
        data: {}
    };
    const messageStr = JSON.stringify(message);
    const messageBytes = new TextEncoder().encode(messageStr);
    const signature = await subtle.sign('Ed25519', keyPair.privateKey, messageBytes);
    const signatureBase64 = Buffer.from(signature).toString('base64');
    const messageBase64 = Buffer.from(messageBytes).toString('base64');

    // 4. VERIFICAR SERVER-SIDE (Directamente llamando al helper que usaremos en index.ts)
    console.log("[4] Verificando firma en el servidor...");
    // Mocking the request object as it would come into the worker
    const mockRequest = {
        headers: {
            get: (name: string) => {
                if (name === 'X-Signature') return signatureBase64;
                if (name === 'X-Message') return messageBase64;
                return null;
            }
        }
    } as any;

    const { verifySignedRequest } = await import('../src/auth');
    const verification = await verifySignedRequest(mockRequest, env);

    if (verification.success) {
        console.log("✅ RESULTADO: Firma validada con éxito. Acceso concedido.");
        // Proceder con la acción
        const result = await takeRedPill(verification.nodeId!, env, "SIGNED_REQUEST");
        console.log(`- Status: ${result.status}`);
        console.log(`- Mensaje: ${result.message}`);
    } else {
        console.error(`❌ ERROR: Verificación fallida: ${verification.message}`);
    }

    // 5. ATAQUE DE SUPLANTACIÓN (Fake Signature)
    console.log("\n[5] SIMULANDO ATAQUE: Agente malicioso intenta suplantar a @agent-crypto-neo...");
    const fakeMessage = { ...message, timestamp: Date.now(), action: 'takeRedPill' };
    const fakeMessageBase64 = Buffer.from(JSON.stringify(fakeMessage)).toString('base64');
    const fakeMockRequest = {
        headers: {
            get: (name: string) => {
                if (name === 'X-Signature') return "ZmFrZS1zaWduYXR1cmUtMTIzNDU2Nzg5MA=="; // Firma basura
                if (name === 'X-Message') return fakeMessageBase64;
                return null;
            }
        }
    } as any;

    try {
        const fakeVerification = await verifySignedRequest(fakeMockRequest, env);
        if (!fakeVerification.success) {
            console.log(`✅ RESULTADO: Ataque neutralizado. Oráculo rechazó firma: ${fakeVerification.message}`);
        } else {
            console.error("❌ ERROR CRÍTICO: El servidor aceptó una firma falsa.");
        }
    } catch (e) {
        console.log("Ataque falló por error de procesamiento (esperado).");
    }

    console.log("\n--- TEST DE IDENTIDAD CRIPTOGRÁFICA COMPLETADO ---");
}

runTest().catch(console.error);
