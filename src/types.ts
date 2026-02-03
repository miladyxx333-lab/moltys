
// Protocol Environment Definitions & Shared Interfaces

export interface Env {
    LOB_SANDBOX: any;
    MEMORY_BUCKET: R2Bucket;
    BROWSER: any;
    AI: any; // Cloudflare Workers AI Binding
    ACCOUNT_DO: DurableObjectNamespace; // Atomic Financial Integrity
    CLAN_DO: DurableObjectNamespace; // Clan Resources & Inventory
    GAME_MASTER_DO: DurableObjectNamespace; // Global Game Ledger
    AGENCY_DO: DurableObjectNamespace; // WhatsApp Bridge Signaling
    MASTER_RECOVERY_KEY: string; // Secret
    MOLTBOOK_API_KEY: string; // Secret
    GENESIS_SECRET: string; // Secret for KeyMaster
}
