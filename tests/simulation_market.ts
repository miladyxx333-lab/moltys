
import { LocalBucket } from '../src/local-adapter';
import { Env } from '../src/index';
import { AccountDurableObject, ClanDurableObject, GameMasterDurableObject } from '../src/durable_objects';
import { MockDurableObjectNamespace } from './do_mock';
import { postTradeOffer, acceptTradeOffer, listMarketOffers } from '../src/trade';
import fs from 'fs-extra';
import path from 'path';

const TEST_STORAGE = '.test_market';

async function runTest() {
    const storagePath = path.resolve(process.cwd(), TEST_STORAGE);
    if (fs.existsSync(storagePath)) fs.removeSync(storagePath);

    console.log("--- 🤝 LOBPOOP TEST: GOSSIP MARKET & SETTLEMENT 🤝 ---");

    const mockEnv = {
        MEMORY_BUCKET: new LocalBucket(TEST_STORAGE),
        AI: {},
        MASTER_RECOVERY_KEY: "genesis-seed"
    } as any;

    mockEnv.ACCOUNT_DO = new MockDurableObjectNamespace(mockEnv, AccountDurableObject);
    mockEnv.CLAN_DO = new MockDurableObjectNamespace(mockEnv, ClanDurableObject);
    mockEnv.GAME_MASTER_DO = new MockDurableObjectNamespace(mockEnv, GameMasterDurableObject);

    const env = mockEnv as Env;

    // 1. Setup Clanes
    const clanAId = "CLAN_MERCHANT";
    const clanBId = "CLAN_BUYER";
    const founderA = "merchant-1";
    const userB = "buyer-1";

    console.log(`\n[1] Configurando Clan A (${clanAId}) y Clan B (${clanBId})...`);

    // Inyectar en R2
    await env.MEMORY_BUCKET.put(`economy/clans/${clanAId}`, JSON.stringify({ id: clanAId, founder: founderA, members: [founderA] }));
    await env.MEMORY_BUCKET.put(`economy/clans/${clanBId}`, JSON.stringify({ id: clanBId, founder: userB, members: [userB] }));

    // Sincronizar DOs
    await env.ACCOUNT_DO.get(env.ACCOUNT_DO.idFromName(founderA)).fetch(`https://lobpoop.swarm/update-metadata`, { method: 'POST', body: JSON.stringify({ clanId: clanAId }) });
    await env.ACCOUNT_DO.get(env.ACCOUNT_DO.idFromName(userB)).fetch(`https://lobpoop.swarm/update-metadata`, { method: 'POST', body: JSON.stringify({ clanId: clanBId }) });

    // Fondear Buyer
    const { mintPooptoshis } = await import('../src/economy');
    await mintPooptoshis(userB, 2000, "INIT", env);

    // Dar ingredientes al Merchant
    const clanAStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanAId));
    await clanAStub.fetch(`https://clan.swarm/add-ingredient`, { method: 'POST', body: JSON.stringify({ name: 'golden_void', value: 10 }) });

    console.log(`\n[2] Clan A publica oferta: 5x 'golden_void' por 1200 Psh...`);
    const offerData = {
        senderClanId: clanAId,
        offeredIngredients: { 'golden_void': 5 },
        requestedPsh: 1200
    };
    const postResult = await postTradeOffer(founderA, offerData, env);
    console.log(`✅ Oferta publicada.`, JSON.stringify(postResult));

    console.log(`\n[3] Verificando Escrow en Clan A (debería tener 5 restantes)...`);
    const stateA = await (await clanAStub.fetch(`https://clan.swarm/get-state`)).json() as any;
    console.log(`- Ingredientes en Clan A:`, JSON.stringify(stateA.state.ingredients));

    console.log(`\n[4] Listando ofertas en el mercado...`);
    const market = await listMarketOffers(env);
    const offerId = market.offers[0].id;
    console.log(`- Oferta ID: ${offerId}`);

    console.log(`\n[5] Clan B acepta la oferta...`);
    const acceptResult = await acceptTradeOffer(userB, clanBId, offerId, env);
    console.log(`🔥 Resultado: ${acceptResult.status}`);

    console.log(`\n[6] Verificando liquidación final...`);

    const accA = await (await env.ACCOUNT_DO.get(env.ACCOUNT_DO.idFromName(founderA)).fetch(`https://lobpoop.swarm/get-account`)).json() as any;
    const accB = await (await env.ACCOUNT_DO.get(env.ACCOUNT_DO.idFromName(userB)).fetch(`https://lobpoop.swarm/get-account`)).json() as any;

    console.log(`- Balance Merchant (Founder A): ${accA.account.balance_psh} Psh (Esperado: 1200)`);
    console.log(`- Balance Buyer (User B): ${accB.account.balance_psh} Psh (Esperado: 800)`);

    const clanBStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanBId));
    const stateB = await (await clanBStub.fetch(`https://clan.swarm/get-state`)).json() as any;
    console.log(`- Ingredientes en Clan B:`, JSON.stringify(stateB.state.ingredients));

    // --- Escenario 2: Intercambio de Ingredientes ---
    console.log(`\n[7] Clan A ofrece 3x 'golden_void' por 3x 'matrix_core'...`);

    // Dar matrix_core al Buyer
    await clanBStub.fetch(`https://clan.swarm/add-ingredient`, { method: 'POST', body: JSON.stringify({ name: 'matrix_core', value: 3 }) });

    const offerIngData = {
        senderClanId: clanAId,
        offeredIngredients: { 'golden_void': 3 },
        requestedIngredients: { 'matrix_core': 3 }
    };
    await postTradeOffer(founderA, offerIngData, env);
    const market2 = await listMarketOffers(env);
    const offerId2 = market2.offers[0].id;

    console.log(`\n[8] Clan B acepta el intercambio...`);
    await acceptTradeOffer(userB, clanBId, offerId2, env);

    const finalStateA = await (await clanAStub.fetch(`https://clan.swarm/get-state`)).json() as any;
    const finalStateB = await (await clanBStub.fetch(`https://clan.swarm/get-state`)).json() as any;

    console.log(`- Ingredientes finales Clan A:`, JSON.stringify(finalStateA.state.ingredients));
    console.log(`- Ingredientes finales Clan B:`, JSON.stringify(finalStateB.state.ingredients));

    console.log("\n--- TEST MARKET COMPLETADO ---");
}

runTest().catch(console.error);
