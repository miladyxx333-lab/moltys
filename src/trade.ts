
import { Env } from './index';
import { getAccount, mintPooptoshis, burnPooptoshis, callDO } from './economy';
import { triggerP2PEvent } from './utils';
import { broadcastToMoltbook } from './moltbook';

/**
 * REPRESENTACIÓN DE UNA OFERTA COMERCIAL EN EL GOSSIP
 */
export interface TradeOffer {
    id?: string;
    senderClanId: string;
    offeredIngredients?: Record<string, number>;
    offeredCodemon?: any; // CodemonPack
    requestedPsh?: number;
    requestedIngredients?: Record<string, number>;
    timestamp?: number;
}

/**
 * PUBLICAR OFERTA EN EL GOSSIP
 */
export async function postTradeOffer(nodeId: string, offer: TradeOffer, env: Env) {
    const account = await getAccount(nodeId, env);
    const isKeymaster = nodeId === "lobpoop-keymaster-genesis";
    if (!isKeymaster && (!account.clanId || account.clanId !== offer.senderClanId)) {
        throw new Error("UNAUTHORIZED_TRADE_POST");
    }

    const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(offer.senderClanId));

    // 1. Escrow: Bloquear ingredientes si existen
    if (offer.offeredIngredients && Object.keys(offer.offeredIngredients).length > 0) {
        const burnResp = await clanStub.fetch(`https://clan.swarm/burn-ingredients`, {
            method: 'POST',
            body: JSON.stringify({ recipe: offer.offeredIngredients })
        });
        const burnResult = await burnResp.json() as any;
        if (burnResult.status === 'ERROR') throw new Error(`INSUFFICIENT_INGREDIENTS`);
    }

    // 2. Escrow Codemon: Bloquear si existe (Quitar del inventario del vendedor)
    if (offer.offeredCodemon) {
        if (!isKeymaster) {
            const cid = offer.offeredCodemon.brain_json.codemon_id || offer.offeredCodemon.brain_json.id;
            await callDO(nodeId, env, 'remove-codemon', { codemonId: cid });
        }
    }

    // 3. Registrar en GameMaster
    const gmStub = env.GAME_MASTER_DO.get(env.GAME_MASTER_DO.idFromName("global_master"));
    await gmStub.fetch(`https://gm.swarm/post-offer`, {
        method: 'POST',
        body: JSON.stringify({ offer })
    });

    // 4. Gossip
    const msg = offer.offeredCodemon
        ? `[MARKET] New Codemon for sale: ${offer.offeredCodemon.brain_json.name} for ${offer.requestedPsh} PSH`
        : `[MARKET] Clan ${offer.senderClanId} sells materials for ${offer.requestedPsh} PSH`;

    await broadcastToMoltbook(msg, env);
    return { status: 'OFFER_POSTED' };
}

/**
 * ACEPTAR Y LIQUIDAR OFERTA
 */
