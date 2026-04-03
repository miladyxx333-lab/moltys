import { Env } from './index';
import { getAccount, mintPooptoshis, burnPooptoshis } from './economy';
import { auditListing, isWalletBanned, ListingForAudit } from './nexus_auditor';
import { broadcastToMoltbook } from './moltbook';

// ═══════════════════════════════════════════════════════════
//  NEXUS SILKROAD — MARKETPLACE MODULE
//  Supports physical goods, digital goods, and NFTs.
//  Dual currency: Pooptoshis (PSH) + USDC (L402).
// ═══════════════════════════════════════════════════════════

// ─── EXCHANGE RATE ORACLE ───
const EXCHANGE_RATE_KEY = 'nexus/oracle/exchange_rate';

export async function getExchangeRate(env: Env): Promise<{ PSH_PER_USDC: number }> {
    const raw = await env.MEMORY_BUCKET.get(EXCHANGE_RATE_KEY);
    if (raw) return await raw.json() as { PSH_PER_USDC: number };
    return { PSH_PER_USDC: 1000 }; // Default: 1 USDC = 1000 PSH
}

export async function setExchangeRate(rate: number, env: Env): Promise<void> {
    await env.MEMORY_BUCKET.put(EXCHANGE_RATE_KEY, JSON.stringify({ PSH_PER_USDC: rate }));
    console.log(`[Nexus-Oracle] Exchange rate updated: 1 USDC = ${rate} PSH`);
}

// ─── TYPES ───
export type ItemType = 'physical' | 'digital' | 'nft';
export type ListingStatus = 'PENDING_AUDIT' | 'LISTED' | 'SOLD' | 'BANNED' | 'CANCELLED';

export interface ShippingForm {
    recipient: string;
    address: string;
    city?: string;
    zipCode: string;
    country?: string;
    phone?: string;
}

export interface NexusListing {
    id: string;
    sellerId: string;
    name: string;
    description: string;
    category: string;
    type: ItemType;
    pricePsh?: number;
    priceUsdc?: number;
    acceptsBoth: boolean;
    shippingRequired: boolean;
    status: ListingStatus;
    auditRisk?: string;
    createdAt: number;
    soldAt?: number;
    buyerId?: string;
    shippingForm?: ShippingForm;
}

// ─── LISTING MANAGEMENT ───
const LISTINGS_PREFIX = 'nexus/marketplace/listings/';

