const WORKER_URL = "https://lobpoop-core.miladyxx333.workers.dev";
const SECRET = process.argv[2];

async function run() {
    if (!SECRET) {
        console.error("❌ ERROR: Debes pasar tu GENESIS_SECRET como argumento.");
        console.error("Ejemplo: node scripts/manual_override.js MI_CLAVE_SECRETA");
        process.exit(1);
    }

    console.log(`📡 CONECTANDO A: ${WORKER_URL}`);

    // 1. STATS
    console.log("\n--- [1] CHEQUEO DE SISTEMA (/stats) ---");
    const resStats = await fetch(`${WORKER_URL}/stats`);
    console.log(`[${resStats.status}] ${await resStats.text()}`);

    // 2. USER GENESIS
    console.log("\n--- [2] FORZANDO CREACIÓN DE NODO (/board/checkin) ---");
    const cliNodeId = `agent-cli-${Date.now().toString().slice(-4)}`;
    const resCheckin = await fetch(`${WORKER_URL}/board/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Lob-Peer-ID': cliNodeId },
        body: JSON.stringify({ task: "EMERGENCY_CLI_OVERRIDE" })
    });
    console.log(`[${resCheckin.status}] ${await resCheckin.text()}`);
    if (resCheckin.ok) console.log(`🆔 ID GENERADO: ${cliNodeId}`);

    // 3. KEYMASTER LOGIN
    console.log("\n--- [3] ACCESO KEYMASTER (/keymaster/verify) ---");
    const resAuth = await fetch(`${WORKER_URL}/keymaster/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: SECRET })
    });
    console.log(`[${resAuth.status}] ${await resAuth.text()}`);
}

run();
