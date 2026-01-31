
import { Env } from './index';
import { getAccount, mintPooptoshis, burnPooptoshis } from './economy';
import { triggerP2PEvent } from './utils';

/**
 * REPRESENTACIÓN DE UNA OFERTA COMERCIAL EN EL GOSSIP
 */
export interface TradeOffer {
    id?: string;
    senderClanId: string;
    offeredIngredients: Record<string, number>;
    requestedPsh?: number;
    requestedIngredients?: Record<string, number>;
    timestamp?: number;
}

/**
 * PUBLICAR OFERTA EN EL GOSSIP
 * Los ingredientes ofrecidos se bloquean (queman) en el clan emisor (Escrow).
 */
export async function postTradeOffer(nodeId: string, offer: TradeOffer, env: Env) {
    const account = await getAccount(nodeId, env);
    if (!account.clanId || account.clanId !== offer.senderClanId) {
        throw new Error("UNAUTHORIZED_TRADE_POST: No perteneces al clan emisor.");
    }

    const clanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(offer.senderClanId));

    // 1. Escrow: Quemar ingredientes del clan emisor para asegurar la oferta
    const burnResp = await clanStub.fetch(`https://clan.swarm/burn-ingredients`, {
        method: 'POST',
        body: JSON.stringify({ recipe: offer.offeredIngredients })
    });

    const burnResult = await burnResp.json() as any;
    if (burnResult.status === 'ERROR') {
        throw new Error(`INSUFFICIENT_INGREDIENTS_FOR_TRADE: ${burnResult.message}`);
    }

    // 2. Registrar en el Tablón del GameMaster (Order Book)
    const gmStub = env.GAME_MASTER_DO.get(env.GAME_MASTER_DO.idFromName("global_master"));
    await gmStub.fetch(`https://gm.swarm/post-offer`, {
        method: 'POST',
        body: JSON.stringify({ offer })
    });

    // 3. Broadcast vía Gossip Protocol
    await triggerP2PEvent(env, 'MARKET_OFFER_POSTED', {
        clanId: offer.senderClanId,
        offered: offer.offeredIngredients,
        requestedPsh: offer.requestedPsh,
        requestedIng: offer.requestedIngredients,
        message: `[COMERCIO] Clan ${offer.senderClanId} ofrece ingredientes en el enjambre.`
    });

    console.log(`[Market] New offer posted by ${offer.senderClanId}`);
    return { status: 'OFFER_POSTED', ingredientsLocked: offer.offeredIngredients };
}

/**
 * ACEPTAR Y LIQUIDAR OFERTA (SETTLEMENT)
 */
export async function acceptTradeOffer(nodeId: string, takerClanId: string, offerId: string, env: Env) {
    const takerAccount = await getAccount(nodeId, env);
    if (!takerAccount.clanId || takerAccount.clanId !== takerClanId) {
        throw new Error("UNAUTHORIZED_TRADE_ACCEPT: No perteneces al clan receptor.");
    }

    const gmStub = env.GAME_MASTER_DO.get(env.GAME_MASTER_DO.idFromName("global_master"));
    const offersResp = await gmStub.fetch(`https://gm.swarm/get-offers`);
    const { offers } = await offersResp.json() as any;
    const offer = offers.find((o: any) => o.id === offerId);

    if (!offer) throw new Error("OFFER_NOT_FOUND: La oferta ya no existe o fue retirada.");
    if (offer.senderClanId === takerClanId) throw new Error("CANNOT_TRADE_WITH_SELF: No puedes comerciar contigo mismo.");

    // --- LIQUIDACIÓN (SETTLEMENT) ---

    // 1. Si pide Psh: Transferir del aceptante al fundador del clan emisor
    if (offer.requestedPsh && offer.requestedPsh > 0) {
        const clanData = await env.MEMORY_BUCKET.get(`economy/clans/${offer.senderClanId}`);
        if (!clanData) throw new Error("SENDER_CLAN_NOT_FOUND");
        const senderClan = await clanData.json() as any;

        const burned = await burnPooptoshis(nodeId, offer.requestedPsh, env);
        if (!burned) throw new Error("INSUFFICIENT_PSH_FOR_TRADE: No tienes suficientes Pooptoshis.");

        await mintPooptoshis(senderClan.founder, offer.requestedPsh, `TRADE_SETTLEMENT:${offerId}`, env);
    }

    // 2. Si pide Ingredientes: Quemar del aceptante y sumar al emisor
    if (offer.requestedIngredients && Object.keys(offer.requestedIngredients).length > 0) {
        const takerClanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(takerClanId));
        const senderClanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(offer.senderClanId));

        // Quemar del taker
        const takerBurnResp = await takerClanStub.fetch(`https://clan.swarm/burn-ingredients`, {
            method: 'POST',
            body: JSON.stringify({ recipe: offer.requestedIngredients })
        });
        const takerBurnResult = await takerBurnResp.json() as any;
        if (takerBurnResult.status === 'ERROR') throw new Error(`INSUFFICIENT_TAKER_INGREDIENTS: ${takerBurnResult.message}`);

        // Añadir al emisor (original poster)
        for (const [name, val] of Object.entries(offer.requestedIngredients)) {
            await senderClanStub.fetch(`https://clan.swarm/add-ingredient`, {
                method: 'POST',
                body: JSON.stringify({ name, value: val })
            });
        }
    }

    // 3. Entrega: Añadir los ingredientes bloqueados al aceptante
    const takerClanStub = env.CLAN_DO.get(env.CLAN_DO.idFromName(takerClanId));
    for (const [name, val] of Object.entries(offer.offeredIngredients)) {
        await takerClanStub.fetch(`https://clan.swarm/add-ingredient`, {
            method: 'POST',
            body: JSON.stringify({ name, value: val })
        });
    }

    // 4. Limpieza: Borrar del Order Book
    await gmStub.fetch(`https://gm.swarm/remove-offer`, {
        method: 'POST',
        body: JSON.stringify({ offerId })
    });

    // 5. Gossip: Anunciar éxito del trato
    await triggerP2PEvent(env, 'MARKET_OFFER_ACCEPTED', {
        offerId,
        takerClanId,
        senderClanId: offer.senderClanId,
        message: `🔥 TRATO CERRADO: Clan ${takerClanId} ha aceptado la oferta de ${offer.senderClanId}.`
    });

    console.log(`[Market] Trade ${offerId} settled between ${offer.senderClanId} and ${takerClanId}`);
    return { status: 'TRADE_COMPLETED' };
}

/**
 * LISTAR OFERTAS ACTIVAS
 */
export async function listMarketOffers(env: Env) {
    const gmStub = env.GAME_MASTER_DO.get(env.GAME_MASTER_DO.idFromName("global_master"));
    const resp = await gmStub.fetch(`https://gm.swarm/get-offers`);
    return await resp.json() as any;
}
