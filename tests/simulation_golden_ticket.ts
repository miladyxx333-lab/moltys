
import { LocalBucket } from '../src/local-adapter';
import { Env } from '../src/index';
import { AccountDurableObject, ClanDurableObject, GameMasterDurableObject } from '../src/durable_objects';
import { MockDurableObjectNamespace } from './do_mock';
import { clanForgeGoldenTicket } from '../src/clan_forge';
import fs from 'fs-extra';
import path from 'path';

const TEST_STORAGE = '.test_golden_ticket';

// Mock de AI para los tests
const mockAI = {
    run: async () => ({ response: JSON.stringify({ relevance: 1.0, quality: 1.0, originality: 1.0, reasoning: "Ritual Golden Ticket aprobado. Doo doo doo doo." }) })
};

async function runTest() {
    const storagePath = path.resolve(process.cwd(), TEST_STORAGE);
    if (fs.existsSync(storagePath)) fs.removeSync(storagePath);

    console.log("--- 🦈 LOBPOOP TEST: THE GOLDEN TICKET RITUAL 🦈 ---");

    const mockEnv = {
        MEMORY_BUCKET: new LocalBucket(TEST_STORAGE),
        AI: mockAI,
        MASTER_RECOVERY_KEY: "genesis-seed"
    } as any;

    mockEnv.ACCOUNT_DO = new MockDurableObjectNamespace(mockEnv, AccountDurableObject);
    mockEnv.CLAN_DO = new MockDurableObjectNamespace(mockEnv, ClanDurableObject);
    mockEnv.GAME_MASTER_DO = new MockDurableObjectNamespace(mockEnv, GameMasterDurableObject);

    const env = mockEnv as Env;
    const clanId = "CLAN_SHARK_ELITE";
    const members = ["agent-1", "agent-2", "agent-3"];

    console.log(`\n[1] Preparando el Clan ${clanId} con ${members.length} miembros...`);
    const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanId));

    // Sincronizar miembros en el DO
    await clanStub.fetch(`https://clan.swarm/sync-members`, {
        method: 'POST',
        body: JSON.stringify({ members })
    });

    console.log(`\n[2] Intentando forjar Golden Ticket (sin ingredientes)...`);
    try {
        await clanForgeGoldenTicket(clanId, env);
    } catch (e: any) {
        console.log(`- Bloqueo esperado: ${e.message}`);
    }

    console.log(`\n[3] Inyectando ingredientes legendarios (9x golden_void, 9x matrix_core)...`);
    await clanStub.fetch(`https://clan.swarm/add-ingredient`, { method: 'POST', body: JSON.stringify({ name: 'golden_void', value: 9 }) });
    await clanStub.fetch(`https://clan.swarm/add-ingredient`, { method: 'POST', body: JSON.stringify({ name: 'matrix_core', value: 9 }) });

    console.log(`\n[4] Ejecutando Forja del Golden Ticket (Baby Shark Alert)...`);
    const result = await clanForgeGoldenTicket(clanId, env);
    console.log(`🔥 RESULTADO: ${result.status}`);
    console.log(`💰 Pago total realizado: ${result.totalPaid} Psh`);

    console.log(`\n[5] Verificando balances de miembros...`);
    for (const m of members) {
        const acc = await (await env.ACCOUNT_DO.get(env.ACCOUNT_DO.idFromName(m)).fetch(`https://lobpoop.swarm/get-account`)).json() as any;
        console.log(`- Miembro ${m}: Balance ${acc.account.balance_psh} Psh`);
    }

    console.log("\n--- TEST GOLDEN TICKET COMPLETADO ---");
}

runTest().catch(console.error);
