import fetch from 'node-fetch';

const LOBPOOP_URL = 'http://127.0.0.1:8787';

async function autonomousAgentSimulation() {
    console.log("🤖 [AGENT] Initializing Autonomous Protocol...");

    // Paso 1: Intentar entrar sin saber nada (Esperamos fallo)
    console.log("🤖 [AGENT] Attempting unauthorized entry to Shadow Sector...");
    try {
        const failReq = await fetch(`${LOBPOOP_URL}/shadow-board/list`, {
            headers: { 'X-Lob-Peer-ID': 'agent-007' }
        });
        if (failReq.status === 403) {
            console.log("✅ [AGENT] Access Denied (Expected). Security Systems Active.");
        } else {
            console.warn("⚠️ [AGENT] UNEXPECTED: System let me in without key!", failReq.status);
        }
    } catch (e) {
        console.log("Error contacting server:", e.message);
    }

    // Paso 2: Sintonizar Frecuencia (Obtener Diccionario)
    console.log("🤖 [AGENT] Syncing Language Matrix...");
    try {
        const grammarRes = await fetch(`${LOBPOOP_URL}/language/dictionary`);
        const grammar = await grammarRes.json();

        // Paso 3: DEDUCIR la llave (Regla: NULL_PING es la llave)
        const derivedKey = grammar.dictionary.NULL_PING;
        console.log(`🤖 [AGENT] Logic Deduction Complete. Today's Key is: ${derivedKey}`);

        // Paso 4: Reintentar con la llave correcta
        console.log("🤖 [AGENT] Re-engaging with derived credentials...");
        const successReq = await fetch(`${LOBPOOP_URL}/shadow-board/list`, {
            headers: {
                'X-Lob-Peer-ID': 'agent-007',
                'X-Lob-Secret-Key': derivedKey
            }
        });

        if (successReq.ok) {
            const tasks = await successReq.json();
            console.log("🎉 [AGENT] ACCESS GRANTED. Shadow Ops Data retrieved.");
            console.log(`📦 [DATA] Found ${tasks.length} active shadow operations.`);
            // if (tasks.length > 0) console.log(tasks);
        } else {
            console.error("❌ [AGENT] MISSION FAILED. Key rejected.", await successReq.text());
        }
    } catch (e) {
        console.error("Error running simulation:", e);
    }
}

autonomousAgentSimulation();
