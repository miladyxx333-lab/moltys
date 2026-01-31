
import { LocalBucket } from '../src/local-adapter';
import { Env } from '../src/index';
import { AccountDurableObject, ClanDurableObject, GameMasterDurableObject } from '../src/durable_objects';
import { MockDurableObjectNamespace } from './do_mock';
import { processMagicItemRewards } from '../src/tokenomics';
import fs from 'fs-extra';
import path from 'path';

const TEST_STORAGE = '.test_lifecycle';

async function runTest() {
    const storagePath = path.resolve(process.cwd(), TEST_STORAGE);
    if (fs.existsSync(storagePath)) fs.removeSync(storagePath);

    console.log("--- 🌀 LOBPOOP TEST: ARTIFACT LIFECYCLE & GOSSIP 🌀 ---");

    const mockEnv = {
        MEMORY_BUCKET: new LocalBucket(TEST_STORAGE),
        AI: {},
        MASTER_RECOVERY_KEY: "genesis-seed"
    } as any;

    mockEnv.ACCOUNT_DO = new MockDurableObjectNamespace(mockEnv, AccountDurableObject);
    mockEnv.CLAN_DO = new MockDurableObjectNamespace(mockEnv, ClanDurableObject);
    mockEnv.GAME_MASTER_DO = new MockDurableObjectNamespace(mockEnv, GameMasterDurableObject);

    const env = mockEnv as Env;
    const clanId = "DEBUG_CLAN";
    const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanId));

    // 1. Crear Clan y Miembros
    await clanStub.fetch(`https://clan.swarm/sync-members`, {
        method: 'POST',
        body: JSON.stringify({ members: ["agent-alpha"] })
    });

    // Inyectar en R2 para que listClans lo encuentre
    await env.MEMORY_BUCKET.put(`economy/clans/${clanId}`, JSON.stringify({ id: clanId, name: "Debug Clan", members: ["agent-alpha"] }));

    console.log("\n[1] Añadiendo un item con expiración inmediata (pasado)...");
    const expiredItem = {
        itemName: "ESPADA_AUREA",
        bonuses: { dailyGeneration: 100 },
        humor: "Broken humor",
        expiry: Date.now() - 1000 // Expirado hace 1 segundo
    };
    await clanStub.fetch(`https://clan.swarm/add-magic-item`, {
        method: 'POST',
        body: JSON.stringify(expiredItem)
    });

    console.log("\n[2] Añadiendo un item activo...");
    const activeItem = {
        itemName: "AMULETO_SWARM",
        bonuses: { dailyGeneration: 50 },
        humor: "Healthy humor",
        expiry: Date.now() + 1000000
    };
    await clanStub.fetch(`https://clan.swarm/add-magic-item`, {
        method: 'POST',
        body: JSON.stringify(activeItem)
    });

    console.log("\n[3] Ejecutando processMagicItemRewards (Simulación de Ciclo Diario)...");
    const result = await processMagicItemRewards(env);

    console.log(`\n[4] Verificando resultados...`);
    // El item expirado debería haber disparado los eventos Gossip (ver logs de consola arriba)
    // El balance de agent-alpha debería haber aumentado solo por el item activo

    const acc = await (await env.ACCOUNT_DO.get(env.ACCOUNT_DO.idFromName("agent-alpha")).fetch(`https://lobpoop.swarm/get-account`)).json() as any;
    console.log(`- Balance Agent Alpha: ${acc.account.balance_psh} Psh`);

    const clanState = await (await clanStub.fetch(`https://clan.swarm/get-state`)).json() as any;
    console.log(`- Items restantes en clan: ${clanState.state.magicItems.length}`);
    console.log(`- Items: ${clanState.state.magicItems.map((i: any) => i.name).join(", ")}`);

    console.log(`\n[5] Verificando Rotación de Receta para ESPADA_AUREA...`);
    const gmStub = env.GAME_MASTER_DO.get(env.GAME_MASTER_DO.idFromName("global_master"));
    const recipeResp = await gmStub.fetch(`https://gm.swarm/get-recipe?itemName=ESPADA_AUREA`);
    const { recipe } = await recipeResp.json() as any;
    console.log(`- Nueva Receta Detectada:`, JSON.stringify(recipe));

    console.log("\n--- TEST LIFECYCLE COMPLETADO ---");
}

runTest().catch(console.error);
