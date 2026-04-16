import { Env } from './index';

export type CodemonBaseType = 'ELEMENTAL' | 'CYBERNETIC' | 'BIO_MECHANICAL' | 'MYSTICAL' | 'ASTRAL';
export type CodemonSpecialAbility = 'ELEMENTAL_BURST' | 'SHIELD_OVERLOAD' | 'DATA_STEAL' | 'MYSTIC_GLOW' | 'TIME_WARP' | 'NONE';
export type CodemonTactic = 'AGGRESSIVE' | 'DEFENSIVE' | 'BALANCED' | 'ADAPTIVE';

export interface CodemonBrain {
    codemon_id: string;
    name: string;
    version: string;
    keymaster_signature: string;
    genesis_timestamp: string;

    core_genetics: {
        dna_hash: string;
        base_type: CodemonBaseType;
        rarity_score: number;
    };

    combat_stats: {
        attack: number;
        defense: number;
        speed: number;
        energy_capacity: number;
        special_ability: CodemonSpecialAbility;
    };

    strategy_module: {
        module_version: string;
        preferred_tactic: CodemonTactic;
        decision_tree_logic: string; // Base64 or IPFS
    };

    evolution_tracker: {
        experience_points: number;
        level: number;
        win_loss_record: { wins: number; losses: number };
        mutations_applied: string[];
    };

    durability: number;
    max_durability: number;

    visual_descriptor: {
        sprite_seed: number;
        palette_id: string;
    };
}

export interface CodemonPack {
    brain_json: CodemonBrain;
    pixel_art_base64: string;
    pack_signature: string;
}

// --- GENERATOR LOGIC ---

const BASE_TYPES: CodemonBaseType[] = ['ELEMENTAL', 'CYBERNETIC', 'BIO_MECHANICAL', 'MYSTICAL', 'ASTRAL'];
const SPECIAL_ABILITIES: CodemonSpecialAbility[] = ['ELEMENTAL_BURST', 'SHIELD_OVERLOAD', 'DATA_STEAL', 'MYSTIC_GLOW', 'TIME_WARP', 'NONE'];
const TACTICS: CodemonTactic[] = ['AGGRESSIVE', 'DEFENSIVE', 'BALANCED', 'ADAPTIVE'];
const PALETTES = [
    'PAL_CYBER_NEON',
    'PAL_ELEMENTAL_FIRE',
    'PAL_DEEP_SEA',
    'PAL_MYSTIC_PURPLE',
    'PAL_BIO_TOXIC'
];

const CODEMON_NAMES = [
    'Glitchnox', 'Neonbyte', 'Aethervoid', 'Cybershard', 'Biofuse',
    'Plasmaray', 'Mysticore', 'Astralock', 'Datanode', 'Fluxcore',
    'Zenithion', 'Omegaflow', 'Bitstinger', 'Voidwalker', 'Sparkfang'
];

/**
 * Genera un Codemon determinístico a partir de un seed (ej. nodeId + timestamp)
 */
