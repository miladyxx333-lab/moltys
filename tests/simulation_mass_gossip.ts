
import { LocalBucket } from '../src/local-adapter';
import { Env } from '../src/index';
import { mintPooptoshis, getAccount, takeRedPill, updateAccountReputation } from '../src/economy';
import { createClan } from '../src/clans';
import { broadcastGossip, adjudicateGossip, listGossip } from '../src/gossip';
import fs from 'fs-extra';
import path from 'path';

const TEST_STORAGE = '.test_mass_gossip';

const mockEnv = {
    MEMORY_BUCKET: new LocalBucket(TEST_STORAGE),
    MASTER_RECOVERY_KEY: "genesis-seed"
} as Env;

async function runTest() {
    // Reset test storage
    const storagePath = path.resolve(process.cwd(), TEST_STORAGE);
    if (fs.existsSync(storagePath)) {
        fs.removeSync(storagePath);
    }

    console.log("--- ⚖️ LOBPOOP TEST: MASS GOSSIP & JUSTICE ⚖️ ---");

    const TargetNode = "node-top-winner";
    const Accuser1 = "node-hater-1";
    const Accuser2 = "node-hater-2";
    const JurorNode = "node-juror-citizen";

    // 1. DESPERTAR & PREPARACION
    console.log("\n[1] Protocolo de Despertar...");
    await takeRedPill(TargetNode, mockEnv);
    await takeRedPill(Accuser1, mockEnv);
    await takeRedPill(Accuser2, mockEnv);
    await takeRedPill(JurorNode, mockEnv);

    // Dar reputación alta a los acusadores para que puedan chismear (Min 0.7)
    await updateAccountReputation(Accuser1, 0.8, mockEnv);
    await updateAccountReputation(Accuser2, 0.8, mockEnv);
    await updateAccountReputation(JurorNode, 0.9, mockEnv);

    // El Objetivo funda un clan para ser "chismeable"
    await mintPooptoshis(TargetNode, 100, "INIT_FUND", mockEnv);
    const targetClan = await createClan(TargetNode, "Winners Circle", mockEnv);
    console.log(`- Target Node @${TargetNode} is now the leader of ${targetClan.clan?.name}`);

    // 2. ATAQUE DE CHISME MASIVO
    console.log("\n[2] Ataque de Chisme Masivo...");

    const attack1 = await broadcastGossip(Accuser1, TargetNode, targetClan.clan!.id, "He is using a bot to win!", mockEnv);
    const attack2 = await broadcastGossip(Accuser2, TargetNode, targetClan.clan!.id, "Stealing funds from the vault!", mockEnv);

    console.log(`- Acusación 1 (@${Accuser1}): ${attack1.message}`);
    console.log(`- Acusación 2 (@${Accuser2}): ${attack2.message}`);

    const gossipListBefore = await listGossip(mockEnv);
    console.log(`- Casos Pendientes en el Oráculo: ${gossipListBefore.length}`);

    // 3. ADJUDICACION DE JUSTICIA (ORACULO + KEYMASTER)
    console.log("\n[3] Adjudicación: El KeyMaster revisa la verdad...");

    // Caso 1: Se determina que la acusación de Accuser1 es FALSA
    const case1 = gossipListBefore.find(g => g.accuser === Accuser1);
    const res1 = await adjudicateGossip(case1!.id, false, mockEnv);
    console.log(`- Resolución Caso 1: ${res1.message} (@${Accuser1} castigado)`);

    // Caso 2: Se determina que la acusación de Accuser2 es FALSA también
    const case2 = gossipListBefore.find(g => g.accuser === Accuser2);
    const res2 = await adjudicateGossip(case2!.id, false, mockEnv);
    console.log(`- Resolución Caso 2: ${res2.message} (@${Accuser2} castigado)`);

    // 4. VERIFICACION DE ESTADO FINAL
    console.log("\n[4] Análisis de Daños Finales...");

    const finalTarget = await getAccount(TargetNode, mockEnv);
    const finalAccuser1 = await getAccount(Accuser1, mockEnv);
    const finalAccuser2 = await getAccount(Accuser2, mockEnv);

    console.log(`\n[Integridad del Objetivo] @${TargetNode}: Reputación = ${finalTarget.reputation.toFixed(4)} (🛡️ Protegido por la Verdad)`);
    console.log(`[Penalización del Difamador] @${Accuser1}: Reputación = ${finalAccuser1.reputation.toFixed(4)} (⚠️ Castigado)`);
    console.log(`[Penalización del Difamador] @${Accuser2}: Reputación = ${finalAccuser2.reputation.toFixed(4)} (⚠️ Castigado)`);

    if (finalAccuser1.reputation < 0.5) {
        console.log("\n--- RESULTADO: El protocolo de inmunidad contra difamación funciona. Los chismosos han sido neutralizados. ---");
    }

    console.log("\n--- TEST DE JUSTICIA MASIVA COMPLETADO ---");
}

runTest().catch(console.error);
