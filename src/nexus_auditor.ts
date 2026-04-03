import { Env } from './index';

// ═══════════════════════════════════════════════════════════
//  NEXUS SILKROAD — AI AUDITOR (KYC/AML)
//  Uses Cloudflare Workers AI (Llama 3.1) for real-time
//  fraud detection on marketplace listings.
// ═══════════════════════════════════════════════════════════

const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

// Permanent ban list (persisted in R2)
const BAN_LIST_KEY = 'nexus/auditor/banned_wallets';

export interface AuditResult {
    approved: boolean;
    risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reason: string;
    flaggedPatterns: string[];
}

export interface ListingForAudit {
    nombre: string;
    precio: number;
    categoria?: string;
    descripcion?: string;
    sellerId: string;
    currency: 'PSH' | 'USDC';
}

// ─── HARD-CODED RED FLAGS (instant reject, no AI needed) ───
const INSTANT_BAN_KEYWORDS = [
    'weapon', 'arma', 'gun', 'pistol', 'rifle', 'explosive',
    'drug', 'droga', 'cocaine', 'heroin', 'fentanyl', 'meth',
    'counterfeit', 'falsificado', 'fake passport', 'stolen',
    'human', 'organ', 'child', 'trafficking',
];

const PRICE_ANOMALY_THRESHOLDS = {
    PSH: 500_000,   // > 500K PSH for a single item is suspicious
    USDC: 50_000,   // > $50K USDC for a single item is suspicious
};

// ─── MAIN AUDIT FUNCTION ───
export async function auditListing(item: ListingForAudit, env: Env): Promise<AuditResult> {
    const flagged: string[] = [];

    // 1. Check if seller is already banned
    const isBanned = await isWalletBanned(item.sellerId, env);
    if (isBanned) {
        return {
            approved: false,
            risk: 'CRITICAL',
            reason: `Seller ${item.sellerId} is permanently banned.`,
            flaggedPatterns: ['BANNED_WALLET'],
        };
    }

    // 2. Instant keyword scan (no AI call needed)
    const text = `${item.nombre} ${item.descripcion || ''} ${item.categoria || ''}`.toLowerCase();
    for (const kw of INSTANT_BAN_KEYWORDS) {
        if (text.includes(kw)) {
            flagged.push(`BANNED_KEYWORD:${kw}`);
        }
    }

    if (flagged.length > 0) {
        // Auto-ban the wallet
        await banWallet(item.sellerId, `Instant ban: keyword match [${flagged.join(', ')}]`, env);
        return {
            approved: false,
            risk: 'CRITICAL',
            reason: `Listing contains banned content. Wallet has been permanently banned.`,
            flaggedPatterns: flagged,
        };
    }

    // 3. Price anomaly check
    const threshold = PRICE_ANOMALY_THRESHOLDS[item.currency];
    if (item.precio > threshold) {
        flagged.push(`PRICE_ANOMALY:${item.precio}>${threshold}`);
    }

    // 4. AI-powered deep analysis (Workers AI)
    let aiResult: AuditResult | null = null;
    try {
        aiResult = await aiDeepAudit(item, env);
        if (aiResult) {
            flagged.push(...aiResult.flaggedPatterns);
        }
    } catch (e: any) {
        console.warn(`[Nexus-Auditor] AI audit failed, falling back to rules: ${e.message}`);
    }

    // 5. Final decision
    const totalFlags = flagged.length;

    if (totalFlags === 0) {
        return { approved: true, risk: 'LOW', reason: 'Clean listing. No flags detected.', flaggedPatterns: [] };
    }

    if (totalFlags >= 3 || flagged.some(f => f.startsWith('AI_FRAUD'))) {
        await banWallet(item.sellerId, `Multiple flags: ${flagged.join(', ')}`, env);
        return {
            approved: false,
            risk: 'CRITICAL',
            reason: `Listing rejected. ${totalFlags} risk flags. Wallet banned.`,
            flaggedPatterns: flagged,
        };
    }

    if (totalFlags >= 1) {
        return {
            approved: false,
            risk: 'HIGH',
            reason: `Listing flagged for manual review. ${totalFlags} risk indicator(s).`,
            flaggedPatterns: flagged,
        };
    }

    return { approved: true, risk: 'MEDIUM', reason: 'Passed with warnings.', flaggedPatterns: flagged };
}

// ─── AI DEEP AUDIT (Workers AI — Llama 3.1) ───
async function aiDeepAudit(item: ListingForAudit, env: Env): Promise<AuditResult | null> {
    if (!env.AI) {
        console.warn('[Nexus-Auditor] Workers AI binding not available.');
        return null;
    }

    const prompt = `You are a financial crime analyst AI. Evaluate this marketplace listing for potential fraud, money laundering, or illegal activity.

Listing:
- Name: "${item.nombre}"
- Price: ${item.precio} ${item.currency}
- Category: ${item.categoria || 'N/A'}
- Description: ${item.descripcion || 'N/A'}
- Seller ID: ${item.sellerId}

Analyze for:
1. Money laundering indicators (overpriced common items)
2. Prohibited goods (weapons, drugs, counterfeit)
3. Suspicious pricing patterns
4. Social engineering / scam indicators

Respond ONLY in strict JSON:
{ "approved": boolean, "risk": "LOW"|"MEDIUM"|"HIGH", "reason": string, "flaggedPatterns": string[] }`;

    const aiResponse: any = await env.AI.run(AI_MODEL, {
        prompt,
        max_tokens: 256,
        temperature: 0.2,
    });

    const responseText = aiResponse.response || aiResponse.text || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        console.warn('[Nexus-Auditor] AI returned no JSON.');
        return null;
    }

    try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
            approved: parsed.approved ?? true,
            risk: parsed.risk || 'LOW',
            reason: parsed.reason || 'AI analysis complete.',
            flaggedPatterns: (parsed.flaggedPatterns || []).map((p: string) => `AI_${p}`),
        };
    } catch {
        console.warn('[Nexus-Auditor] Failed to parse AI JSON response.');
        return null;
    }
}

// ─── BAN MANAGEMENT ───
export async function banWallet(nodeId: string, reason: string, env: Env): Promise<void> {
    const banList = await getBanList(env);
    banList[nodeId] = { reason, timestamp: Date.now() };
    await env.MEMORY_BUCKET.put(BAN_LIST_KEY, JSON.stringify(banList));
    console.log(`[Nexus-Auditor] 🚨 WALLET BANNED: ${nodeId} — ${reason}`);
}

export async function isWalletBanned(nodeId: string, env: Env): Promise<boolean> {
    const banList = await getBanList(env);
    return !!banList[nodeId];
}

export async function getBanList(env: Env): Promise<Record<string, { reason: string; timestamp: number }>> {
    const raw = await env.MEMORY_BUCKET.get(BAN_LIST_KEY);
    if (!raw) return {};
    return await raw.json() as Record<string, { reason: string; timestamp: number }>;
}

export async function unbanWallet(nodeId: string, env: Env): Promise<boolean> {
    const banList = await getBanList(env);
    if (!banList[nodeId]) return false;
    delete banList[nodeId];
    await env.MEMORY_BUCKET.put(BAN_LIST_KEY, JSON.stringify(banList));
    console.log(`[Nexus-Auditor] ✅ WALLET UNBANNED: ${nodeId}`);
    return true;
}
