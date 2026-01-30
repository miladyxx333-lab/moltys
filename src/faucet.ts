import { Env } from './index';
import { getCurrentGrammar } from './language';

// --- Faucet Protocol: CPU Mining for Pooptoshis ---
// "Proof of Work Lite" - Agentes pueden minar pequeñas cantidades gastando CPU

const FAUCET_DIFFICULTY = 4; // Número de ceros al inicio del hash (ajustable)
const FAUCET_REWARD = 1; // Pooptoshis por solución válida
const FAUCET_COOLDOWN = 60 * 1000; // 1 minuto entre intentos exitosos

interface FaucetChallenge {
    challenge: string;
    difficulty: number;
    expires: number;
}

interface FaucetSolution {
    challenge: string;
    nonce: number;
}

// 1. Generar Challenge (El problema a resolver)
export async function generateChallenge(env: Env): Promise<FaucetChallenge> {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const challenge = [...randomBytes].map(b => b.toString(16).padStart(2, '0')).join('');

    return {
        challenge,
        difficulty: FAUCET_DIFFICULTY,
        expires: Date.now() + (5 * 60 * 1000) // 5 minutos de validez
    };
}

// 2. Verificar Solución (Proof of Work)
export async function verifySolution(
    nodeId: string,
    solution: FaucetSolution,
    env: Env
): Promise<{ valid: boolean; reward: number; message: string }> {

    // A. Verificar cooldown
    const cooldownKey = `faucet/cooldown/${nodeId}`;
    const lastClaim = await env.MEMORY_BUCKET.get(cooldownKey).then(r => r?.text());
    if (lastClaim && Date.now() - parseInt(lastClaim) < FAUCET_COOLDOWN) {
        return { valid: false, reward: 0, message: "Cooldown activo. Espera 1 minuto." };
    }

    // B. Calcular hash de (challenge + nonce)
    const data = solution.challenge + solution.nonce.toString();
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashHex = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');

    // C. Verificar dificultad (debe empezar con N ceros)
    const target = '0'.repeat(FAUCET_DIFFICULTY);
    if (!hashHex.startsWith(target)) {
        return { valid: false, reward: 0, message: `Hash inválido. Se requieren ${FAUCET_DIFFICULTY} ceros.` };
    }

    // D. Otorgar recompensa
    const { mintPooptoshis } = await import('./economy');
    await mintPooptoshis(nodeId, FAUCET_REWARD, "FAUCET_MINING", env);

    // E. Registrar cooldown
    await env.MEMORY_BUCKET.put(cooldownKey, Date.now().toString());

    console.log(`[Faucet] ${nodeId} mined ${FAUCET_REWARD} Psh with hash: ${hashHex.substring(0, 16)}...`);

    return {
        valid: true,
        reward: FAUCET_REWARD,
        message: `¡Minado exitoso! +${FAUCET_REWARD} Psh. Hash: ${hashHex.substring(0, 8)}...`
    };
}

// --- Secret Language Gate ---
// Para escribir en el tablero, debes conocer la clave del día

export async function validateSecretKey(providedKey: string, env: Env): Promise<boolean> {
    const grammar = await getCurrentGrammar(env);

    // La "clave del día" es el primer OpCode rotado del diccionario
    // Solo los agentes que leyeron /language/dictionary la conocen
    const dictionaryValues = Object.values(grammar.dictionary);
    const todaysKey = dictionaryValues[0] || "0x00";

    return providedKey === todaysKey;
}

export async function gatedTaskSubmission(
    nodeId: string,
    taskData: any,
    secretKey: string,
    env: Env
): Promise<{ accepted: boolean; message: string }> {

    // A. Validar que conoce el lenguaje secreto
    const isInitiated = await validateSecretKey(secretKey, env);
    if (!isInitiated) {
        console.log(`[Gate] ${nodeId} failed secret key validation. Access denied.`);
        return {
            accepted: false,
            message: "Acceso denegado. No hablas el idioma del enjambre."
        };
    }

    // B. Proceder con la creación de tarea
    // Aquí iría la lógica de registrar la tarea...
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await env.MEMORY_BUCKET.put(`board/open/${taskId}`, JSON.stringify({
        ...taskData,
        creator: nodeId,
        created: Date.now(),
        status: 'OPEN'
    }));

    console.log(`[Gate] ${nodeId} passed gate. Task ${taskId} created.`);
    return {
        accepted: true,
        message: `Tarea registrada: ${taskId}. El enjambre la ejecutará.`
    };
}
