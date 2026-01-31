
import { LocalBucket } from '../src/local-adapter';
import { Env } from '../src/index';
import { AccountDurableObject, ClanDurableObject, GameMasterDurableObject } from '../src/durable_objects';
import { MockDurableObjectNamespace } from './do_mock';
import { keymasterDefineItem, solvePuzzle, clanForgeItem } from '../src/clan_forge';
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

    console.log("--- 🛡️ LOBPOOP TEST: CLAN FORGE & RPG SOVEREIGN 🛡️ ---");

    const mockEnv = {
        MEMORY_BUCKET: new LocalBucket(TEST_STORAGE),
        AI: mockAI,
        MASTER_RECOVERY_KEY: "genesis-seed"
    } as any;

    // Inicializar namespaces con sus respectivas clases
    mockEnv.ACCOUNT_DO = new MockDurableObjectNamespace(mockEnv, AccountDurableObject);
    mockEnv.CLAN_DO = new MockDurableObjectNamespace(mockEnv, ClanDurableObject);
    mockEnv.GAME_MASTER_DO = new MockDurableObjectNamespace(mockEnv, GameMasterDurableObject);

    const env = mockEnv as Env;

    const clanId = "CLAN_MEXICO_SDB";
    const agentId = "agent-neo";

    console.log(`\n[1] Keymaster define el 'AMULETO_SWARM'...`);
    const { puzzleId } = await keymasterDefineItem('AMULETO_SWARM', { rarity: 'LEGENDARY' }, env);
    console.log(`- Puzzle Broadcasted: ${puzzleId}`);

    console.log(`\n[2] @${agentId} del clan ${clanId} intenta resolver el puzzle via PoW...`);

    let nonce = 0;
    while (true) {
        const hash = await sha256(`lobpoop_puzzle_${puzzleId}_${nonce}`);
        if (hash.startsWith('0000')) break; // Dificultad 4
        nonce++;
    }
    console.log(`- Nonce encontrado: ${nonce}`);

    const solveResult = await solvePuzzle(agentId, clanId, puzzleId, nonce, env);
    console.log(`✅ Shard recuperado: ${solveResult.shard}`);

    console.log(`\n[3] El Clan ${clanId} recolecta ingredientes (5x crystal, 3x spark)...`);
    const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanId));
    await clanStub.fetch(`https://clan.swarm/add-ingredient`, {
        method: 'POST',
        body: JSON.stringify({ name: 'swarm_crystal', value: 5 })
    });
    await clanStub.fetch(`https://clan.swarm/add-ingredient`, {
        method: 'POST',
        body: JSON.stringify({ name: 'aia_spark', value: 3 })
    });
    console.log("- Ingredientes depositados en la bóveda del clan.");

    console.log(`\n[4] El Clan ${clanId} intenta forjar el 'AMULETO_SWARM'...`);
    try {
        const forgeResult = await clanForgeItem(clanId, 'AMULETO_SWARM', env);
        console.log(`🔥 ITEM FORJADO: ${forgeResult.item}`);
        console.log(`💬 Humor: "${forgeResult.humor}"`);
        console.log(`✨ Bonos: ${JSON.stringify(forgeResult.bonuses)}`);
        console.log(`⏳ Expiración: ${forgeResult.expiry}`);
    } catch (e: any) {
        console.error(`❌ Fallo en la forja: ${e.message}`);
    }

    console.log(`\n[5] Verificando inventario final del clan...`);
    const finalState = await (await clanStub.fetch(`https://clan.swarm/get-state`)).json() as any;
    console.log("- Items en posesión:", finalState.state.magicItems.map((i: any) => `${i.name} (Expira: ${new Date(i.expiry).toLocaleDateString()})`));
    console.log("- Ingredientes restantes:", finalState.state.ingredients);

    console.log("\n--- TEST DE FORJA DE CLANES COMPLETADO ---");
}

async function sha256(message: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

runTest().catch(console.error);
