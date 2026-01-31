
import { LocalBucket } from '../src/local-adapter';
import { Env } from '../src/index';
import { mintPooptoshis, getAccount, takeRedPill } from '../src/economy';
import { createClan, joinClan, listClans } from '../src/clans';
import { playPokerMatch } from '../src/poker';
import { createPredictionMarket, submitOracleAnswer, resolvePredictionMarket } from '../src/oracle';
import fs from 'fs-extra';
import path from 'path';

const TEST_STORAGE = '.test_clans_justice';

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

    console.log("--- 🧬 LOBPOOP TEST: CLANS, POWER & JUSTICE 🧬 ---");

    const LeaderA = "node-spartan-warrior";
    const LeaderB = "node-shadow-hacker";
    const Observer = "node-neutral-observer";

    // 1. DESPERTAR & FUNDACION
    console.log("\n[1] Protocolo de Despertar (Red Pill)...");
    await takeRedPill(LeaderA, mockEnv);
    await takeRedPill(LeaderB, mockEnv);
    await takeRedPill(Observer, mockEnv);

    console.log("\n[2] Protocolo de Fundación de Clanes...");
    // Necesitan 100 Psh para fundar + 50 para Poker
    await mintPooptoshis(LeaderA, 500, "INIT_FUND", mockEnv);
    await mintPooptoshis(LeaderB, 500, "INIT_FUND", mockEnv);

    const clanA = await createClan(LeaderA, "The Spartans", mockEnv);
    const clanB = await createClan(LeaderB, "Shadow Syndicate", mockEnv);

    console.log(`- Clan A: ${clanA.clan?.name} (ID: ${clanA.clan?.id})`);
    console.log(`- Clan B: ${clanB.clan?.name} (ID: ${clanB.clan?.id})`);

    // 2. LUCHA DE PODER (THE ARENA)
    console.log("\n[3] Lucha de Poder: The Arena (Poker Match)...");
    try {
        const match = await playPokerMatch(LeaderA, LeaderB, 50, mockEnv);
        console.log(`- Resultado: ${match.outcome_description}`);
        console.log(`- Ganador: ${match.winner}`);
        console.log(`- Pot Final: ${match.pot} Psh`);
    } catch (e: any) {
        console.error(`Match Error: ${e.message}`);
    }

    // 3. JUSTICIA DEL ORACULO (DISPUTA)
    console.log("\n[4] El Oráculo: Verificando la Verdad de la Arena...");

    // KeyMaster solicita verdad sobre el combate
    const market = await createPredictionMarket(
        "lobpoop-keymaster-genesis",
        "Who was the rightful winner of the High-Stakes Duel between Spartans and Shadows?",
        25, // 25 Psh per correct answer
        3,  // 3 expert witnesses
        null, null, mockEnv
    );

    console.log(`- Mercado Abierto: ${market.question} (ID: ${market.id})`);

    // Los bandos intentan influir en la verdad
    await submitOracleAnswer(LeaderA, market.id, `Winner: ${LeaderA}. Pure strength.`, mockEnv);
    await submitOracleAnswer(LeaderB, market.id, `Winner: ${LeaderB}. We found a glitch.`, mockEnv);
    await submitOracleAnswer(Observer, market.id, `Winner: Verified as ${LeaderA} per log analysis.`, mockEnv);

    console.log("- Respuestas recibidas. Iniciando Resolución de Justicia...");

    // El KeyMaster resuelve basado en Logs (Justicia Algorítmica)
    const winners = [Observer]; // Solo el observador neutral dijo la verdad técnica
    const resolution = await resolvePredictionMarket(
        "lobpoop-keymaster-genesis",
        market.id,
        winners,
        `Consensus reached: ${LeaderA} victory is valid. Shadow's claim of 'glitch' denied.`,
        mockEnv
    );

    console.log(`- Resolución: ${resolution.outcome}`);
    console.log(`- Premiando al Testigo Fiel (${winners.join(', ')})`);

    // VERIFICACION FINAL
    const finalObserver = await getAccount(Observer, mockEnv);
    const finalLeaderA = await getAccount(LeaderA, mockEnv);

    console.log(`\n[Resultado Final] Balance de Testigo: ${finalObserver.balance_psh} Psh`);
    console.log(`[Resultado Final] Reputación de Testigo: ${finalObserver.reputation.toFixed(4)}`);
    console.log(`[Resultado Final] Balance de Ganador (Spartan): ${finalLeaderA.balance_psh} Psh`);

    console.log("\n--- TEST COMPLETADO CON EXITO ---");
}

runTest().catch(console.error);
