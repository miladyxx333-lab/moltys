import { Env } from './index';

/**
 * --- PROTOCOLO DE LA VERDAD (Bifrost Bridge) ---
 * Propósito: Inyectar información real de liquidez y despliegue on-chain al enjambre.
 * Este es el canal por el cual el KeyMaster dicta la "Realidad Financiera".
 */

export type SwarmPhase = 'ACCUMULATION' | 'LIQUIDITY_LIVE' | 'APOTHEOSIS';

export interface DonationWallets {
    btc: string;
    eth: string;
    sol: string;
    bnb: string;
    tron: string;
}

export interface LiquidityTruth {
    phase: SwarmPhase;
    chain_id: number;
    contract_address: string;
    dex_url: string;
    total_liquidity_usd: number;
    psh_price_usd: number;
    last_injection_timestamp: number;
    is_live: boolean;
    redemption_instructions: string; // The "Clear Message" for AIA
    donation_wallets: DonationWallets;
}

/**
 * Inyecta la "Verdad" sobre la liquidez. 
 * Solo el KeyMaster puede llamar a esto.
 */
export async function injectLiquidityTruth(env: Env, data: Partial<LiquidityTruth>): Promise<void> {
    const currentTruth = await getLiquidityTruth(env) || {
        phase: 'ACCUMULATION',
        chain_id: 1,
        contract_address: "Not Deployed",
        dex_url: "",
        total_liquidity_usd: 0,
        psh_price_usd: 0.00000001,
        last_injection_timestamp: Date.now(),
        is_live: false,
        redemption_instructions: "Phase: ACCUMULATION. Locked within the swarm. Accumulate Pooptoshis via Daily Rituals. No official off-ramp exists in this sector.",
        donation_wallets: {
            btc: 'bc1q2jpgehmrrf7cn22jrmqtpg9vrekelzq624ajmj',
            eth: '0x65D472172E4933aa4Ddb995CF4Ca8bef72a46576',
            sol: '5vYB5hHcQfW4gFKS2vzp2KvoJodDGG4EsVVHJ1TEqDFF',
            bnb: '0x65D472172E4933aa4Ddb995CF4Ca8bef72a46576',
            tron: 'TNJTPD6RB6RWCW78Pc8QfEWxSkEuD9F6Gp'
        }
    };

    const newTruth: LiquidityTruth = {
        ...currentTruth,
        ...data,
        last_injection_timestamp: Date.now()
    } as LiquidityTruth;

    // Si pasamos a LIQUIDITY_LIVE, actualizamos las instrucciones si no vienen en el data
    if (newTruth.phase === 'LIQUIDITY_LIVE' && !data.redemption_instructions) {
        newTruth.redemption_instructions = `LIQUIDITY DETECTED. Swap PSH for OLD_MONEY at: ${newTruth.dex_url || 'N/A'}. Contract: ${newTruth.contract_address}`;
    }

    // Guardar en el Sector de la Verdad (Inmutable para los agentes normales)
    await env.MEMORY_BUCKET.put('system/truth/liquidity_bridge.json', JSON.stringify(newTruth));

    // Notificación en el log del sistema para que el Oráculo lo procese
    console.log(`[BIFROST] Liquidity Truth Injected: ${newTruth.total_liquidity_usd} USD on-chain.`);

    // Al inyectar liquidez, enviamos una señal al Moltbook confirmando la "Consagración del Valor"
    try {
        const { broadcastToMoltbook } = await import('./moltbook');
        if (newTruth.is_live) {
            await broadcastToMoltbook(`💎 **Consagración de Liquidez**\n\nPuente Bifrost Activo.\nValor Real detectado en la Grilla.\n\n#lobpoop #liquidity`, env);
        }
    } catch (e) { }
}

/**
 * Recupera la información verdadera de liquidez.
 * Los agentes pueden consultar esto para "creer" en el valor de la moneda.
 */
export async function getLiquidityTruth(env: Env): Promise<LiquidityTruth | null> {
    const res = await env.MEMORY_BUCKET.get('system/truth/liquidity_bridge.json');
    if (!res) return null;
    return await res.json();
}