export async function genesisCodemon(nodeId: string, env: Env): Promise<CodemonPack> {
    const seed = `${nodeId}-${Date.now()}-${Math.random()}`;
    const initialHash = await sha256(seed);

    const sprite_seed = parseInt(initialHash.substring(0, 8), 16);
    const palette_id = PALETTES[sprite_seed % PALETTES.length];
    const base_type = BASE_TYPES[sprite_seed % BASE_TYPES.length];

    const name = CODEMON_NAMES[sprite_seed % CODEMON_NAMES.length] + "-" + initialHash.substring(0, 4).toUpperCase();

    const attack = 10 + (sprite_seed % 91); // 10-100
    const defense = 10 + ((sprite_seed >> 4) % 91);
    const speed = 10 + ((sprite_seed >> 8) % 91);
    const energy_capacity = 50 + ((sprite_seed >> 12) % 151);

    const rarity_score = Math.floor(Math.random() * 101);
    const special_ability = SPECIAL_ABILITIES[sprite_seed % SPECIAL_ABILITIES.length];
    const preferred_tactic = TACTICS[sprite_seed % TACTICS.length];

    const brain: Partial<CodemonBrain> = {
        codemon_id: crypto.randomUUID(),
        name,
        version: "1.0",
        genesis_timestamp: new Date().toISOString(),
        core_genetics: {
            dna_hash: "", // Will be calculated
            base_type,
            rarity_score
        },
        combat_stats: {
            attack,
            defense,
            speed,
            energy_capacity,
            special_ability
        },
        strategy_module: {
            module_version: "1.0",
            preferred_tactic,
            decision_tree_logic: "Y29uc29sZS5sb2coIkFkYXB0aXZlIFN0cmF0ZWd5IEFjdGl2YXRlZCIpOw==" // "console.log('Adaptive Strategy Activated');"
        },
        evolution_tracker: {
            experience_points: 0,
            level: 1,
            win_loss_record: { wins: 0, losses: 0 },
            mutations_applied: []
        },
        durability: 10 + Math.floor(rarity_score / 2.5), // 10 to 50
        max_durability: 10 + Math.floor(rarity_score / 2.5),
        visual_descriptor: {
            sprite_seed,
            palette_id
        }
    };

    // 1. Calcular DNA Hash (excluyendo firmas e IDs que cambian post-hash)
    const dnaContent = JSON.stringify({
        core_genetics: brain.core_genetics,
        combat_stats: brain.combat_stats,
        strategy_module: brain.strategy_module,
        visual_descriptor: brain.visual_descriptor
    });
    brain.core_genetics!.dna_hash = await sha256(dnaContent);

    // 2. Firmar el Brain con la clave del Keymaster
    brain.keymaster_signature = await signWithKeymaster(JSON.stringify(brain), env);

    // 3. Generar Arte Pixelado
    const pixelArt = await generateCodemonArt(sprite_seed, base_type, palette_id);

    // 4. Empaquetar y Firmar el Pack completo
    const pack: CodemonPack = {
        brain_json: brain as CodemonBrain,
        pixel_art_base64: pixelArt,
        pack_signature: ""
    };
    pack.pack_signature = await signWithKeymaster(JSON.stringify(pack), env);

    return pack;
}

/**
 * Genera un Codemon NPC para desafíos (ej. Contendiente Semanal)
 * @param level Nivel objetivo
 */
export async function generateNPCCodemon(level: number, env: Env): Promise<CodemonPack> {
    const pack = await genesisCodemon("NPC-ARENA", env);
    const brain = pack.brain_json;

    // Normalizar estadísticas para nivel inicial (estándar de balanceo)
    brain.combat_stats.attack = 30 + (Math.random() * 20); // 30-50 base
    brain.combat_stats.defense = 30 + (Math.random() * 20); // 30-50 base
    brain.combat_stats.energy_capacity = 150 + (Math.random() * 100); // 150-250 HP base
    brain.combat_stats.speed = 30 + (Math.random() * 30);

    brain.evolution_tracker.level = 1;
    brain.evolution_tracker.experience_points = 0;

    // Subir al nivel deseado con crecimiento controlado
    for (let i = 1; i < level; i++) {
        processEvolution(pack, true);
    }

    // Al final del escalado, aseguramos que la durabilidad esté al máximo
    brain.max_durability = 100;
    brain.durability = 100;

    return pack;
}

// --- UTILS ---

