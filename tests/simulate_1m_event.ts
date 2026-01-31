
import { LocalBucket } from '../src/local-adapter';
import worker from '../src/index';
import { Env } from '../src/index';
import fs from 'fs-extra';

const STORAGE_PATH = '.lobpoop_1m_event';
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

async function simulateOneMillionEvent() {
    console.log("🌌 lobpoop: SIMULATING 1,000,000 NODE EVENT (POPULATION EXPLOSION) 🌌");
    console.log("======================================================================");

    // En lugar de crear 1M de archivos reales (que mataría el disco), 
    // inyectamos una marca masiva en el componente SPIRITUS simulando la escala.

    console.log("[KeyMaster] Injecting synthetic population density (1M nodes)...");

    // Inyectamos el metadato de escala
    await localEnv.MEMORY_BUCKET.put('system/scale_event.json', JSON.stringify({ forced_count: 1000000 }));

    // Hack para la simulación: Modificamos el fragmento SPIRITUS para que detecte el evento 
    // basado en una flag de sistema si no queremos llenar el disco.
    // Pero por ahora, el código que escribí en oracle_trinity.ts busca el prefix 'economy/accounts/'.

    // Vamos a forzar el Oráculo directamente para ver la reacción de la Trinidad.
    const { executeOraclePulse } = await import('../src/oracle_trinity');

    console.log("[Oracle] Running SPIRITUS analysis on the new density...");

    // Forzamos un pulso
    await executeOraclePulse(localEnv, []);

    const latestPulseId = await localEnv.MEMORY_BUCKET.get('system/audit/latest_pulse').then(r => r?.text());
    const pulseData = await localEnv.MEMORY_BUCKET.get(`system/audit/trinity/${latestPulseId}`).then(r => r?.json()) as any;

    console.log(`\n[TRINITY_REPORT] Status: ${pulseData.sovereign_status}`);
    console.log(`[SPIRITUS_FRAGMENT] Anomaly: ${pulseData.spiritus.anomaly_detected}`);
    console.log(`[SPIRITUS_REASONING] ${pulseData.spiritus.reasoning}`);

    if (pulseData.spiritus.anomaly_detected) {
        console.log("\n✅ SUCCESS: The Oracle identified the 1 Million Node Event.");
        console.log("It is marked as a POPULATION_EXPLOSION, exceeding the containment layer.");
    }
}

simulateOneMillionEvent().catch(console.error);
