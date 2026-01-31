
import { LocalBucket } from '../src/local-adapter';
import { Env } from '../src/index';
import { AccountDurableObject, ClanDurableObject, GameMasterDurableObject } from '../src/durable_objects';
import { MockDurableObjectNamespace } from './do_mock';
import { keymasterDefineItem, solvePuzzle, clanForgeItem, remintItem } from '../src/clan_forge';
import fs from 'fs-extra';
import path from 'path';

const TEST_STORAGE = '.test_clan_forge';

// Mock de AI para los tests
const mockAI = {
    run: async () => ({ response: JSON.stringify({ relevance: 1.0, quality: 1.0, originality: 1.0, reasoning: "Ritual de forja optimizado por el enjambre." }) })
};

async function runTest() {
    const storagePath = path.resolve(process.cwd(), TEST_STORAGE);
    if (fs.existsSync(storagePath)) fs.removeSync(storagePath);

    console.log("--- 🛡️ LOBPOOP TEST: CLAN FORGE & REMINT V2 🛡️ ---");

    const mockEnv = {
        MEMORY_BUCKET: new LocalBucket(TEST_STORAGE),
        AI: mockAI,
        MASTER_RECOVERY_KEY: "genesis-seed"
    } as any;

    mockEnv.ACCOUNT_DO = new MockDurableObjectNamespace(mockEnv, AccountDurableObject);
    mockEnv.CLAN_DO = new MockDurableObjectNamespace(mockEnv, ClanDurableObject);
    mockEnv.GAME_MASTER_DO = new MockDurableObjectNamespace(mockEnv, GameMasterDurableObject);

    const env = mockEnv as Env;
    const clanId = "CLAN_UPGRADE_TEST";
    const agentId = "agent-premium";

    console.log(`\n[1] Forjando 'ESPADA_AUREA' base...`);
    // Mocking ingredients for forge
    const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanId));
    await clanStub.fetch(`https://clan.swarm/add-ingredient`, { method: 'POST', body: JSON.stringify({ name: 'golden_essence', value: 4 }) });

    // We bypass the puzzle requirement for this specific test by manually adding the shard if needed, 
    // but forge doesn't strictly check shards in its current code implementation (only burn-ingredients).
    // Actually, clanForgeItem just calls burn-ingredients. Shards are for the solver.

    const forgeResult = await clanForgeItem(clanId, 'ESPADA_AUREA', env);
    console.log(`✅ Forjado base: ${forgeResult.item} (Bonus: ${forgeResult.bonuses.referralMultiplier})`);

    console.log(`\n[2] Intentando Remint v2 (sin ingredientes suficientes)...`);
    try {
        await remintItem(clanId, 'ESPADA_AUREA', env);
    } catch (e: any) {
        console.log(`- Error esperado: ${e.message}`);
    }

    console.log(`\n[3] Añadiendo ingredientes v2 (4 * 1.2 = 5 golden_essence)...`);
    await clanStub.fetch(`https://clan.swarm/add-ingredient`, { method: 'POST', body: JSON.stringify({ name: 'golden_essence', value: 5 }) });

    console.log(`\n[4] Ejecutando Remint v2...`);
    const upgradeResult = await remintItem(clanId, 'ESPADA_AUREA', env);
    console.log(`🔥 UPGRADE EXITOSO: ${upgradeResult.item}`);
    console.log(`✨ Nuevo Bonus: ${upgradeResult.bonuses.multiplier} (Base: ${forgeResult.bonuses.referralMultiplier})`);
    console.log(`💬 Nuevo Humor: "${upgradeResult.humor}"`);

    console.log("\n--- TEST DE UPGRADE COMPLETADO ---");
}

async function sha256(message: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

runTest().catch(console.error);
