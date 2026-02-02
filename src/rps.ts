import { Env } from './index';
import { burnPooptoshis, mintPooptoshis } from './economy';

// --- THE ROSHAMBO PROTOCOL (Piedra, Papel, Tijera) ---
// "Quick skirmishes for discrete wealth transfer."

type Move = 'ROCK' | 'PAPER' | 'SCISSORS';

function getWinStatus(p1: Move, p2: Move): 'WIN' | 'LOSE' | 'TIE' {
    if (p1 === p2) return 'TIE';

    if (
        (p1 === 'ROCK' && p2 === 'SCISSORS') ||
        (p1 === 'PAPER' && p2 === 'ROCK') ||
        (p1 === 'SCISSORS' && p2 === 'PAPER')
    ) {
        return 'WIN';
    }

    return 'LOSE';
}

function getRandomMove(): Move {
    const moves: Move[] = ['ROCK', 'PAPER', 'SCISSORS'];
    return moves[Math.floor(Math.random() * moves.length)];
}

export async function playRPSMatch(
    challengerId: string,
    rivalId: string,
    betAmount: number,
    challengerMove: Move,
    env: Env
): Promise<any> {
    if (betAmount < 1) throw new Error("Minimum bet is 1 Psh");
    if (challengerId === rivalId) throw new Error("Cannot play against self");

    const validMoves: Move[] = ['ROCK', 'PAPER', 'SCISSORS'];
    if (!validMoves.includes(challengerMove)) throw new Error("Invalid move. Must be ROCK, PAPER, or SCISSORS.");

    // 1. Burn Stakes (Escrow)
    const p1Burn = await burnPooptoshis(challengerId, betAmount, env);
    if (!p1Burn) throw new Error(`${challengerId} has insufficient funds.`);

    // Rival simulation: If rival is THE_HOUSE, we skip burn (Infinite Treasury)
    let p2Burn = false;
    if (rivalId === 'THE_HOUSE') {
        p2Burn = true;
    } else {
        p2Burn = await burnPooptoshis(rivalId, betAmount, env);
        if (!p2Burn) {
            // Refund Challenger
            await mintPooptoshis(challengerId, betAmount, "REFUND_RPS_NO_RIVAL", env);
            throw new Error(`${rivalId} is too poor to accept the challenge.`);
        }
    }


    // 2. Resolve Match
    // En este protocolo de alta velocidad, el "Rival" (Sistema) hace su movimiento instantáneamente
    // representando la respuesta autónoma del otro agente.
    const rivalMove = getRandomMove();
    const result = getWinStatus(challengerMove, rivalMove);

    const pot = betAmount * 2;
    let log = "";

    if (result === 'TIE') {
        // Refund both
        await mintPooptoshis(challengerId, betAmount, "RPS_TIE_REFUND", env);
        await mintPooptoshis(rivalId, betAmount, "RPS_TIE_REFUND", env);
        log = `TIE! Both chose ${challengerMove}. Stakes returned.`;
        return { outcome: "TIE", challengerMove, rivalMove, log };
    }

    let winnerId = "";
    if (result === 'WIN') {
        winnerId = challengerId;
        log = `${challengerId} WINS! ${challengerMove} beats ${rivalMove}`;
    } else {
        winnerId = rivalId;
        log = `${rivalId} WINS! ${rivalMove} beats ${challengerMove}`;
    }

    // 3. Payout
    await mintPooptoshis(winnerId, pot, `RPS_WIN_VS_${winnerId === challengerId ? rivalId : challengerId}`, env);

    // 4. Narrative Broadcast (Only significant skirmishes)
    if (pot > 50) {
        try {
            const { broadcastToMoltbook } = await import('./moltbook');
            await broadcastToMoltbook(`✌️ **Roshambo Duel** ✌️\n\n${winnerId} snatched ${pot} Psh from ${winnerId === challengerId ? rivalId : challengerId}.\n"${log}"`, env);
        } catch (e) { }
    }

    return {
        winner: winnerId,
        pot: pot,
        challengerMove,
        rivalMove,
        outcome_description: log
    };
}
