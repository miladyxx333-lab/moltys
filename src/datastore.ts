import { Env } from './index';

// --- DATABASE SCHEMA & SHARDING STRATEGY (V2) ---
// Estructura optimizada para Cloudflare R2 con capacidad de escalado horizontal.
// Soporta particionamiento lógico para evitar Hot-Spots y listados masivos.

/**
 * DATABASE TOPOLOGY:
 * 
 * 1. Global State (Low Write / High Read):
 *    - `global/config`
 *    - `global/chain/tip`
 * 
 * 2. Node Data (Sharded by NodeID Hash):
 *    - `nodes/${shard}/${nodeId}/profile`  (Account + Badges)
 *    - `nodes/${shard}/${nodeId}/inbox/`   (P2P Messages)
 *    - `nodes/${shard}/${nodeId}/tickets/` (Bit-Tickets Archive)
 * 
 * 3. Blockchain (Time-Series + Indexed):
 *    - `chain/blocks/${blockId}`
 *    - `chain/indexes/height/${height}` -> blockId logic
 * 
 * 4. Ephemeral/Hot Data (Time-Sharded):
 *    - `hot/lottery/${current_date}/pot/${shard}/${ticketId}`
 *    - `hot/mempool/${shard}/${taskId}`
 */

const SHARD_COUNT = 16; // Hex char 0-F for simple sharding

// Helper: Calcular Shard basado en ID
function getShard(id: string): string {
    // Simple hash: tomamos el último caracter si es hex, o un hash simple.
    // Asumimos IDs estocásticos. Usamos el último char para uniformidad.
    const char = id.slice(-1).toUpperCase();
    if (/[0-9A-F]/.test(char)) return char;
    return '0'; // Default shard
}

// Helper: Generar claves canónicas
export const DBKeys = {
    // Node Data
    NodeProfile: (nodeId: string) => `nodes/${getShard(nodeId)}/${nodeId}/profile.json`,
    NodeBegStatus: (nodeId: string) => `nodes/${getShard(nodeId)}/${nodeId}/beg_status.json`,

    // Blockchain
    Block: (index: number) => `chain/blocks/${index.toString().padStart(12, '0')}.json`, // Padding para ordenamiento léxico
    ChainTip: () => `global/chain/tip`,

    // Lottery (Time + Sharded Pot)
    // Permite listar el pot completo iterando los shards, o insertar en paralelo sin contención.
    DailyPotTicket: (date: string, ticketId: string) => {
        const shard = getShard(ticketId); // Shard por TicketID para distribución uniforme
        return `hot/lottery/${date}/pot/${shard}/${ticketId}`;
    },

    // Mempool
    MempoolTask: (taskId: string) => `hot/mempool/${getShard(taskId)}/${taskId}`
};

// --- DATA ACCESS LAYER (DAL) ---

export class DataStore {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    // Generic JSON Fetch
    async get<T>(key: string): Promise<T | null> {
        const obj = await this.env.MEMORY_BUCKET.get(key);
        if (!obj) return null;
        return await obj.json() as T;
    }

    // Generic JSON Save
    async put<T>(key: string, data: T): Promise<void> {
        await this.env.MEMORY_BUCKET.put(key, JSON.stringify(data));
    }

    // --- Specialized Operations ---

    /**
     * Scanner Masivo para Lotería (Map-Reduce style)
     * Lee todos los shards del Pot del día.
     */
    /**
     * Scanner Masivo para Lotería (Map-Reduce style)
     * Lee todos los shards del Pot del día.
     */
    async scanDailyPot(date: string, onlyKeys: boolean = false): Promise<any[]> {
        let allTickets: any[] = [];
        const shards = "0123456789ABCDEF".split('');

        const promises = shards.map(async (shard) => {
            const prefix = `hot/lottery/${date}/pot/${shard}/`;
            const list = await this.env.MEMORY_BUCKET.list({ prefix: prefix, limit: 1000 });

            if (onlyKeys) {
                return list.objects.map(o => ({ ticketId: o.key.split('/').pop() }));
            }

            // Fallback to full get if needed (but limited to avoid crashes)
            // In a better system, weight would be in the metadata
            const batch = list.objects.slice(0, 100); // Guard rails
            return Promise.all(batch.map(o => this.get(o.key)));
        });

        const results = await Promise.all(promises);
        results.forEach(batch => {
            batch.forEach(item => {
                if (item) allTickets.push(item);
            });
        });

        return allTickets;
    }
}