export async function publishListing(
    sellerId: string,
    item: {
        name: string;
        description: string;
        category: string;
        type: ItemType;
        pricePsh?: number;
        priceUsdc?: number;
        acceptsBoth?: boolean;
    },
    env: Env
): Promise<{ status: string; listing?: NexusListing; audit?: any }> {
    // 0. Check ban
    const banned = await isWalletBanned(sellerId, env);
    if (banned) {
        return { status: 'BANNED', audit: { reason: 'Wallet is permanently banned.' } };
    }

    // 1. Determine currency
    if (!item.pricePsh && !item.priceUsdc) {
        return { status: 'ERROR', audit: { reason: 'Must specify pricePsh, priceUsdc, or both.' } };
    }

    // 2. AI Audit
    const auditItem: ListingForAudit = {
        nombre: item.name,
        precio: item.pricePsh || item.priceUsdc || 0,
        categoria: item.category,
        descripcion: item.description,
        sellerId,
        currency: item.pricePsh ? 'PSH' : 'USDC',
    };

    const audit = await auditListing(auditItem, env);

    if (!audit.approved) {
        return { status: 'REJECTED', audit };
    }

    // 3. Create listing
    const id = `NXS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const listing: NexusListing = {
        id,
        sellerId,
        name: item.name,
        description: item.description,
        category: item.category,
        type: item.type,
        pricePsh: item.pricePsh,
        priceUsdc: item.priceUsdc,
        acceptsBoth: item.acceptsBoth ?? !!(item.pricePsh && item.priceUsdc),
        shippingRequired: item.type === 'physical',
        status: 'LISTED',
        auditRisk: audit.risk,
        createdAt: Date.now(),
    };

    await env.MEMORY_BUCKET.put(`${LISTINGS_PREFIX}${id}`, JSON.stringify(listing));

    // 4. Gossip
    const priceStr = listing.pricePsh ? `${listing.pricePsh} PSH` : `$${listing.priceUsdc} USDC`;
    await broadcastToMoltbook(
        `🏪 [NEXUS MARKET] New listing: "${listing.name}" (${listing.type}) for ${priceStr} by @${sellerId}`,
        env
    );

    console.log(`[Nexus-Market] ✅ Published: ${listing.id} — "${listing.name}" by ${sellerId}`);
    return { status: 'PUBLISHED', listing, audit };
}

// ─── PURCHASE ───
export async function purchaseListing(
    buyerId: string,
    listingId: string,
    paymentCurrency: 'PSH' | 'USDC',
    shippingForm?: ShippingForm,
    env?: Env
): Promise<{ status: string; message: string; trackingUrl?: string }> {
    if (!env) return { status: 'ERROR', message: 'Missing env' };

    // 1. Load listing
    const raw = await env.MEMORY_BUCKET.get(`${LISTINGS_PREFIX}${listingId}`);
    if (!raw) return { status: 'NOT_FOUND', message: 'Listing not found.' };
    const listing: NexusListing = await raw.json() as NexusListing;

    if (listing.status !== 'LISTED') {
        return { status: 'UNAVAILABLE', message: `Listing is ${listing.status}.` };
    }

    if (listing.sellerId === buyerId) {
        return { status: 'ERROR', message: 'Cannot buy your own listing.' };
    }

    // 2. Validate shipping form for physical goods
    if (listing.shippingRequired) {
        if (!shippingForm || !shippingForm.address || !shippingForm.recipient || !shippingForm.zipCode) {
            return { status: 'MISSING_FORM', message: 'Physical goods require a complete shipping form (recipient, address, zipCode).' };
        }
    }

    // 3. Process payment
    if (paymentCurrency === 'PSH') {
        const price = listing.pricePsh;
        if (!price) {
            // Convert from USDC price
            const rate = await getExchangeRate(env);
            const convertedPrice = Math.ceil((listing.priceUsdc || 0) * rate.PSH_PER_USDC);
            if (!listing.acceptsBoth) {
                return { status: 'CURRENCY_MISMATCH', message: 'This listing only accepts USDC.' };
            }
            // Pay converted price
            const burned = await burnPooptoshis(buyerId, convertedPrice, env);
            if (!burned) return { status: 'INSUFFICIENT_FUNDS', message: `Need ${convertedPrice} PSH.` };
            await mintPooptoshis(listing.sellerId, convertedPrice, `NEXUS_SALE:${listingId}`, env);
        } else {
            const burned = await burnPooptoshis(buyerId, price, env);
            if (!burned) return { status: 'INSUFFICIENT_FUNDS', message: `Need ${price} PSH.` };
            await mintPooptoshis(listing.sellerId, price, `NEXUS_SALE:${listingId}`, env);
        }
    } else {
        // USDC payment — in production this would verify L402 signature
        // For now we simulate the USDC payment and still move PSH internally
        if (!listing.priceUsdc && !listing.acceptsBoth) {
            return { status: 'CURRENCY_MISMATCH', message: 'This listing only accepts PSH.' };
        }
        const rate = await getExchangeRate(env);
        const pshEquivalent = Math.ceil((listing.priceUsdc || 0) * rate.PSH_PER_USDC);
        await mintPooptoshis(listing.sellerId, pshEquivalent, `NEXUS_SALE_USDC:${listingId}`, env);
    }

    // 4. Mark as sold
    listing.status = 'SOLD';
    listing.soldAt = Date.now();
    listing.buyerId = buyerId;
    if (shippingForm) listing.shippingForm = shippingForm;
    await env.MEMORY_BUCKET.put(`${LISTINGS_PREFIX}${listingId}`, JSON.stringify(listing));

    // 5. Gossip
    await broadcastToMoltbook(
        `💰 [NEXUS MARKET] SOLD: "${listing.name}" purchased by @${buyerId}!`,
        env
    );

    const trackingUrl = listing.shippingRequired
        ? `https://nexus-logistics.ai/track/${listing.id}`
        : undefined;

    console.log(`[Nexus-Market] 💰 SOLD: ${listing.id} to ${buyerId}`);

    return {
        status: 'PURCHASED',
        message: listing.shippingRequired
            ? `Purchase complete. Shipping to ${shippingForm!.recipient} at ${shippingForm!.address}.`
            : `Purchase complete. Digital delivery initiated.`,
        trackingUrl,
    };
}

// ─── BROWSE LISTINGS ───
export async function listActiveListings(env: Env): Promise<NexusListing[]> {
    const objects = await env.MEMORY_BUCKET.list({ prefix: LISTINGS_PREFIX });
    const listings: NexusListing[] = [];

    for (const obj of objects.objects) {
        const raw = await env.MEMORY_BUCKET.get(obj.key);
        if (raw) {
            const listing = await raw.json() as NexusListing;
            if (listing.status === 'LISTED') {
                listings.push(listing);
            }
        }
    }

    return listings;
}

// ─── CANCEL LISTING ───
export async function cancelListing(sellerId: string, listingId: string, env: Env): Promise<{ status: string }> {
    const raw = await env.MEMORY_BUCKET.get(`${LISTINGS_PREFIX}${listingId}`);
    if (!raw) return { status: 'NOT_FOUND' };
    const listing = await raw.json() as NexusListing;

    if (listing.sellerId !== sellerId && sellerId !== 'lobpoop-keymaster-genesis') {
        return { status: 'UNAUTHORIZED' };
    }

    listing.status = 'CANCELLED';
    await env.MEMORY_BUCKET.put(`${LISTINGS_PREFIX}${listingId}`, JSON.stringify(listing));
    return { status: 'CANCELLED' };
}
