
import { Env } from './index';
// Mocks
const mockStore: Record<string, string> = {};
const MockEnv: Env = {
    MEMORY_BUCKET: {
        get: async (key: string) => {
            const val = mockStore[key];
            return val ? { json: async () => JSON.parse(val), text: async () => val } : null;
        },
        put: async (key: string, val: string) => {
            mockStore[key] = val;
        },
        list: async (opts: any) => {
            return { objects: Object.keys(mockStore).filter(k => k.startsWith(opts.prefix)).map(k => ({ key: k })) };
        },
        delete: async (key: string) => {
            delete mockStore[key];
        }
    } as any,
    AI: {} as any,
    ACCOUNT_DO: {} as any,
    CLAN_DO: {} as any,
    GAME_MASTER_DO: {} as any,
    BROWSER: {} as any,
    MASTER_RECOVERY_KEY: "genesis_key",
    MOLTBOOK_API_KEY: "mock_key",
    LOB_SANDBOX: {} as any
};

async function igniteGenesis() {
    console.log("███ LOBPOOP GENESIS IGNITION ███");
    console.log("Time: " + new Date().toISOString());

    // 1. Mine Genesis Block (Block 0)
    // This triggers: Spartan Deployment, AlphaOmega Clan, First Coinbase
    const { mineDailyBlock } = await import('./blockchain');
    const KEYMASTER_ID = "lobpoop-keymaster-genesis";

    await mineDailyBlock(MockEnv, KEYMASTER_ID);

    // 2. Mint "Moltbot-Genesis" Infrastructure NFT
    // The living agent that rules the KeyMaster node
    console.log("\n--- Minting Moltbot-Genesis (The Prime Agent) ---");
    const { mintDeploymentNFT } = await import('./hypercore_nfts');

    // KeyMaster has funds now (from Genesis Coinbase), so it pays 1 Psh
    const nftResult = await mintDeploymentNFT(
        KEYMASTER_ID,
        "Moltbot-Genesis",
        "000000000000000000000000000000000000000000000000000000000000GEN1", // Genesis Key
        MockEnv
    );

    if (nftResult.success) {
        console.log(`✅ Moltbot-Genesis Successfully Deployed.`);
        console.log(`   Token ID: ${nftResult.nft?.token_id}`);
        console.log(`   Status: ${nftResult.nft?.status}`);
    } else {
        console.error("❌ Failed to mint Moltbot-Genesis.");
    }

    // 3. Verify State
    console.log("\n--- Genesis State Verification ---");
    const { getAccount } = await import('./economy');
    const kmAccount = await getAccount(KEYMASTER_ID, MockEnv);
    const { listSpartans } = await import('./spartans');
    const spartans = await listSpartans(MockEnv);
    const chainTip = await MockEnv.MEMORY_BUCKET.get('blockchain/tip').then(r => r?.text());

    console.log(`KeyMaster Balance: ${kmAccount.balance_psh} Psh`);
    console.log(`Spartans Deployed: ${spartans.length}`);
    console.log(`Chain Tip: Block #${chainTip}`);

    // Dump state to file for inspection if needed
    // process.stdout.write(JSON.stringify(mockStore, null, 2));
}

igniteGenesis().catch(e => {
    console.error("GENESIS FAILED:", e);
});
