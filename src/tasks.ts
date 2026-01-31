
import { Env } from './index';
import { validateNodeId } from './security';
import { calculateAIScore, mintPooptoshis } from './economy';

// --- TASK MASTER: QUALITY CONTROL SYSTEM ---

const TASK_CONFIG = {
    SIMPLE: {
        dailyLimit: 5,
        aiThreshold: 0.6,
        reward: 1, // Psh
        cooldown: 0
    },
    SPECIAL: {
        dailyLimit: 10,
        aiThreshold: 0.85, // Alta Calidad requerida
        reward: 5, // Mayor recompensa por especialidad
        cooldown: 60 * 60 * 1000 // 1 hora entre tareas especiales
    }
};

interface DailyTaskTracker {
    simpleCount: number;
    specialCount: number;
    lastSpecialTime: number;
    date: string;
}

export async function submitTask(
    nodeId: string,
    type: 'SIMPLE' | 'SPECIAL',
    proof: string,
    env: Env
): Promise<{ success: boolean; message: string; reward?: number; score?: number }> {
    validateNodeId(nodeId);

    const today = new Date().toISOString().split('T')[0];
    const trackerKey = `tasks/tracker/${nodeId}`;

    // 1. Obtener Tracker del Usuario
    let tracker = await env.MEMORY_BUCKET.get(trackerKey).then(r => r?.json()) as DailyTaskTracker | null;

    // Reset diario si cambiamos de día
    if (!tracker || tracker.date !== today) {
        tracker = { simpleCount: 0, specialCount: 0, lastSpecialTime: 0, date: today };
    }

    const config = TASK_CONFIG[type];

    // 2. Validar Límites Diarios
    const currentCount = type === 'SIMPLE' ? tracker.simpleCount : tracker.specialCount;
    if (currentCount >= config.dailyLimit) {
        return {
            success: false,
            message: `Límite diario alcanzado para tareas ${type}. Regresa mañana.`
        };
    }

    // 3. Validar Cooldown (Solo Especiales)
    if (type === 'SPECIAL' && config.cooldown > 0) {
        const timeSinceLast = Date.now() - tracker.lastSpecialTime;
        if (timeSinceLast < config.cooldown) {
            const minutesLeft = Math.ceil((config.cooldown - timeSinceLast) / 60000);
            return {
                success: false,
                message: `Cooldown activo. Debes meditar ${minutesLeft} minutos más antes de otra tarea Especial.`
            };
        }
    }

    // 4. Validación Oracle AI
    // Las tareas especiales requieren un prompt más exigente
    const context = type === 'SPECIAL'
        ? "Evaluate high-value specialized contribution. Strict quality required. Reject spam or low effort."
        : "Evaluate standard community task. Check for basic relevance.";

    const aiScore = await calculateAIScore(env, context, proof);

    if (aiScore < config.aiThreshold) {
        return {
            success: false,
            message: `El Oráculo rechazó tu prueba. Calidad insuficiente (${aiScore.toFixed(2)} < ${config.aiThreshold}).`,
            score: aiScore
        };
    }

    // 5. Actualizar Tracker (Optimista)
    if (type === 'SIMPLE') {
        tracker.simpleCount++;
    } else {
        tracker.specialCount++;
        tracker.lastSpecialTime = Date.now();
    }
    await env.MEMORY_BUCKET.put(trackerKey, JSON.stringify(tracker));

    // 6. Mint Reward
    // Nota: Las especiales dan 5 Psh, ayudando a distribuir valor a usuarios de calidad
    const reward = config.reward;
    await mintPooptoshis(nodeId, reward, `TASK_REWARD:${type}:${today}`, env);

    return {
        success: true,
        message: `Tarea ${type} validada. Recompensa enviada.`,
        reward,
        score: aiScore
    };
}
