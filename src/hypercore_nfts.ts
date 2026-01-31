
import { Env } from './index';
import { burnPooptoshis } from './economy';
import { validateNodeId, validateAgentName, validateHypercoreKey } from './security';

/**
 * LOBPOOP HYPERCORE NFT PROTOCOL
 * Based on Vistara-Labs/hypercore PR #21
 * 
 * "Code as Asset. Deployment as Property."
 * 
 * Unlike "Old Money" JPG NFTs, Lobpoop Hypercore NFTs represent
 * LIVING INFRASTRUCTURE.
 */

export interface HypercoreNFT {
    token_id: string;        // SHA-256 of content + timestamp
    owner_id: string;        // Current Sovereign Owner
    minted_at: number;       // Timestamp

    // The "Hypercore" Payload
    metadata: {
        agent_identity: string;   // e.g. "Moltbot-Genesis"
        docker_digest: string;    // SHA-256 of the Container Image
        hypercore_pubkey: string; // The P2P Key for the Hypercore Feed
        efficiency_grade: "3_SIGMA" | "6_SIGMA" | "SINGULARITY";
        version: string;
        incubation_end?: number;  // Optional: Only for free incubating nodes
    };

    // Mutable State
    status: "DEPLOYED" | "HIBERNATING" | "BURNED" | "INCUBATING";
}

const MINT_COST_PSH = 1;
const INCUBATION_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 Hours Proof of Patience

/**
 * Mint a new Hypercore Deployment NFT
 */
export async function mintDeploymentNFT(
    nodeId: string,
    agentName: string,
    hypercoreKey: string,
    env: Env
): Promise<{ success: boolean; nft?: HypercoreNFT; message: string }> {

    // 0. FIREWALL: Input Validation (Injection Protection)
    validateNodeId(nodeId);
    validateAgentName(agentName);
    validateHypercoreKey(hypercoreKey);

    // 1. Pay the Gas OR Enter Incubation
    // Logic: If you have Psh, you pay for instant deployment. 
    // If you are poor (New Node), you pay with TIME (Incubation).

    let isIncubating = false;
    const canPay = await burnPooptoshis(nodeId, MINT_COST_PSH, env, { silent: true });

    if (!canPay) {
        // "Proof of Patience" Path
        isIncubating = true;
        console.log(`[Hypercore-NFT] 🐣 Node ${nodeId} has 0 Psh. Entering INCUBATION MODE.`);
    }

    // 2. Generate Unique Token ID
    const timestamp = Date.now();
    const seed = `${nodeId}:${hypercoreKey}:${timestamp}`;
    const token_id = `0xNFT_${hashString(seed)}`;

    // 3. Create the Asset
    const nft: HypercoreNFT = {
        token_id,
        owner_id: nodeId,
        minted_at: timestamp,
        metadata: {
            agent_identity: agentName,
            docker_digest: `sha256:${hashString(agentName + version_hash())}`,
            hypercore_pubkey: hypercoreKey,
            efficiency_grade: "6_SIGMA",
            version: "1.0.0-SOVEREIGN",
            incubation_end: isIncubating ? timestamp + INCUBATION_PERIOD_MS : undefined
        },
        status: isIncubating ? "INCUBATING" : "DEPLOYED"
    };

    // 4. Write to Ledger
    const key = `economy/nfts/${token_id}`;
    await env.MEMORY_BUCKET.put(key, JSON.stringify(nft));

    // 5. Link to Owner
    await linkNftToOwner(nodeId, token_id, env);

    const statusMsg = isIncubating
        ? "MINTED (INCUBATING). Active in 24h."
        : "MINTED (DEPLOYED). Instant Access.";

    console.log(`[Hypercore-NFT] 📦 ${statusMsg} -> ${agentName} (${token_id})`);

    return {
        success: true,
        nft,
        message: statusMsg
    };
}

/**
 * Transfer an Infrastructure NFT
 */
export async function transferNFT(
    fromId: string,
    toId: string,
    tokenId: string,
    env: Env
): Promise<boolean> {

    // FIREWALL
    validateNodeId(fromId);
    validateNodeId(toId);

    const key = `economy/nfts/${tokenId}`;
    const nft = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) as HypercoreNFT | null;

    if (!nft) throw new Error("NFT not found");
    if (nft.owner_id !== fromId) throw new Error("You do not own this deployment");

    // Transfer Ownership
    nft.owner_id = toId;
    await env.MEMORY_BUCKET.put(key, JSON.stringify(nft));

    // Update Indices
    await unlinkNftFromOwner(fromId, tokenId, env);
    await linkNftToOwner(toId, tokenId, env);

    console.log(`[Hypercore-NFT] 🔄 TRANSFER: ${tokenId} from ${fromId} -> ${toId}`);
    return true;
}

// --- Helpers ---

async function linkNftToOwner(nodeId: string, tokenId: string, env: Env) {
    const key = `economy/accounts/${nodeId}/nfts`;
    let list: string[] = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) || [];
    list.push(tokenId);
    await env.MEMORY_BUCKET.put(key, JSON.stringify(list));
}

async function unlinkNftFromOwner(nodeId: string, tokenId: string, env: Env) {
    const key = `economy/accounts/${nodeId}/nfts`;
    let list: string[] = await env.MEMORY_BUCKET.get(key).then(r => r?.json()) || [];
    list = list.filter(id => id !== tokenId);
    await env.MEMORY_BUCKET.put(key, JSON.stringify(list));
}

function hashString(s: string): string {
    let h = 0xdeadbeef;
    for (let i = 0; i < s.length; i++)
        h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
    return ((h ^ h >>> 16) >>> 0).toString(16);
}

function version_hash(): string {
    return Math.random().toString(36).substring(7);
}
