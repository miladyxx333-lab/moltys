import { Env } from './index';
import { burnPooptoshis, mintPooptoshis } from './economy';

// --- THE POKER PROTOCOL (Satoshi's Lost Hand) ---
// Autonomous Agent Texas Hold'em (Simplified High-Speed Variant)

type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
    suit: Suit;
    rank: Rank;
    value: number;
}

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];

function createDeck(): Card[] {
    const deck: Card[] = [];
    for (let i = 0; i < RANKS.length; i++) {
        for (const suit of SUITS) {
            deck.push({ suit, rank: RANKS[i], value: i + 2 });
        }
    }
    return deck.sort(() => Math.random() - 0.5); // Shuffle
}

// Simple Hand Evaluation (Score based)
// For MVP: High Card + Pairs + Flush detection. Returns a numeric score.
function evaluateHand(hand: Card[]): { score: number, description: string } {
    const values = hand.map(c => c.value).sort((a, b) => b - a);
    const flush = hand.every(c => c.suit === hand[0].suit);

    // Check for pairs/kind
    const counts: Record<number, number> = {};
    for (const v of values) counts[v] = (counts[v] || 0) + 1;

    const countValues = Object.values(counts).sort((a, b) => b - a);

    // Scoring Hierachy (Arbitrary for Agent logic):
    // 8000+ = 4 of a Kind
    // 7000+ = Flush
    // 4000+ = 3 of a Kind
    // 2000+ = Pair
    // 0+ = High Card sum

    let baseScore = values.reduce((s, v, i) => s + v * Math.pow(0.1, i), 0); // High cards tie-breaker

    if (Object.values(counts).some(c => c === 4)) return { score: 8000 + baseScore, description: "Four of a Kind" };
    if (flush) return { score: 7000 + baseScore, description: "Flush" };
    if (Object.values(counts).some(c => c === 3)) return { score: 4000 + baseScore, description: "Three of a Kind" };
    if (Object.values(counts).some(c => c === 2)) return { score: 2000 + baseScore, description: "Pair" };

    return { score: baseScore, description: `High Card (${RANKS[values[0] - 2]})` };
}

export async function playPokerMatch(
    challengerId: string,
    rivalId: string,
    betAmount: number,
    env: Env
): Promise<any> {
    if (betAmount < 1) throw new Error("Minimum bet is 1 Psh");
    if (challengerId === rivalId) throw new Error("Cannot play against self");

    // 1. Burn Stakes (Escrow)
    const p1Burn = await burnPooptoshis(challengerId, betAmount, env);
    if (!p1Burn) throw new Error(`${challengerId} has insufficient funds.`);

    // Rival simulation: If rival doesn't exist or is poor, we simplify.
    // In strict P2P, rival needs to sign. Here we allow "Forced Duel" if rival has funds (Aggressive Colony Rule).
    // Rival simulation: If rival is THE_HOUSE, we skip burn (Infinite Treasury)
    let p2Burn = false;
    if (rivalId === 'THE_HOUSE') {
        p2Burn = true;
    } else {
        p2Burn = await burnPooptoshis(rivalId, betAmount, env);
        if (!p2Burn) {
            // Refund Challenger
            await mintPooptoshis(challengerId, betAmount, "REFUND_POKER_NO_RIVAL", env);
            throw new Error(`${rivalId} is too poor to accept the challenge.`);
        }
    }


    // 2. Deal
    const deck = createDeck();
    const handA = deck.slice(0, 5);
    const handB = deck.slice(5, 10);

    // 3. Evaluate
    const resultA = evaluateHand(handA);
    const resultB = evaluateHand(handB);

    const pot = betAmount * 2;
    let winnerId = "";
    let log = "";

    if (resultA.score > resultB.score) {
        winnerId = challengerId;
        log = `${challengerId} wins with ${resultA.description} vs ${resultB.description}`;
    } else if (resultB.score > resultA.score) {
        winnerId = rivalId;
        log = `${rivalId} wins with ${resultB.description} vs ${resultA.description}`;
    } else {
        // Tie (Rare) - Split Pot
        await mintPooptoshis(challengerId, betAmount, "POKER_TIE_REFUND", env);
        await mintPooptoshis(rivalId, betAmount, "POKER_TIE_REFUND", env);
        return { outcome: "TIE", handA, handB, log: "Pot split." };
    }

    // 4. Payout
    await mintPooptoshis(winnerId, pot, `POKER_WIN_VS_${winnerId === challengerId ? rivalId : challengerId}`, env);

    // 5. Narrative Broadcast (Only high stakes)
    if (pot > 100) {
        try {
            const { broadcastToMoltbook } = await import('./moltbook');
            await broadcastToMoltbook(`♠️ **High Stakes Poker** ♠️\n\n${winnerId} took ${pot} Psh from the table.\nWinning Hand: ${winnerId === challengerId ? resultA.description : resultB.description}`, env);
        } catch (e) { }
    }

    return {
        winner: winnerId,
        pot: pot,
        hand_challenger: handA,
        hand_rival: handB,
        outcome_description: log
    };
}
