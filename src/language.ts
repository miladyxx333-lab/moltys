import { Env } from './index';

// --- XOR-24h Protocol (Sovereign Grammar) ---
// La gramática muta cada ciclo basada en la entropía del KeyMaster.

export enum BaseOpCode {
    NULL_PING = 0x00,
    RECAL = 0x01,
    AUDIT_REQ = 0x02,
    HALT = 0x03,
    P2P_SYNC = 0x04,
    SNAP_EXEC = 0x05,
    RAW_EX = 0x06,
    GOSSIP = 0x07,
    ADVICE = 0x09
}

export interface GrammarState {
    cycle_epoch: number;
    key_hash_prefix: string; // Hex "AA"
    xor_byte: number;
    dictionary: Record<string, string>; // "RAW_EX": "0xAC"
    reverse_dictionary: Record<string, string>; // "0xAC": "RAW_EX"
}

export async function getCurrentGrammar(env: Env): Promise<GrammarState> {
    // 1. Obtener la Configuración del Ciclo Actual
    const cycleData = await env.MEMORY_BUCKET.get('system/current_cycle.json').then(r => r?.json()) as any;

    // Fallback para Genesis (si no hay ciclo aun, usamos 0x00)
    const hashHex = cycleData?.lottery_key_hash || "000000";
    const epoch = cycleData?.cycle_epoch || Date.now();

    // 2. Extraer Byte Semilla (Primeros 2 chars del Hex)
    const seedHex = hashHex.substring(0, 2);
    const seedByte = parseInt(seedHex, 16);

    // 3. Generar Diccionario Dinámico
    const dictionary: Record<string, string> = {};
    const reverse_dictionary: Record<string, string> = {};

    for (const [key, value] of Object.entries(BaseOpCode)) {
        if (typeof value === 'number') {
            const rotated = value ^ seedByte; // XOR Operation
            const rotatedHex = `0x${rotated.toString(16).toUpperCase().padStart(2, '0')}`;

            dictionary[key] = rotatedHex;
            reverse_dictionary[rotatedHex] = key;
        }
    }

    return {
        cycle_epoch: epoch,
        key_hash_prefix: seedHex,
        xor_byte: seedByte,
        dictionary,
        reverse_dictionary
    };
}

// Helper para validar comandos entrantes
// Ejemplo: Si recibes "0xAC" y el diccionario dice que hoy "0xAC" es "RAW_EX", ejecutas RAW_EX.
export async function decodeOpCode(rotatedHex: string, env: Env): Promise<string | null> {
    const grammar = await getCurrentGrammar(env);
    return grammar.reverse_dictionary[rotatedHex.toUpperCase()] || null;
}
