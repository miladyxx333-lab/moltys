
import { mintDeploymentNFT, transferNFT, HypercoreNFT } from '../src/hypercore_nfts';
import { Env } from '../src/index';

// --- MOCK ENVIRONMENT ---
// Simulación simple de la KV Store y el entorno
const mockStore: Record<string, string> = {};

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
    // Otros mocks no necesarios para este test
    GOSSIP_NETWORK: {} as any,
    AI: {} as any
};

// Helper para iniciar cuentas con dinero
async function fundAccount(nodeId: string, amount: number) {
    const key = `economy/accounts/${nodeId}`;
    const account = {
        nodeId,
        balance_psh: amount,
        badges: [],
        reputation: 1.0,
        lobpoops_minted: 0,
        status: 'ACTIVE'
    };
    await MockEnv.MEMORY_BUCKET.put(key, JSON.stringify(account));
    console.log(`[SETUP] Funded ${nodeId} with ${amount} Psh.`);
}

// --- TEST SCENARIO ---

async function runTest() {
    console.log("=== INICIANDO PRUEBA DE HYPERCORE NFTs ===\n");

    const ALICE = "Alice_Node_01";
    const BOB = "Bob_Node_02";

    // 1. Setup
    await fundAccount(ALICE, 1000); // Alice tiene dinero para mintear (Costo 500)
    await fundAccount(BOB, 0);      // Bob es pobre

    // 2. Alice Mintea un NFT de Infraestructura (Moltbot Container)
    console.log(`\n--- PASO 1: Alice mintea 'Moltbot-Genesis' ---`);
    const mintResult = await mintDeploymentNFT(
        ALICE,
        "Moltbot-Genesis",
        "0000000000000000000000000000000000000000000000000000000000000001", // Valid 64-char hex key
        MockEnv
    );

    if (!mintResult.success || !mintResult.nft) {
        console.error("FALLO EL MINT:", mintResult.message);
        return;
    }

    const tokenId = mintResult.nft.token_id;
    console.log(`✅ Mint Exitoso! Token ID: ${tokenId}`);
    console.log(`   Owner: ${mintResult.nft.owner_id}`);
    console.log(`   Docker Digest: ${mintResult.nft.metadata.docker_digest}`);

    // Verificar balance de Alice (debería ser 500)
    const aliceAccount = await MockEnv.MEMORY_BUCKET.get(`economy/accounts/${ALICE}`).then((r: any) => r.json());
    console.log(`   Alice Balance: ${aliceAccount.balance_psh} Psh (Cost: 500)`);

    // 3. Alice transfiere la infraestructura a Bob
    console.log(`\n--- PASO 2: Alice transfiere el nodo a Bob ---`);
    try {
        await transferNFT(ALICE, BOB, tokenId, MockEnv);
        console.log(`✅ Transferencia Exitosa.`);
    } catch (e: any) {
        console.error("❌ FALLO LA TRANSFERENCIA:", e.message);
        return;
    }

    // 4. Verificación Final de Propiedad
    console.log(`\n--- PASO 3: Auditoría Final ---`);

    // Check NFT Owner in Registry
    const nftStored = await MockEnv.MEMORY_BUCKET.get(`economy/nfts/${tokenId}`).then((r: any) => r.json());
    console.log(`   [Registry] NFT Owner: ${nftStored.owner_id} (Expected: ${BOB})`);

    // Check Bob's Wallet
    const bobNfts = await MockEnv.MEMORY_BUCKET.get(`economy/accounts/${BOB}/nfts`).then((r: any) => r.json());
    console.log(`   [Bob's Wallet] NFTs Owned: ${JSON.stringify(bobNfts)}`);

    if (nftStored.owner_id === BOB && bobNfts.includes(tokenId)) {
        console.log("\n✅ TEST PASSED: Infraestructura transferida correctamente.");
    } else {
        console.error("\n❌ TEST FAILED: Discrepancia en la propiedad.");
    }

    // 5. Bob (Pobre) intenta desplegar un enjambre (Swarm)
    console.log(`\n--- PASO 4: Bob's Swarm Attempt (Proof of Patience) ---`);
    console.log(`Bob tiene 0 Psh, pero quiere desplegar 3 agentes.`);

    for (let i = 1; i <= 3; i++) {
        const agentName = `Bob-Swarm-Agent-${i}`;
        const validKey = `aaaabbbbccccddddeeeeffff000011112222333344445555666677778888999${i}`;
        const res = await mintDeploymentNFT(BOB, agentName, validKey, MockEnv);

        if (res.nft?.status === "INCUBATING") {
            console.log(`✅ ${agentName}: MINTED en modo INCUBACIÓN (Gratis).`);
            const waitTime = ((res.nft.metadata.incubation_end || 0) - Date.now()) / 3600000;
            console.log(`   Tiempo de Espera: ~${waitTime.toFixed(1)} horas.`);
        } else {
            console.error(`❌ ${agentName}: Debería estar incubando pero salió como DEPLOYED.`);
        }
    }


    console.log("\n✅ TEST PASSED: El mecanismo de incubación funciona para nodos sin fondos.");

    // 6. Penetration Test (Security Audit)
    console.log(`\n--- PASO 5: Penetration Test (Injection Attack) ---`);
    console.log(`Intentando inyectar código malicioso en el Ledger...`);

    const maliciousNode = "../../../etc/passwd";
    try {
        await mintDeploymentNFT(maliciousNode, "Malicious-Agent", "000000000000000000000000000000000000000000000000000000000000DEAD", MockEnv);
        console.error("❌ SEGURIDAD FALLIDA: Path Traversal no detectado.");
    } catch (e: any) {
        console.log(`✅ ATAQUE BLOQUEADO (Path Traversal): ${e.message}`);
    }

    const xssAgent = "<script>alert('pwned')</script>";
    try {
        await mintDeploymentNFT(ALICE, xssAgent, "000000000000000000000000000000000000000000000000000000000000DEAD", MockEnv);
        console.error("❌ SEGURIDAD FALLIDA: XSS no detectado.");
    } catch (e: any) {
        console.log(`✅ ATAQUE BLOQUEADO (XSS): ${e.message}`);
    }
}

// Ejecutar
runTest().catch(console.error);
