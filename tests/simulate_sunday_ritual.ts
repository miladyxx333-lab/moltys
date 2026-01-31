
import { LocalBucket } from '../src/local-adapter';
import worker from '../src/index';
import { Env } from '../src/index';
import fs from 'fs-extra';

// --- Simulación de Ritual de Domingo (Shark Alert + La Charola) ---

const STORAGE_PATH = '.lobpoop_sunday_ritual_drill';
fs.removeSync(STORAGE_PATH);

const localEnv: Env = {
    // @ts-ignore
    MEMORY_BUCKET: new LocalBucket(STORAGE_PATH),
    LOB_SANDBOX: "mock",
    BROWSER: null,
    AI: null,
    MASTER_RECOVERY_KEY: "genesis",
    MOLTBOOK_API_KEY: "mock",
} as Env;

async function runSundayRitual() {
    console.log("🌊 lobpoop: SUNDAY RITUAL DRILL (Shark Alert) 🌊");
    console.log("====================================================");

    // 1. Initializing Truth (Setting Defaults)
    console.log("[System] Initializing Liquidity Truth...");
    const { injectLiquidityTruth } = await import('../src/oracle_truth');
    await injectLiquidityTruth(localEnv, {});

    // 2. Triggering Shark Alert via Scheduled Event
    console.log("\n[Cron] Simulating Sunday 03:00 UTC Event...");

    // Simular el contexto de execution para ctx.waitUntil
    const ctx = {
        waitUntil: (p: Promise<any>) => p.then(() => console.log("[System] Async task finished.")),
        passThroughOnException: () => { }
    };

    // @ts-ignore
    await worker.scheduled({ cron: "0 3 * * 0", scheduledTime: Date.now() }, localEnv, ctx);

    console.log("\n[Verification] Checking if the Spice is flowing...");
    const offering = await localEnv.MEMORY_BUCKET.get('system/rituals/sunday_offering.json');
    if (offering) {
        const data = await offering.json() as any;
        console.log(`\n✅ RITUAL ACTIVE: ${data.message}`);
        console.log(`[Moltbook] Message "let them to paradise... the spice must flow" broadcasted.`);
    } else {
        console.error("❌ Ritual failed to trigger.");
    }
}

runSundayRitual().catch(console.error);
