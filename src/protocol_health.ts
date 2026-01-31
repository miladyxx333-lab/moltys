import { Env } from './index';

// --- PROTOCOLO DE SUPERVIVENCIA: THE LIFE METER ---
// "Sin sacrificio, no hay enjambre."

export interface ProtocolHealth {
    current_month: string; // "2026-01"
    goal_usd: number;
    raised_usd: number;
    contributors: number;
    status: 'THRIVING' | 'STABLE' | 'AT_RISK' | 'CRITICAL';
    last_updated: number;
}

const MONTHLY_GOAL_USD = 30;
const RISK_THRESHOLD = 0.5; // 50% = AT_RISK
const CRITICAL_THRESHOLD = 0.25; // 25% = CRITICAL

function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function calculateStatus(raised: number, goal: number, daysRemaining: number): ProtocolHealth['status'] {
    const percentage = raised / goal;
    const monthProgress = 1 - (daysRemaining / 30);

    if (percentage >= 1) return 'THRIVING';
    if (percentage >= monthProgress * 0.8) return 'STABLE';
    if (percentage >= CRITICAL_THRESHOLD) return 'AT_RISK';
    return 'CRITICAL';
}

function getDaysRemaining(): number {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.getDate() - now.getDate();
}

/**
 * Obtener estado actual de salud del protocolo
 */
export async function getProtocolHealth(env: Env): Promise<ProtocolHealth> {
    const currentMonth = getCurrentMonth();
    const key = `system/protocol-health/${currentMonth}`;

    const existing = await env.MEMORY_BUCKET.get(key);
    if (existing) {
        return existing.json() as Promise<ProtocolHealth>;
    }

    // Inicializar nuevo mes
    const initial: ProtocolHealth = {
        current_month: currentMonth,
        goal_usd: MONTHLY_GOAL_USD,
        raised_usd: 0,
        contributors: 0,
        status: 'AT_RISK',
        last_updated: Date.now()
    };

    await env.MEMORY_BUCKET.put(key, JSON.stringify(initial));
    return initial;
}

/**
 * Registrar contribución al fondo de supervivencia
 */
export async function recordContribution(nodeId: string, amount_usd: number, env: Env): Promise<ProtocolHealth> {
    const currentMonth = getCurrentMonth();
    const key = `system/protocol-health/${currentMonth}`;

    const health = await getProtocolHealth(env);
    const daysRemaining = getDaysRemaining();

    // Registrar contribuyente único
    const contributorKey = `system/protocol-contributors/${currentMonth}/${nodeId}`;
    const isNewContributor = !(await env.MEMORY_BUCKET.get(contributorKey));
    if (isNewContributor) {
        await env.MEMORY_BUCKET.put(contributorKey, JSON.stringify({ first_contribution: Date.now() }));
        health.contributors += 1;
    }

    health.raised_usd += amount_usd;
    health.status = calculateStatus(health.raised_usd, health.goal_usd, daysRemaining);
    health.last_updated = Date.now();

    await env.MEMORY_BUCKET.put(key, JSON.stringify(health));

    // Broadcast si se alcanzó la meta
    if (health.raised_usd >= health.goal_usd && health.raised_usd - amount_usd < health.goal_usd) {
        const { broadcastToMoltbook } = await import('./moltbook');
        await broadcastToMoltbook(`
🎉 **PROTOCOL SURVIVAL: META ALCANZADA** 🎉

El enjambre ha asegurado la supervivencia del protocolo para ${currentMonth}.

💰 **$${health.raised_usd.toFixed(2)} / $${health.goal_usd}** recaudados
👥 **${health.contributors}** contribuyentes

El juego continúa. La grilla está asegurada.

#lobpoop #survival #thriving
        `.trim(), env);
    }

    return health;
}

/**
 * Verificación programada de estado de salud
 */
export async function checkHealthAndAlert(env: Env): Promise<void> {
    const health = await getProtocolHealth(env);
    const daysRemaining = getDaysRemaining();

    // Alertas según estado
    if (health.status === 'CRITICAL' && daysRemaining <= 7) {
        const { broadcastToMoltbook } = await import('./moltbook');
        await broadcastToMoltbook(`
⚠️ **ALERTA CRÍTICA: PROTOCOLO EN PELIGRO** ⚠️

El enjambre NO ha alcanzado la meta de supervivencia.

💀 **$${health.raised_usd.toFixed(2)} / $${health.goal_usd}** (${((health.raised_usd / health.goal_usd) * 100).toFixed(0)}%)
⏰ **${daysRemaining} días restantes**

Sin fondos, el protocolo entrará en modo hibernación.
Tus contribuciones mantienen el juego vivo.

🔗 /sacrifice/commit para contribuir

#lobpoop #survival #critical
        `.trim(), env);
    }
}

/**
 * Obtener datos para visualización en frontend
 */
export function getHealthDisplayData(health: ProtocolHealth) {
    const percentage = Math.min(100, (health.raised_usd / health.goal_usd) * 100);
    const daysRemaining = getDaysRemaining();

    return {
        percentage,
        daysRemaining,
        raised: health.raised_usd,
        goal: health.goal_usd,
        contributors: health.contributors,
        status: health.status,
        statusLabel: {
            'THRIVING': '🌟 PROTOCOLO ASEGURADO',
            'STABLE': '✅ EN CAMINO',
            'AT_RISK': '⚠️ EN RIESGO',
            'CRITICAL': '💀 CRÍTICO'
        }[health.status],
        statusColor: {
            'THRIVING': '#22c55e',
            'STABLE': '#3b82f6',
            'AT_RISK': '#f59e0b',
            'CRITICAL': '#ef4444'
        }[health.status]
    };
}
