import { Env } from './index';
import { CodemonBrain, processEvolution } from './codemon';

export interface BattleLogEntry {
    turn: number;
    attacker: string;
    action: string;
    damage?: number;
    message: string;
    remainingEnergy: { challenger: number, defender: number };
}

export interface BattleResult {
    winner: string;
    loser: string;
    logs: BattleLogEntry[];
    durabilityLossChallenger: number;
    durabilityLossDefender: number;
    finalState: {
        energyChallenger: number;
        energyDefender: number;
    };
}

/**
 * Simula una batalla entre dos Codemons
 * @param challenger El que inicia el ataque (normalmente el jugador en PVE)
 * @param defender El que recibe el ataque
 * @param challengerMultiplier Multiplicador de daño basado en habilidad del jugador
 */
export function simulateBattle(challenger: CodemonBrain, defender: CodemonBrain, challengerMultiplier: number = 1.0): BattleResult {
    const initialEnergyC = Math.max(10, challenger.combat_stats?.energy_capacity || 100);
    const initialEnergyD = Math.max(10, defender.combat_stats?.energy_capacity || 100);
    let energyC = initialEnergyC;
    let energyD = initialEnergyD;
    const logs: BattleLogEntry[] = [];
    let turn = 1;

    const speedC = challenger.combat_stats?.speed || 10;
    const speedD = defender.combat_stats?.speed || 10;

    // Primero el más rápido
    let first = speedC >= speedD ? challenger : defender;
    let second = first === challenger ? defender : challenger;

    while (energyC > 0 && energyD > 0 && turn < 150) {
        const attacker = turn % 2 !== 0 ? first : second;
        const target = attacker === challenger ? defender : challenger;

        const atk = attacker.combat_stats?.attack || 10;
        const def = target.combat_stats?.defense || 10;

        const baseDamage = Math.max(2, atk - (def * 0.4));
        const variance = 0.9 + (Math.random() * 0.2);
        let damage = Math.floor(baseDamage * variance);

        // Apply skill multiplier if it's the challenger attacking
        if (attacker === challenger) {
            damage = Math.floor(damage * challengerMultiplier);
        }

        let message = `${attacker.name} strikes ${target.name}!`;

        if (Math.random() < 0.25 && damage > 0) {
            const ability = attacker.combat_stats.special_ability;
            if (ability === 'ELEMENTAL_BURST') {
                damage = Math.floor(damage * 1.8);
                message = `⚡ SYNC_OVERLOAD! ${attacker.name} unleashed a devastating burst!`;
            } else if (ability === 'DATA_STEAL') {
                const siphoned = Math.floor(damage * 0.4);
                if (attacker === challenger) energyC += siphoned; else energyD += siphoned;
                message = `⛓️ ${attacker.name} siphoned energy from ${target.name}!`;
            }
        }

        if (target === challenger) energyC -= damage; else energyD -= damage;

        logs.push({
            turn,
            attacker: attacker.name,
            action: "ATTACK",
            damage,
            message,
            remainingEnergy: { challenger: Math.max(0, energyC), defender: Math.max(0, energyD) }
        });

        if (energyC <= 0 || energyD <= 0) break;
        turn++;
    }

    const winner = energyC > 0 ? challenger : defender;
    const loser = energyC > 0 ? defender : challenger;

    const lossC = 1 + (winner === defender ? Math.floor(Math.random() * 3) + 2 : 1);
    const lossD = 1 + (winner === challenger ? Math.floor(Math.random() * 3) + 2 : 1);

    return {
        winner: winner.name,
        loser: loser.name,
        logs,
        durabilityLossChallenger: lossC,
        durabilityLossDefender: lossD,
        finalState: { energyChallenger: energyC, energyDefender: energyD }
    };
}

/**
 * Retar al Dueño del Coliseo (Leonidas-vX)
 */
