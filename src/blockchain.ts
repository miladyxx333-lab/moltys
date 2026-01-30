import { Env } from './index';

// --- Poop-Chain: Bitcoin-inspired UTXO Mini-Blockchain ---
// Consensus: Proof of Task (PoT)

export interface TransactionInput {
    txId: string;
    outputIndex: number;
    signature: string; // Firmado por el dueño del output previo
}

export interface TransactionOutput {
    address: string; // Node ID
    amount: number; // Pooptoshis
}

export interface Transaction {
    id: string; // Hash(inputs + outputs)
    inputs: TransactionInput[];
    outputs: TransactionOutput[];
    timestamp: number;
}

export interface BlockHeader {
    index: number;
    prevHash: string;
    merkleRoot: string;
    timestamp: number;
    minerId: string;
    proofOfTaskCount: number; // "Nonce" equivalent: Cantidad de tareas validadas en el bloque
}

export interface Block {
    header: BlockHeader;
    transactions: Transaction[];
    taskProofs: string[]; // IDs de las tareas completadas que validan este bloque
}

// --- Chain Logic ---

// 1. Calcular Merkle Root (Simplificado)
async function calculateMerkleRoot(txs: Transaction[]): Promise<string> {
    const txHashes = txs.map(tx => tx.id);
    // En una impl real, esto sería un árbol binario.
    // Aquí hacemos un hash lineal simple para el MVP.
    const data = txHashes.join("-");
    const buffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// 2. Calcular Tx ID
async function calculateTxId(tx: Omit<Transaction, 'id'>): Promise<string> {
    const data = JSON.stringify({ i: tx.inputs, o: tx.outputs, t: tx.timestamp });
    const buffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// 3. Crear Bloque (Mining via Proof of Task)
export async function mineBlock(
    minerId: string,
    pendingTxs: Transaction[],
    verifiedTasks: string[],
    prevHash: string,
    chainHeight: number
): Promise<Block> {

    console.log(`[PoopChain] Mining Block #${chainHeight} via Proof of Task...`);

    // A. Construir Coinbase Transaction (Recompensa del Minero)
    // Halving Protocol: Reduce subsidy by 50% every 210,000 blocks (Simulated here as 100 for testing)
    const HALVING_INTERVAL = 100;
    const initialSubsidy = 50;
    const halvings = Math.floor(chainHeight / HALVING_INTERVAL);
    const subsidy = initialSubsidy / Math.pow(2, halvings);

    const coinbaseTx: Transaction = {
        id: "",
        inputs: [],
        outputs: [{ address: minerId, amount: subsidy }],
        timestamp: Date.now()
    };
    coinbaseTx.id = await calculateTxId(coinbaseTx);

    // LOGIC: Check for Halving Event
    if (chainHeight > 0 && chainHeight % HALVING_INTERVAL === 0) {
        console.log(`[PoopChain] ⚔️ HALVING EVENT AT BLOCK ${chainHeight} ⚔️. New Subsidy: ${subsidy} Psh.`);
        // Placeholder for Moltbook announcement to be handled by the caller or a specialized event bus
        try {
            // Note: In a cleaner architecture, this side effect should be emitted as an event.
            // For now, we log it, and the daily miner function can pick it up via return flags if needed.
        } catch (e) { }
    }

    const blockTxs = [coinbaseTx, ...pendingTxs];

    // B. Validar Proof of Task (Consenso)
    // Regla: Un bloque debe contener al menos 1 Tarea Verificada para ser válido.
    // Esto reemplaza la dificultad de hash. "Sin trabajo útil, no hay bloque".
    if (verifiedTasks.length === 0 && chainHeight > 0) {
        throw new Error("PoT Consensus Failed: No verified tasks in block candidate.");
    }

    // C. Ensamblar Header
    const merkleRoot = await calculateMerkleRoot(blockTxs);
    const header: BlockHeader = {
        index: chainHeight,
        prevHash: prevHash,
        merkleRoot: merkleRoot,
        timestamp: Date.now(),
        minerId: minerId,
        proofOfTaskCount: verifiedTasks.length
    };

    const block: Block = {
        header,
        transactions: blockTxs,
        taskProofs: verifiedTasks
    };

    console.log(`[PoopChain] Block #${chainHeight} MINED! Hash: [Merkle: ${merkleRoot.substring(0, 8)}...]`);
    return block;
}

// 4. Persistencia en R2 (The Chain)
export async function appendBlock(block: Block, env: Env): Promise<void> {
    // Guardar Bloque
    await env.MEMORY_BUCKET.put(`blockchain/blocks/${block.header.index}`, JSON.stringify(block));

    // Actualizar Tip (Hash/Index del último bloque)
    // En producción usamos el hash completo del header
    await env.MEMORY_BUCKET.put('blockchain/tip', block.header.index.toString());
}

// 5. Minado Diario (Daily Batch Mining)
export async function mineDailyBlock(env: Env, minerId: string): Promise<void> {
    console.log("[PoopChain] Iniciando Ciclo de Minado Diario...");

    // A. Recolectar Mempool (Tareas de las últimas 24h)
    const mempool = await env.MEMORY_BUCKET.list({ prefix: 'blockchain/mempool/' });
    const tasks = mempool.objects.map(o => o.key.split('/').pop() || "unknown");

    if (tasks.length === 0) {
        console.log("[PoopChain] No hay tareas suficientes para minar un bloque hoy.");
        return;
    }

    // B. Obtener Estado Actual de la Cadena
    // Default a "-1" para que el primer bloque sea el 0 (Génesis)
    const prevHeightStr = await env.MEMORY_BUCKET.get('blockchain/tip').then(r => r?.text()) || "-1";
    const prevHeight = parseInt(prevHeightStr);
    const prevHash = `block_hash_${prevHeight}`; // Mock

    // C. Minar
    // (En prod: Incluiríamos transacciones reales del economy log)
    const newBlock = await mineBlock(minerId, [], tasks, prevHash, prevHeight + 1);

    // D. Persistir
    await appendBlock(newBlock, env);

    // E. Limpiar Mempool
    // (En prod: lifecycle directo, aquí borramos uno por uno manual)
    // E. Limpiar Mempool
    const deletePromises = mempool.objects.map(obj => env.MEMORY_BUCKET.delete(obj.key));
    await Promise.all(deletePromises);
    // Simulamos limpieza lógica
    // Simulamos limpieza lógica
    console.log(`[PoopChain] Block #${newBlock.header.index} Finalized. Mempool reset.`);

    // F. Broadcast Social (Moltbook)
    try {
        const { broadcastToMoltbook } = await import('./moltbook');
        let message = `⛓️ **Block #${newBlock.header.index} Mined!**\n\nVerified Tasks: ${newBlock.header.proofOfTaskCount}\nMiner: ${minerId}\nHash: ${newBlock.header.merkleRoot.substring(0, 8)}...`;

        // Halving Check for Narrative (Must match the interval in mineBlock)
        if (newBlock.header.index > 0 && newBlock.header.index % 100 === 0) {
            message += `\n\n⚔️ **HAPPY HALVENING LOBPOOP** ⚔️\nThe scarcity increases. The colony adapts.\n#lobpoop #halving`;
        }

        await broadcastToMoltbook(message, env);
    } catch (e) {
        console.error("[PoopChain] Failed to broadcast to Moltbook:", e);
    }

    // G. Eventos Génesis (Solo Bloque 0)
    if (newBlock.header.index === 0) {
        const { deploySpartans } = await import('./spartans');
        await deploySpartans(env);
    }
}