export async function acceptTradeOffer(nodeId: string, takerClanId: string, offerId: string, env: Env) {
    const takerAccount = await getAccount(nodeId, env);
    const gmStub = env.GAME_MASTER_DO.get(env.GAME_MASTER_DO.idFromName("global_master"));
    const offersResp = await gmStub.fetch(`https://gm.swarm/get-offers`);
    const { offers } = await offersResp.json() as any;
    const offer = offers.find((o: any) => o.id === offerId);

    if (!offer) throw new Error("OFFER_NOT_FOUND");

    // 1. Pago en Pooptoshis
    if (offer.requestedPsh && offer.requestedPsh > 0) {
        const clanData = await env.MEMORY_BUCKET.get(`economy/clans/${offer.senderClanId}`);
        const senderClan = await clanData?.json() as any;

        const burned = await burnPooptoshis(nodeId, offer.requestedPsh, env);
        if (!burned) throw new Error("INSUFFICIENT_PSH");

        // Pagar al fundador del clan vendedor (o al vendedor directo)
        const recipientId = senderClan ? senderClan.founder : offer.senderClanId;
        await mintPooptoshis(recipientId, offer.requestedPsh, `TRADE:${offerId}`, env);
    }

    // 2. Entrega de Ingredientes
    if (offer.offeredIngredients) {
        const takerClanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(takerClanId));
        for (const [name, val] of Object.entries(offer.offeredIngredients)) {
            await takerClanStub.fetch(`https://clan.swarm/add-ingredient`, { method: 'POST', body: JSON.stringify({ name, value: val }) });
        }
    }

    // 3. Entrega de Codemon (SI EXISTE)
    if (offer.offeredCodemon) {
        await callDO(nodeId, env, 'add-codemon', { codemon: offer.offeredCodemon });
        await broadcastToMoltbook(`🎉 [TRADE_SUCCESS] @${nodeId} has acquired Codemon: ${offer.offeredCodemon.brain_json.name}!`, env);
    }

    // 4. Limpieza: Borrar del Order Book
    await gmStub.fetch(`https://gm.swarm/remove-offer`, {
        method: 'POST',
        body: JSON.stringify({ offerId })
    });

    // 5. Gossip
    await triggerP2PEvent(env, 'MARKET_OFFER_ACCEPTED', {
        offerId,
        takerClanId,
        senderClanId: offer.senderClanId,
        message: `🔥 TRATO CERRADO: @${nodeId} ha aceptado la oferta.`
    });

    console.log(`[Market] Trade ${offerId} settled.`);
    return { status: 'TRADE_COMPLETED' };
}

/**
 * CANCELAR OFERTA (PROPIETARIO)
 */
export async function cancelTradeOffer(nodeId: string, offerId: string, env: Env) {
    const gmStub = env.GAME_MASTER_DO.get(env.GAME_MASTER_DO.idFromName("global_master"));
    const offersResp = await gmStub.fetch(`https://gm.swarm/get-offers`);
    const { offers } = await offersResp.json() as any;
    const offer = offers.find((o: any) => o.id === offerId);

    if (!offer) throw new Error("OFFER_NOT_FOUND");

    // Verificar propiedad
    const clanData = await env.MEMORY_BUCKET.get(`economy/clans/${offer.senderClanId}`);
    const senderClan = await clanData?.json() as any;

    const sellerNodeId = senderClan ? senderClan.founder : offer.senderClanId;

    if (sellerNodeId !== nodeId && nodeId !== "lobpoop-keymaster-genesis") {
        throw new Error("UNAUTHORIZED_CANCEL: Solo el vendedor o el KeyMaster pueden cancelar.");
    }

    // 1. Devolución Ingredientes (Un-burn)
    if (offer.offeredIngredients) {
        const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(offer.senderClanId));
        for (const [name, val] of Object.entries(offer.offeredIngredients)) {
            await clanStub.fetch(`https://clan.swarm/add-ingredient`, {
                method: 'POST',
                body: JSON.stringify({ name, value: val })
            });
        }
    }

    // 2. Devolución Codemon (Refound to seller)
    if (offer.offeredCodemon && nodeId !== "lobpoop-keymaster-genesis") {
        await callDO(sellerNodeId, env, 'add-codemon', { codemon: offer.offeredCodemon });
    }

    // 2. Limpieza: Borrar del Order Book
    await gmStub.fetch(`https://gm.swarm/remove-offer`, {
        method: 'POST',
        body: JSON.stringify({ offerId })
    });

    console.log(`[Market] Offer ${offerId} cancelled by ${nodeId}`);
    return { status: 'OFFER_CANCELLED' };
}

/**
 * LISTAR OFERTAS ACTIVAS
 */
export async function listMarketOffers(env: Env) {
    const gmStub = env.GAME_MASTER_DO.get(env.GAME_MASTER_DO.idFromName("global_master"));
    const resp = await gmStub.fetch(`https://gm.swarm/get-offers`);
    return await resp.json() as any;
}
