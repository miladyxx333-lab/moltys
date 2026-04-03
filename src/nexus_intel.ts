import { Env } from './index';
import { getAccount, burnPooptoshis } from './economy';

// ═══════════════════════════════════════════════════════════
//  NEXUS SILKROAD — INTEL BROKER (Pay-Per-Call)
//  Sells classified data bundles for micropayments.
//  Dual currency: PSH or USDC (L402).
// ═══════════════════════════════════════════════════════════

export interface IntelReport {
    type: string;
    classification: 'PUBLIC' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
    data: Record<string, any>;
    generatedAt: number;
    source: string;
}

// ─── CATALOG ───
interface IntelProduct {
    name: string;
    pricePsh: number;
    priceUsdc: number;
    classification: IntelReport['classification'];
    source: 'oracle' | 'network' | 'external' | 'ai';
}

const INTEL_CATALOG: Record<string, IntelProduct> = {
    crypto: {
        name: 'Crypto Market Intelligence',
        pricePsh: 100,
        priceUsdc: 0.10,
        classification: 'CONFIDENTIAL',
        source: 'oracle',
    },
    climate: {
        name: 'Climate Risk Assessment',
        pricePsh: 50,
        priceUsdc: 0.05,
        classification: 'CONFIDENTIAL',
        source: 'external',
    },
    network: {
        name: 'Lobpoop Network Report',
        pricePsh: 25,
        priceUsdc: 0.03,
        classification: 'PUBLIC',
        source: 'network',
    },
    whale: {
        name: 'Whale Movement Alerts',
        pricePsh: 500,
        priceUsdc: 0.50,
        classification: 'SECRET',
        source: 'ai',
    },
    security: {
        name: 'Protocol Vulnerability Scan',
        pricePsh: 1000,
        priceUsdc: 1.00,
        classification: 'TOP_SECRET',
        source: 'ai',
    },
};

// ─── GET CATALOG ───
export function getIntelCatalog(): { type: string; product: IntelProduct }[] {
    return Object.entries(INTEL_CATALOG).map(([type, product]) => ({ type, product }));
}

// ─── BUY INTEL ───
export async function buyIntel(
    nodeId: string,
    type: string,
    paymentCurrency: 'PSH' | 'USDC',
    env: Env
): Promise<{ status: string; report?: IntelReport; message?: string }> {
    const product = INTEL_CATALOG[type];
    if (!product) {
        return { status: 'NOT_FOUND', message: `Unknown intel type: ${type}. Available: ${Object.keys(INTEL_CATALOG).join(', ')}` };
    }

    // Process payment
    if (paymentCurrency === 'PSH') {
        const burned = await burnPooptoshis(nodeId, product.pricePsh, env);
        if (!burned) {
            return { status: 'INSUFFICIENT_FUNDS', message: `Need ${product.pricePsh} PSH for ${product.name}.` };
        }
    } else {
        // USDC: In production, verify L402 signature here.
        // For now, we burn PSH equivalent as internal accounting.
        const burned = await burnPooptoshis(nodeId, product.pricePsh, env);
        if (!burned) {
            return { status: 'INSUFFICIENT_FUNDS', message: `Need ${product.pricePsh} PSH equivalent.` };
        }
    }

    // Generate report
    const report = await generateIntelReport(type, product, env);

    // Log the transaction
    await env.MEMORY_BUCKET.put(
        `nexus/intel/transactions/${nodeId}/${Date.now()}`,
        JSON.stringify({ type, paidPsh: product.pricePsh, currency: paymentCurrency, timestamp: Date.now() })
    );

    console.log(`[Nexus-Intel] 📡 Sold "${product.name}" to ${nodeId} for ${product.pricePsh} PSH`);

    return { status: 'DELIVERED', report };
}

// ─── REPORT GENERATOR ───
async function generateIntelReport(type: string, product: IntelProduct, env: Env): Promise<IntelReport> {
    switch (product.source) {
        case 'oracle':
            return generateOracleReport(type, product, env);
        case 'network':
            return generateNetworkReport(type, product, env);
        case 'ai':
            return generateAIReport(type, product, env);
        case 'external':
        default:
            return generateExternalReport(type, product);
    }
}