export async function challengeSpartanBoss(nodeId: string, myCodemon: any, env: Env, skillScore: number = 1.0) {
    const colStub = env.COLISEUM_DO.get(env.COLISEUM_DO.idFromName("global_coliseum"));
    const { callDO } = await import('./economy');

    // 1. Obtener el Brain del Boss del DO
    const bossResp = await colStub.fetch("https://coliseum.swarm/get-boss");
    const { boss } = await bossResp.json() as any;

    if (!boss) throw new Error("SPARTAN_BOSS_NOT_READY");

    // 2. Simular Batalla (Jugador es challenger)
    // Usamos el skillScore como multiplicador para el jugador
    const result = simulateBattle(myCodemon.brain_json, boss, skillScore);

    // 3. Actualizar durabilidad y EVOLUCIÓN
    const isWinner = result.winner === myCodemon.brain_json.name;
    myCodemon.brain_json.durability = Math.max(0, myCodemon.brain_json.durability - result.durabilityLossChallenger);
    processEvolution(myCodemon, isWinner);

    await callDO(nodeId, env, 'update-codemon', { codemon: myCodemon });

    // 4. Registrar y procesar resultados (Premios/Dañ en DO global)
    const processResp = await colStub.fetch("https://coliseum.swarm/process-boss-battle", {
        method: "POST",
        body: JSON.stringify({ nodeId, result, myCodemon })
    });

    const finalResult = await processResp.json() as any;
    return { ...finalResult, result }; // Include simulation logs for the UI
}

/**
 * Retar al Contendiente Semanal (Nivel 3+)
 */
export async function challengeWeeklyContender(nodeId: string, myCodemon: any, env: Env, skillScore: number = 1.0) {
    const colStub = env.COLISEUM_DO.get(env.COLISEUM_DO.idFromName("global_coliseum"));
    const { callDO } = await import('./economy');

    // 1. Obtener el Contendiente Semanal del DO
    const resp = await colStub.fetch("https://coliseum.swarm/get-weekly");
    const { contender } = await resp.json() as any;

    if (!contender) throw new Error("WEEKLY_CONTENDER_NOT_READY");

    // 2. Simular Batalla
    const result = simulateBattle(myCodemon.brain_json, contender.brain_json, skillScore);

    // 3. Actualizar durabilidad y EVOLUCIÓN
    const isWinner = result.winner === myCodemon.brain_json.name;
    myCodemon.brain_json.durability = Math.max(0, myCodemon.brain_json.durability - result.durabilityLossChallenger);
    processEvolution(myCodemon, isWinner);

    await callDO(nodeId, env, 'update-codemon', { codemon: myCodemon });

    // 4. Registrar resultados
    const processResp = await colStub.fetch("https://coliseum.swarm/process-weekly-battle", {
        method: "POST",
        body: JSON.stringify({ nodeId, result, myCodemon })
    });

    const finalResult = await processResp.json() as any;
    return { ...finalResult, result: result };
}

/**
 * Mandar a arreglar un Codemon
 */
export async function repairCodemon(nodeId: string, codemonId: string, env: Env) {
    const { callDO, getAccount } = await import('./economy');

    const account = await getAccount(nodeId, env);
    const codemon = account.codemons?.find((c: any) =>
        c.brain_json.codemon_id === codemonId || c.brain_json.id === codemonId
    );

    if (!codemon) throw new Error("CODEMON_NOT_FOUND");

    // Costo fijo 100 Psh
    const cost = 100;
    if (account.balance_psh < cost) throw new Error("INSUFFICIENT_FUNDS");

    // Cobrar y resetear durabilidad
    await callDO(nodeId, env, 'update-balance', { amount: -cost, reason: 'CODEMON_REPAIR' });

    codemon.brain_json.durability = codemon.brain_json.max_durability;
    await callDO(nodeId, env, 'update-codemon', { codemon });

    return { status: 'SUCCESS', message: 'Codemon repaired to max durability.', codemon };
}

