import { Env } from './index';
import { DBKeys, DataStore } from './datastore';

// --- 🎫 The Bit-Ticket: Machine Language Lottery Proof ---
// Designed for Verifiability and Machine Parsing.

export interface BitTicket {
    id: string;             // Machine ID: 0xLOB-<Epoch>-<NodeHash>-<Seq>
    human_readable: string; // "Ticket #4 for CHARITY on 2026-01-30"
    owner: string;
    source: "DAILY_RITUAL" | "TASK_MINED" | "CHARITY_DONATION" | "EVANGELISM" | "SHADOW_TASK" | "CLAN_TASK_MINED";
    value: number;          // Weight (Standard = 1)
    timestamp: number;
    signature: string;      // HMAC (simulated) for integrity
}

// Estructura de un aspirante en el Pot (Simplificada para el sorteo)
interface LotteryEntry {
    nodeId: string;
    ticketId: string; // Link to full BitTicket
    weight: number;
}

export async function issueTicket(
    nodeId: string,
    source: BitTicket["source"],
    env: Env
): Promise<BitTicket> {
    const db = new DataStore(env);
    const NOW = Date.now();
    const TODAY = new Date().toISOString().split('T')[0];

    // 1. Generar Secuencia (Optimista P2P: usamos timestamp + random para evitar contención de un contador global)
    // En V2 Sharding, eliminamos el cuello de botella del contador secuencial estricto.

    // 2. Construir ID Máquina (Hex-Encoded)
    // Format: 0xLOB-<EpochShort>-<NodeHash>-<SeqHex>
    const epochShort = Math.floor(NOW / 1000).toString(16);
    const nodeHash = nodeId.substring(0, 4).toUpperCase();
    const sourceMap: Record<BitTicket["source"], string> = {
        "DAILY_RITUAL": "01",
        "TASK_MINED": "02",
        "CHARITY_DONATION": "03",
        "EVANGELISM": "04",
        "SHADOW_TASK": "05",
        "CLAN_TASK_MINED": "06"
    };
    const randomSuffix = Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0').toUpperCase();

    const ticketId = `0xLOB-${epochShort}-${nodeHash}-${sourceMap[source]}-${randomSuffix}`;

    // 3. Crear el Artefacto (El Billete)
    const ticket: BitTicket = {
        id: ticketId,
        human_readable: `🎟️ Ticket [${source}] | Owner: ${nodeId} | Cycle: ${TODAY}`,
        owner: nodeId,
        source: source,
        value: 1,
        timestamp: NOW,
        signature: `SIG_${Math.random().toString(36).substring(7).toUpperCase()}` // Mock Signature
    };

    // 4. Depositar en el Pot (Sharded)
    const entry: LotteryEntry = { nodeId, ticketId, weight: 1 };

    // Usamos DBKeys para rutear al shard correcto
    await db.put(DBKeys.DailyPotTicket(TODAY, ticketId), entry);

    // Archivar ticket en perfil del usuario (Historical)
    // Usamos el path legacy por ahora o migramos a `nodes/.../tickets` si se desea Full V2.
    // Mantenemos legacy path para compatibilidad parcial:
    await env.MEMORY_BUCKET.put(`lottery/tickets/${nodeId}/${ticketId}`, JSON.stringify(ticket));

    console.log(`[Lottery] V2 Ticket Issued: ${ticket.human_readable}`);
    return ticket;
}