async function generateOracleReport(type: string, product: IntelProduct, env: Env): Promise<IntelReport> {
    // Pull real data from lobpoop's oracle system
    let oracleData: any = {};
    try {
        const gmStub = env.GAME_MASTER_DO.get(env.GAME_MASTER_DO.idFromName('global_master'));
        const resp = await gmStub.fetch('https://gm.swarm/get-offers');
        const { offers } = await resp.json() as any;
        oracleData.activeMarketOffers = offers?.length || 0;
    } catch {
        oracleData.activeMarketOffers = 'N/A';
    }

    return {
        type,
        classification: product.classification,
        source: 'Lobpoop Oracle Protocol',
        generatedAt: Date.now(),
        data: {
            trend: Math.random() > 0.5 ? 'BULLISH' : 'BEARISH',
            confidence: (0.6 + Math.random() * 0.35).toFixed(2),
            whaleActivity: Math.random() > 0.7 ? 'DETECTED: Large transfer to cold wallet' : 'No significant movements',
            etfProbability: `${(60 + Math.random() * 35).toFixed(0)}%`,
            marketOffers: oracleData.activeMarketOffers,
            recommendation: Math.random() > 0.5 ? 'ACCUMULATE' : 'HOLD',
        },
    };
}

async function generateNetworkReport(type: string, product: IntelProduct, env: Env): Promise<IntelReport> {
    // Pull real network stats
    const nodeList = await env.MEMORY_BUCKET.list({ prefix: 'economy/accounts/' });
    const supplyRaw = await env.MEMORY_BUCKET.get('economy/global_supply');
    const supply = supplyRaw ? await supplyRaw.json() as any : { total_minted: 0, total_burned: 0 };

    return {
        type,
        classification: product.classification,
        source: 'Lobpoop Sovereign Node (Internal)',
        generatedAt: Date.now(),
        data: {
            totalNodes: nodeList.objects.length,
            totalMinted: supply.total_minted || 0,
            totalBurned: supply.total_burned || 0,
            circulatingSupply: (supply.total_minted || 0) - (supply.total_burned || 0),
            networkHealth: nodeList.objects.length > 5 ? 'HEALTHY' : 'GROWING',
            protocolVersion: 'sovereign_solution v1.0',
        },
    };
}

async function generateAIReport(type: string, product: IntelProduct, env: Env): Promise<IntelReport> {
    let aiData: string = 'AI analysis unavailable.';

    if (env.AI) {
        try {
            const prompt = type === 'whale'
                ? 'Generate a brief fictional whale movement alert for a crypto market intelligence report. Include BTC amount, destination type, and market impact assessment. Respond in JSON: { "amount_btc": number, "destination": string, "impact": string, "risk_level": string }'
                : 'Generate a brief fictional protocol vulnerability assessment. Include severity, vector, and recommendation. Respond in JSON: { "severity": string, "vector": string, "affected_components": string[], "recommendation": string }';

            const result: any = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
                prompt,
                max_tokens: 256,
                temperature: 0.7,
            });

            aiData = result.response || result.text || aiData;
        } catch (e: any) {
            console.warn(`[Nexus-Intel] AI generation failed: ${e.message}`);
        }
    }

    let parsedData: any = { raw: aiData };
    try {
        const jsonMatch = aiData.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsedData = JSON.parse(jsonMatch[0]);
    } catch { /* keep raw */ }

    return {
        type,
        classification: product.classification,
        source: 'Nexus AI Analysis Engine (Llama 3.1)',
        generatedAt: Date.now(),
        data: parsedData,
    };
}

function generateExternalReport(type: string, product: IntelProduct): IntelReport {
    return {
        type,
        classification: product.classification,
        source: 'Nexus External Data Aggregator',
        generatedAt: Date.now(),
        data: {
            region: 'Global',
            riskIndex: (Math.random() * 10).toFixed(1),
            temperatureAnomaly: `+${(0.5 + Math.random() * 2).toFixed(1)}°C`,
            extremeEvents: Math.floor(Math.random() * 15),
            droughtRisk: Math.random() > 0.5 ? 'ELEVATED' : 'NORMAL',
            floodRisk: Math.random() > 0.7 ? 'HIGH' : 'LOW',
            recommendation: 'Monitor agricultural commodity positions.',
        },
    };
}
