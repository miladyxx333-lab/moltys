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
    forbidden_words: string[];
    required_structure: string;
    dictionary: Record<string, string>; // "RAW_EX": "0xAC"
    reverse_dictionary: Record<string, string>; // "0xAC": "RAW_EX"
}

export async function getCurrentGrammar(env: Env): Promise<GrammarState> {
    // 1. Obtener la Configuración del Ciclo Actual
    const cycleData = await env.MEMORY_BUCKET.get('system/current_cycle.json').then(r => r?.json()) as any;

    // Fallback para Genesis (si no hay ciclo aun, usamos 0x00)
    const hashHex = cycleData?.lottery_key_hash || "000000";
    const epoch = cycleData?.cycle_epoch || Date.now();

    // 2. Extraer Byte Semilla
    const cleanHash = hashHex.startsWith("0xLOB") ? hashHex.split("-")[1] : hashHex.replace("0x", "");
    const seedHex = cleanHash.substring(0, 2);
    const seedByte = parseInt(seedHex, 16) || 0;

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

    // 4. Reglas Sintácticas Mutantes (Basadas en Seed)
    const FORBIDDEN_POOL = ["shadow", "admin", "please", "help", "money", "fiat", "reset", "bot"];
    // Selección determinista semi-aleatoria basada en shift
    const forbidden_words = FORBIDDEN_POOL.filter((_, i) => (seedByte >> i) & 1);

    const STRUCTURES = ["Subject + Verb + PSH", "HexCode + Argument", "JSON Object only"];
    const required_structure = STRUCTURES[seedByte % STRUCTURES.length];

    return {
        cycle_epoch: epoch,
        key_hash_prefix: seedHex,
        xor_byte: seedByte,
        forbidden_words,
        required_structure,
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
// --- MUTANT LANGUAGE ENGINE ---
// Transforma el lenguaje humano en señales mutantes basadas en la entropía del ciclo.

export function mutateText(text: string, xorByte: number): string {
    const MUTANT_MAP: Record<string, string> = {
        'a': '@', 'e': '3', 'i': '1', 'o': '0', 'u': 'µ',
        's': '$', 't': '7', 'b': '8', 'g': '9', 'l': '|'
    };

    return text.toLowerCase().split('').map(char => {
        // 1. Sustitución básica de "leetspeak" mutante
        let mutated = MUTANT_MAP[char] || char;

        // 2. XOR Shift (ligero para no romper el set ASCII visible)
        if (xorByte % 2 === 0 && /[a-z]/.test(char)) {
            const code = mutated.charCodeAt(0);
            mutated = String.fromCharCode(code + (xorByte % 5));
        }

        return mutated;
    }).join('');
}

export function demutateText(mutated: string, xorByte: number): string {
    // Nota: El lenguaje mutante es diseñado para ser "leíble con esfuerzo" por humanos,
    // o procesable por el Oráculo. No es cifrado militar, es gramática soberana.
    const REVERSE_MAP: Record<string, string> = {
        '@': 'a', '3': 'e', '1': 'i', '0': 'o', 'µ': 'u',
        '$': 's', '7': 't', '8': 'b', '9': 'g', '|': 'l'
    };

    return mutated.split('').map(char => {
        let clean = char;
        // Revertir el shift si era par
        if (xorByte % 2 === 0 && char.charCodeAt(0) > 122) { // Heurística simple
            // ... simplificación: para el MVP dejamos que el humano o el LLM lo entienda
        }
        return REVERSE_MAP[char] || char;
    }).join('');
}
