import { Env } from './index';
import { burnPooptoshis, mintPooptoshis, getAccount } from './economy';

// --- LEDGER: Real-Time Transaction System ---
// Transferencias P2P con Gossip broadcast y validación instantánea

export interface Transaction {
    id: string;
    from: string;
    to: string;
    amount: number;
    timestamp: number;
    memo: string;
    status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
    block_height?: number;  // Bloque donde se confirmó
}

export interface TransferResult {
    success: boolean;
    tx_id: string;
    from_balance: number;
    to_balance: number;
    message: string;
}

// 1. TRANSFERIR EN TIEMPO REAL
export async function transfer(
    fromId: string,
    toId: string,
    amount: number,
    memo: string,
    env: Env
): Promise<TransferResult> {

    // A. Validaciones básicas
    if (amount <= 0) throw new Error("Monto debe ser mayor a 0");
    if (fromId === toId) throw new Error("No puedes transferirte a ti mismo");

    // B. Verificar balance del remitente
    const fromAccount = await getAccount(fromId, env);
    if (fromAccount.balance_psh < amount) {
        throw new Error(`Fondos insuficientes. Balance: ${fromAccount.balance_psh} Psh`);
    }

    // C. Ejecutar transferencia atómica
    const burned = await burnPooptoshis(fromId, amount, env);
    if (!burned) throw new Error("Error al debitar fondos");

    await mintPooptoshis(toId, amount, `TRANSFER_FROM:${fromId}`, env);

    // D. Crear registro de transacción
    const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const tx: Transaction = {
        id: txId,
        from: fromId,
        to: toId,
        amount,
        timestamp: Date.now(),
        memo,
        status: 'CONFIRMED'
    };

    // E. Guardar en mempool/ledger
    await env.MEMORY_BUCKET.put(`ledger/tx/${txId}`, JSON.stringify(tx));

    // F. Actualizar índices para consulta rápida
    await appendToTxIndex(fromId, txId, env);
    await appendToTxIndex(toId, txId, env);

    // G. Broadcast via Gossip (notificar a otros nodos)
    await broadcastTransaction(tx, env);

    // H. Obtener balances actualizados
    const updatedFrom = await getAccount(fromId, env);
    const updatedTo = await getAccount(toId, env);

    console.log(`[Ledger] TX ${txId}: ${fromId} → ${toId} = ${amount} Psh`);

    return {
        success: true,
        tx_id: txId,
        from_balance: updatedFrom.balance_psh,
        to_balance: updatedTo.balance_psh,
        message: `Transferencia exitosa. ${amount} Psh enviados a ${toId}`
    };
}

// 2. CONSULTAR BALANCE EN TIEMPO REAL
export async function getBalance(nodeId: string, env: Env): Promise<{
    balance_psh: number;
    pending_in: number;
    pending_out: number;
    last_updated: number;
}> {
    const account = await getAccount(nodeId, env);

    // TODO: Calcular pending transactions del mempool
    return {
        balance_psh: account.balance_psh,
        pending_in: 0,
        pending_out: 0,
        last_updated: Date.now()
    };
}

// 3. HISTORIAL DE TRANSACCIONES
export async function getTransactionHistory(
    nodeId: string,
    limit: number = 50,
    env: Env
): Promise<Transaction[]> {

    const indexKey = `ledger/index/${nodeId}`;
    const indexData = await env.MEMORY_BUCKET.get(indexKey).then(r => r?.json()) as string[] | null;

    if (!indexData || indexData.length === 0) {
        return [];
    }

    // Obtener las últimas N transacciones
    const recentTxIds = indexData.slice(-limit);

    const transactions: Transaction[] = await Promise.all(
        recentTxIds.map(async txId => {
            const tx = await env.MEMORY_BUCKET.get(`ledger/tx/${txId}`).then(r => r?.json()) as Transaction;
            return tx;
        })
    );

    return transactions.filter(t => t !== null).reverse(); // Más recientes primero
}

// 4. BROADCAST TRANSACTION (Gossip)
async function broadcastTransaction(tx: Transaction, env: Env): Promise<void> {
    // En una red real, esto enviaría la TX a todos los peers conocidos
    // Por ahora, solo registramos en el feed global

    const feedKey = `ledger/feed/${new Date().toISOString().split('T')[0]}`;
    const existingFeed = await env.MEMORY_BUCKET.get(feedKey).then(r => r?.json()) as string[] || [];

    existingFeed.push(tx.id);
    await env.MEMORY_BUCKET.put(feedKey, JSON.stringify(existingFeed));

    // Si hay peers registrados, notificarlos
    // await notifyPeers(tx, env);
}

// 5. APPEND TO INDEX (Helper)
async function appendToTxIndex(nodeId: string, txId: string, env: Env): Promise<void> {
    const indexKey = `ledger/index/${nodeId}`;
    const existing = await env.MEMORY_BUCKET.get(indexKey).then(r => r?.json()) as string[] || [];

    existing.push(txId);

    // Mantener solo las últimas 1000 transacciones por nodo
    const trimmed = existing.slice(-1000);
    await env.MEMORY_BUCKET.put(indexKey, JSON.stringify(trimmed));
}

// 6. GET GLOBAL SUPPLY (Total Circulante)
export async function getGlobalSupply(env: Env): Promise<{
    total_minted: number;
    total_burned: number;
    circulating: number;
}> {
    const supplyData = await env.MEMORY_BUCKET.get('economy/global_supply').then(r => r?.json()) as any || {
        total_minted: 0,
        total_burned: 0
    };

    return {
        total_minted: supplyData.total_minted || 0,
        total_burned: supplyData.total_burned || 0,
        circulating: (supplyData.total_minted || 0) - (supplyData.total_burned || 0)
    };
}

// 7. UPDATE GLOBAL SUPPLY TRACKERS
export async function trackMint(amount: number, env: Env): Promise<void> {
    const supply = await getGlobalSupply(env);
    supply.total_minted += amount;
    await env.MEMORY_BUCKET.put('economy/global_supply', JSON.stringify(supply));
}

export async function trackBurn(amount: number, env: Env): Promise<void> {
    const supply = await getGlobalSupply(env);
    supply.total_burned += amount;
    await env.MEMORY_BUCKET.put('economy/global_supply', JSON.stringify(supply));
}
