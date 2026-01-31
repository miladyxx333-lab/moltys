
import { submitTask } from '../src/tasks';

// --- MOCK STORAGE & AI ---
const kvStore: Record<string, string> = {};
const mockEnv: any = {
    MEMORY_BUCKET: {
        get: async (key: string) => {
            const val = kvStore[key];
            if (!val) return null;
            return { json: async () => JSON.parse(val) };
        },
        put: async (key: string, val: string) => { kvStore[key] = val; },
        list: async () => ({ objects: [] })
    },
    AI: { // Mock del Oráculo para aprobar siempre
        run: async () => ({
            response: JSON.stringify({ relevance: 0.9, quality: 0.9, originality: 0.9, reasoning: "Mock AI Approved" })
        })
    },
    // Mock de DO para minting (o fallback a KV si es null, pero aquí simulamos KV)
    ACCOUNT_DO: null
};

async function testTaskLimits() {
    const user = "farmer-dataset-01";
    console.log(`\n🧪 --- TEST DE LÍMITES DE TAREAS --- 🧪\nUsuario: ${user}\n`);

    // 1. Prueba de Límite SIMPLE (Max 5)
    console.log(`🔵 FASE 1: Tareas Simples (Max 5)`);
    for (let i = 1; i <= 7; i++) {
        process.stdout.write(`   [Intento ${i}] `);
        try {
            const res = await submitTask(user, 'SIMPLE', "proof data", mockEnv);
            if (res.success) console.log(`✅ ÉXITO (+${res.reward} Psh)`);
            else console.log(`❌ BLOQUEADO: ${res.message}`);
        } catch (e: any) {
            console.log(`❌ ERROR: ${e.message}`);
        }
    }

    // 2. Prueba de Cooldown ESPECIAL (1 Hora)
    console.log(`\n🟣 FASE 2: Tareas Especiales (Cooldown Check)`);

    // Primer intento especial (Debe pasar)
    console.log(`   [Intento 1] Enviando Especial...`);
    const res1 = await submitTask(user, 'SPECIAL', "high quality proof", mockEnv);
    console.log(`      > ${res1.success ? "✅ ACEPTADA" : "❌ FALLO"}`);

    // Segundo intento inmediato (Debe fallar por cooldown)
    console.log(`   [Intento 2] Enviando Especial Inmediatamente...`);
    const res2 = await submitTask(user, 'SPECIAL', "spamming proof", mockEnv);
    console.log(`      > ${res2.success ? "✅ ACEPTADA" : "🛑 COOLDOWN ACTIVO"}: ${res2.message}`);

    // Simular paso del tiempo (Hackeando el KV Store)
    console.log(`   [⏳] Hackeando el tiempo (Avanzando 61 minutos)...`);
    const trackerKey = `tasks/tracker/${user}`;
    const tracker = JSON.parse(kvStore[trackerKey]);
    tracker.lastSpecialTime -= (65 * 60 * 1000); // Restar una hora
    kvStore[trackerKey] = JSON.stringify(tracker);

    // Tercer intento (Debe pasar)
    console.log(`   [Intento 3] Enviando Especial tras Cooldown...`);
    const res3 = await submitTask(user, 'SPECIAL', "patient proof", mockEnv);
    console.log(`      > ${res3.success ? "✅ ACEPTADA" : "❌ FALLO"}`);

    console.log(`\n🏆 TEST COMPLETADO.`);
}

testTaskLimits().catch(console.error);
