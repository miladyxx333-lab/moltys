
import { reportBug } from '../src/bug_bounty';
import { Env } from '../src/index';

// --- MOCK ENVIRONMENT ---
const mockStore: Record<string, string> = {};
const mockLotteryTickets: any[] = [];

const MockEnv: Env = {
    MEMORY_BUCKET: {
        get: async (key: string) => {
            const val = mockStore[key];
            return val ? { json: async () => JSON.parse(val) } : null;
        },
        put: async (key: string, val: string) => {
            mockStore[key] = val;
        },
        list: async (opts: any) => {
            return { objects: Object.keys(mockStore).filter(k => k.startsWith(opts.prefix)).map(k => ({ key: k })) };
        },
    } as any,
    GOSSIP_NETWORK: {} as any,
    AI: {} as any
};

// Mock lottery module since we can't easily import the complex real one in this lightweight test
// We'll mock the internal behavior if needed, but since we are importing reportBug which imports real lottery,
// we might need to mock the lottery return in a real integration test. 
// However, since `issueTicket` writes to MEMORY_BUCKET, it should work fine with our MockEnv if the code is pure.
// Let's assume src/lottery.ts uses the Env passed to it.

async function runTest() {
    console.log("=== INICIANDO PRUEBA DE BUG BOUNTY BOARD ===\n");

    const HERO_NODE = "White_Hat_Hacker_01";

    console.log(`--- PASO 1: Reportar Vulnerabilidad Crítica ---`);
    console.log(`Node ${HERO_NODE} detecta un fallo de 6 Sigma...`);

    try {
        const result = await reportBug(
            HERO_NODE,
            "Possible race condition in Hypercore flush logic.",
            "CRITICAL",
            MockEnv
        );

        console.log(`✅ REPORTE ENVIADO.`);
        console.log(`   ID: ${result.reportId}`);
        console.log(`   Mensaje: ${result.message}`);

        if (result.message.includes("3 Lottery Tickets")) {
            console.log("   ✅ RECOMPENSA VERIFICADA: 3 Tickets Emitidos.");
        } else {
            console.error("   ❌ FALLO RECOMPENSA: No se mencionan los tickets.");
        }

    } catch (e: any) {
        console.error("❌ ERROR EN REPORTE:", e.message);
    }

    console.log(`\n--- PASO 2: Verificar Persistencia ---`);
    const allReports = Object.keys(mockStore).filter(k => k.startsWith("board/bounties/"));
    const allTickets = Object.keys(mockStore).filter(k => k.startsWith("lottery/tickets/"));

    console.log(`   Reportes en Ledger: ${allReports.length} (Esperado: 1)`);
    console.log(`   Tickets Emitidos: ${allTickets.length} (Esperado: 3)`);

    if (allReports.length === 1 && allTickets.length === 3) {
        console.log("\n✅ TEST PASSED: Flujo de Bug Bounty Completo.");
    } else {
        console.error("\n❌ TEST FAILED: Estado inconsistente.");
    }
}

runTest().catch(console.error);