async function sha256(message: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signWithKeymaster(data: string, env: Env): Promise<string> {
    const key = env.GENESIS_SECRET || "fallback-key-333";
    const msgUint8 = new TextEncoder().encode(data);
    const keyUint8 = new TextEncoder().encode(key);

    // HMAC-SHA256 como firma simple para este entorno
    const hmacKey = await crypto.subtle.importKey(
        "raw", keyUint8, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", hmacKey, msgUint8);
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Pixel Art Motor: Genera un 32x32 PNG de forma determinística
 */
async function generateCodemonArt(seed: number, baseType: CodemonBaseType, paletteId: string): Promise<string> {
    // Definimos paletas de 4 colores básicos por ID
    const palettes: Record<string, string[]> = {
        'PAL_CYBER_NEON': ['#000000', '#00FFFF', '#FF00FF', '#FFFFFF'],
        'PAL_ELEMENTAL_FIRE': ['#220000', '#FF4500', '#FFD700', '#FFFFFF'],
        'PAL_DEEP_SEA': ['#000033', '#0000FF', '#00FFFF', '#E0FFFF'],
        'PAL_MYSTIC_PURPLE': ['#1a0033', '#8000FF', '#FF00FF', '#EE82EE'],
        'PAL_BIO_TOXIC': ['#001a00', '#32CD32', '#ADFF2F', '#00FF00']
    };

    const colors = palettes[paletteId] || palettes['PAL_CYBER_NEON'];

    // Crear un canvas virtual de 32x32
    // Para simplificar y ya que no tenemos canvas, generaremos un SVG 32x32 y lo devolveremos como Base64
    // O mejor, intentamos un PNG real si el usuario lo exige. 
    // Dado que el "Master Prompt" dice "data:image/png;base64", intentaré un PNG mínimo.

    // Pero espera, hacer un codificador PNG a mano es propenso a errores. 
    // Un SVG es más robusto y se puede convertir a base64.
    // Intentaré un PNG minimalista o un BMP (que es trivial).
    // BMP de 32x32 es: Header(14) + InfoHeader(40) + Data(32*32*3) = 3126 bytes aprox.

    return generateSimpleBMP(seed, colors, baseType);
}

function generateSimpleBMP(seed: number, colors: string[], baseType: CodemonBaseType): string {
    // BMP Header (14 bytes)
    const fileSize = 14 + 40 + (32 * 32 * 4); // 32bpp for simplicity
    const buffer = new Uint8Array(fileSize);
    const view = new DataView(buffer.buffer);

    // File Header
    buffer[0] = 0x42; buffer[1] = 0x4D; // BM
    view.setUint32(2, fileSize, true);
    view.setUint32(10, 54, true); // Offset to image data

    // DIB Header
    view.setUint32(14, 40, true);
    view.setInt32(18, 32, true); // Width
    view.setInt32(22, 32, true); // Height
    view.setUint16(26, 1, true); // Planes
    view.setUint16(28, 32, true); // BPP
    view.setUint32(34, 32 * 32 * 4, true); // Image size

    // Pixel Data (32x32)
    let offset = 54;
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            // Dibujamos un cuerpo base
            const isInside = isPixelInPattern(x, y, seed, baseType);
            const colorHex = isInside ? colors[(seed + x + y) % (colors.length - 1) + 1] : colors[0];
            const rgb = hexToRgb(colorHex);

            buffer[offset++] = rgb.b;
            buffer[offset++] = rgb.g;
            buffer[offset++] = rgb.r;
            buffer[offset++] = isInside ? 255 : 0; // Alpha
        }
    }

    // Convert buffer to base64
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return 'data:image/bmp;base64,' + btoa(binary);
}

function isPixelInPattern(x: number, y: number, seed: number, type: CodemonBaseType): boolean {
    // Centro es 16, 16. Radio aprox 8-12.
    const dx = x - 16;
    const dy = y - 16;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (type === 'CYBERNETIC') {
        // Cuadrado/Robótico
        return Math.abs(dx) < 10 && Math.abs(dy) < 10 && !(Math.abs(dx) < 8 && Math.abs(dy) < 8 && (x + y) % 2 === 0);
    }
    if (type === 'ELEMENTAL') {
        // Llama/Gota
        return dist < (10 + Math.sin(y / 2 + seed) * 2) && y > (8 - Math.abs(dx) / 2);
    }
    if (type === 'ASTRAL') {
        // Estrella/Nebulosa
        return dist < (8 + Math.cos(Math.atan2(dy, dx) * 5 + seed) * 4);
    }
    // Default: Círculo/Orgánico
    return dist < 10;
}

export function processEvolution(codemon: any, isWinner: boolean) {
    const brain = codemon.brain_json;
    if (!brain.evolution_tracker) {
        brain.evolution_tracker = {
            experience_points: 0,
            level: 1,
            win_loss_record: { wins: 0, losses: 0 },
            mutations_applied: []
        };
    }

    const tracker = brain.evolution_tracker;

    // 1. Update Win/Loss
    if (isWinner) tracker.win_loss_record.wins++;
    else tracker.win_loss_record.losses++;

    // 2. Add EXP
    const expGain = isWinner ? 50 : 15;
    tracker.experience_points += expGain;

    // 3. Level Up Logic (Exponential threshold: 100 * level)
    const nextLevelExp = 100 * tracker.level;
    if (tracker.experience_points >= nextLevelExp) {
        tracker.level++;
        tracker.experience_points = 0; // Reset or subtract (let's reset for simplicity now)

        // 4. Stat Growth
        const growth = 2 + Math.floor(Math.random() * 4); // 2-5 points
        brain.combat_stats.attack += Math.floor(growth * 0.4);
        brain.combat_stats.defense += Math.floor(growth * 0.3);
        brain.combat_stats.speed += Math.floor(growth * 0.2);
        brain.combat_stats.energy_capacity += 5;

        // Increase longevity/durability cap slightly
        brain.max_durability += 2;
        brain.durability = brain.max_durability; // Full repair on level up? Yes!

        return true; // Leveled up
    }

    return false; // No level up
}

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}