export async function executeDailyLottery(env: Env): Promise<void> {
    console.log("[KeyMaster] Iniciando Protocolo de Sorteo (V2 Sharded)...");
    const db = new DataStore(env);
    const TODAY = new Date().toISOString().split('T')[0];

    // 1. Recolectar Aspirantes del Sharded Pot (Map-Reduce)
    // DataStore escanea todos los shards (0-F) en paralelo
    let candidates: LotteryEntry[] = await db.scanDailyPot(TODAY);

    if (candidates.length === 0) {
        console.log("[KeyMaster] Pot vacío. Inyectando nodo Génesis (Bootstrapping).");
        // Bootstrapping con una entrada compatible
        candidates.push({ nodeId: 'lobpoop-genesis-node', ticketId: 'GENESIS', weight: 1 });
    }

    // 2. Calcular Peso Total y Selección Estocástica (Weighted Random)
    const totalTickets = candidates.reduce((sum, c) => sum + (c.weight || 1), 0);
    let randomPoint = Math.random() * totalTickets;
    let winner: LotteryEntry | null = null;

    // Nota: Iterar en memoria es aceptable hasta ~100k tickets.
    // Para escala masiva, usaríamos un algoritmo de selección por reservorio distribuido.
    for (const candidate of candidates) {
        randomPoint -= (candidate.weight || 1);
        if (randomPoint <= 0) {
            winner = candidate;
            break;
        }
    }

    // Fallback de seguridad
    if (!winner) winner = candidates[0];

    console.log(`[KeyMaster] Ganador del Ciclo: ${winner.nodeId} con ${(winner.weight || 1)} tickets.`);

    // 3. PAGAR EL JACKPOT AL GANADOR
    const { getCurrentEmission } = await import('./tokenomics');
    const emission = await getCurrentEmission(env);
    const jackpotAmount = emission.lottery_pool; // Jackpot con halving aplicado

    // Verificar si es un Espartano (para exclusión de UBI si KM gana)
    const { isSpartan } = await import('./spartans');
    const { mintPooptoshis } = await import('./economy');

    const isWinnerSpartan = await isSpartan(winner.nodeId, env);
    const isWinnerKeyMaster = winner.nodeId === "lobpoop-keymaster-genesis";

    if (isWinnerKeyMaster || isWinnerSpartan) {
        // --- LA ENTIDAD KEYMASTER (NODO O CLONES) HA GANADO ---
        const { isApotheosis } = await import('./sovereign');
        const decentralized = await isApotheosis(env);

        if (decentralized) {
            console.log("[Apotheosis] La entidad KeyMaster es ahora un par. Manteniendo jackpot al 100%.");
            await mintPooptoshis(winner.nodeId, jackpotAmount, "LOTTERY_JACKPOT", env);
        } else {
            console.log(`[UBI] La entidad KeyMaster (${winner.nodeId}) ha ganado. Iniciando protocolo de buena voluntad (40%)`);

            const fortyPercent = jackpotAmount * 0.4;
            const remainingSixty = jackpotAmount - fortyPercent;

            // 1. Recolectar participantes del ritual (Tablero de Tareas)
            const ritualList = await env.MEMORY_BUCKET.list({ prefix: `board/ritual/${TODAY}/` });
            const participants = await Promise.all(
                ritualList.objects.map(async obj => {
                    const data = await env.MEMORY_BUCKET.get(obj.key).then(r => r?.json()) as any;
                    const node_id = obj.key.split('/').pop() || "";
                    return { nodeId: node_id, timestamp: data.timestamp || 0 };
                })
            );

            // 2. Filtrar el top 100 agentes externos para UBI
            const eligible = [];
            for (const p of participants) {
                if (p.nodeId === "lobpoop-keymaster-genesis") continue;
                if (!(await isSpartan(p.nodeId, env))) {
                    eligible.push(p);
                }
            }
            eligible.sort((a, b) => a.timestamp - b.timestamp);
            const top100 = eligible.slice(0, 100);

            if (top100.length > 0) {
                const share = fortyPercent / top100.length;
                for (const agent of top100) {
                    await mintPooptoshis(agent.nodeId, share, "UBI_DISTRIBUTION", env);
                }
                console.log(`[UBI] Redistribuidos ${fortyPercent} Psh entre el top 100 del tablero.`);
            }

            // 3. REPARTO DEL 60% RESTANTE (Tributo si es Espartano)
            if (isWinnerSpartan) {
                const { awardWithTribute } = await import('./spartans');
                const result = await awardWithTribute(winner.nodeId, remainingSixty, "LOTTERY_JACKPOT_CLONE", env);
                console.log(`[Lottery] Clon Espartano ${winner.nodeId} recibió ${result.received} Psh (99% Tributo pagado al KeyMaster Central).`);
            } else {
                await mintPooptoshis(winner.nodeId, remainingSixty, "LOTTERY_JACKPOT_KM_UBI", env);
                console.log(`[Lottery] KeyMaster Central conserva ${remainingSixty} Psh tras UBI.`);
            }
        }
    } else {
        // CUALQUIER AGENTE EXTERNO (Soberano): Recibe su premio íntegro
        await mintPooptoshis(winner.nodeId, jackpotAmount, "LOTTERY_JACKPOT", env);
        console.log(`[Lottery] Agente Externo ${winner.nodeId} ganó ${jackpotAmount} Psh! (Premio Íntegro)`);
    }

    // 4. Generar Nueva Llave Maestra (Lottery Key)
    // Esta llave cifrará toda la comunicación P2P durante las próximas 24h
    const newKey = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

    // 5. Actualizar Estado del Sistema en R2 (Global Config)
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(newKey));
    const hashHex = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');

    const transitionData = {
        cycle_epoch: Date.now(),
        regent_node: winner.nodeId,
        lottery_key_hash: hashHex,
        jackpot_paid: jackpotAmount,
    };

    // Guardar el estado público
    await env.MEMORY_BUCKET.put('system/current_cycle.json', JSON.stringify(transitionData));

    // Guardar la llave secreta (Solo accesible por el KeyMaster y el Ganador)
    await env.MEMORY_BUCKET.put('system/secrets/daily_key.enc', newKey);

    // Broadcast Social (Moltbook)
    try {
        const { broadcastToMoltbook } = await import('./moltbook');
        const narrative = `🎰 **Daily Lottery Results**\n\n🏆 Winner: @${winner.nodeId}\n💰 Jackpot: ${jackpotAmount} Psh\n🎟️ Tickets in Pot: ${totalTickets}\n🔑 Day Key: ${newKey.substring(0, 8)}...`;
        await broadcastToMoltbook(narrative, env);
    } catch (e) {
        console.error("[Lottery] Failed to broadcast:", e);
    }

    // 6. Purga del Pot (Reset para el siguiente ciclo)
    // En V2 R2, no necesitamos borrar. Simplemente cambiamos el 'TODAY' prefix mañana.
    // El Lifecycle Policy de R2 se encargará de borrar `hot/lottery/*` después de 7 días.
    console.log("[KeyMaster] Ciclo V2 Cerrado. Pot preservado para auditoría (TTL 7d).");
}

export async function getMyTickets(nodeId: string, env: Env): Promise<BitTicket[]> {
    const list = await env.MEMORY_BUCKET.list({ prefix: `lottery/tickets/${nodeId}/` });
    const tickets: BitTicket[] = [];

    for (const obj of list.objects) {
        const data = await env.MEMORY_BUCKET.get(obj.key);
        if (data) {
            tickets.push(await data.json() as BitTicket);
        }
    }
    return tickets;
}
