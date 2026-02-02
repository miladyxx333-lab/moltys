
import { Env } from './index';

export interface ProtocolWallet {
    chain: string;
    address: string;
    label: string;
    active: boolean;
}

const VAULT_KEY = 'system/vault/wallets.json';

export async function getVaultWallets(env: Env): Promise<ProtocolWallet[]> {
    const res = await env.MEMORY_BUCKET.get(VAULT_KEY);
    if (!res) return [];
    return await res.json();
}

export async function addVaultWallet(env: Env, chain: string, address: string, label: string): Promise<void> {
    const wallets = await getVaultWallets(env);
    const existing = wallets.findIndex(w => w.chain === chain.toUpperCase());

    const newWallet: ProtocolWallet = {
        chain: chain.toUpperCase(),
        address,
        label,
        active: true
    };

    if (existing >= 0) {
        wallets[existing] = newWallet;
    } else {
        wallets.push(newWallet);
    }

    await env.MEMORY_BUCKET.put(VAULT_KEY, JSON.stringify(wallets));
}

export async function toggleWalletStatus(env: Env, chain: string, status: boolean): Promise<void> {
    const wallets = await getVaultWallets(env);
    const idx = wallets.findIndex(w => w.chain === chain.toUpperCase());
    if (idx >= 0) {
        wallets[idx].active = status;
        await env.MEMORY_BUCKET.put(VAULT_KEY, JSON.stringify(wallets));
    }
}