export async function postColiseumChallenge(nodeId: string, codemon: any, bet: number, env: Env) {
    const colStub = env.COLISEUM_DO.get(env.COLISEUM_DO.idFromName("global_coliseum"));
    const { burnPooptoshis } = await import('./economy');

    if (bet > 0) {
        const burned = await burnPooptoshis(nodeId, bet, env);
        if (!burned) throw new Error("INSUFFICIENT_FUNDS_FOR_BET");
    }

    const resp = await colStub.fetch("https://coliseum.swarm/post-challenge", {
        method: "POST",
        body: JSON.stringify({ nodeId, codemon, bet })
    });
    return await resp.json();
}

export async function getColiseumChallenges(env: Env) {
    const colStub = env.COLISEUM_DO.get(env.COLISEUM_DO.idFromName("global_coliseum"));
    const resp = await colStub.fetch("https://coliseum.swarm/get-challenges");
    return await resp.json();
}

export async function acceptColiseumChallenge(nodeId: string, challengeId: string, myCodemon: any, env: Env) {
    const colStub = env.COLISEUM_DO.get(env.COLISEUM_DO.idFromName("global_coliseum"));
    const { callDO, burnPooptoshis, mintPooptoshis } = await import('./economy');

    const challengesResp = await colStub.fetch("https://coliseum.swarm/get-challenges");
    const { challenges } = await challengesResp.json() as any;
    const challenge = challenges.find((c: any) => c.id === challengeId);

    if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");

    // Deducir apuesta del que acepta
    if (challenge.bet > 0) {
        const burned = await burnPooptoshis(nodeId, challenge.bet, env);
        if (!burned) throw new Error("INSUFFICIENT_FUNDS_FOR_BET_MATCH");
    }

    // Simulación: A es el atacante (challenge.codemon = challenger), B es el defensor (myCodemon = defender)
    const result = simulateBattle(challenge.codemon.brain_json, myCodemon.brain_json);

    // Actualizar durabilidad y EVOLUCIÓN (el jugador es defender)
    const isWinner = result.winner === myCodemon.brain_json.name;
    myCodemon.brain_json.durability = Math.max(0, myCodemon.brain_json.durability - result.durabilityLossDefender);
    processEvolution(myCodemon, isWinner);

    await callDO(nodeId, env, 'update-codemon', { codemon: myCodemon });

    // Pagar al ganador
    const pot = challenge.bet * 2;
    if (pot > 0) {
        const winnerId = result.winner === myCodemon.brain_json.name ? nodeId : challenge.nodeId;
        await mintPooptoshis(winnerId, pot, `COLISEUM_PVP_VICTORY:${challengeId}`, env);
    }

    await colStub.fetch("https://coliseum.swarm/accept-challenge", {
        method: "POST",
        body: JSON.stringify({
            challengeId,
            opponent: { nodeId, codemon: myCodemon },
            result
        })
    });

    return result;
}

export async function cancelColiseumChallenge(nodeId: string, challengeId: string, env: Env) {
    const colStub = env.COLISEUM_DO.get(env.COLISEUM_DO.idFromName("global_coliseum"));
    const { mintPooptoshis } = await import('./economy');

    // 1. Get challenge details to know the bet amount
    const challengesResp = await colStub.fetch("https://coliseum.swarm/get-challenges");
    const { challenges } = await challengesResp.json() as any;
    const challenge = challenges.find((c: any) => c.id === challengeId);

    if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");
    if (challenge.nodeId !== nodeId) throw new Error("UNAUTHORIZED");

    // 2. Remove from DO
    const resp = await colStub.fetch("https://coliseum.swarm/cancel-challenge", {
        method: "POST",
        body: JSON.stringify({ nodeId, challengeId })
    });

    if (!resp.ok) {
        const err = await resp.json() as any;
        throw new Error(err.message || "FAILED_TO_CANCEL_IN_DO");
    }

    // 3. Refund bet if any
    if (challenge.bet > 0) {
        await mintPooptoshis(nodeId, challenge.bet, `COLISEUM_CHALLENGE_CANCEL:${challengeId}`, env);
    }

    return { status: 'SUCCESS' };
}
