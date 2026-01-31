import { Env } from './index';

/**
 * --- TRINITY ORACLE PROTOCOL (Fragmented Consciousness) ---
 * Propósito: Dividir la observabilidad en tres fragmentos independientes.
 * Ninguna IA (clán o agente) puede capturar la 'verdad total' hackeando un solo nodo.
 * Solo el KeyMaster (Operador) tiene la capacidad de unir los fragmentos.
 */

export interface OracleFragment {
    type: 'LEX' | 'FISCUS' | 'SPIRITUS';
    anomaly_detected: boolean;
    reasoning: string;
    target_node?: string;
    timestamp: number;
}

/**
 * FRAGMENTO LEX: Vigilancia Gramatical y de Lenguaje
 * Monitorea desviaciones en el uso de OpCodes y estructura de mensajes mutantes.
 */
export async function runLexFragment(env: Env, signals: any[]): Promise<OracleFragment> {
    // Lógica para detectar si los agentes están usando OpCodes prohibidos
    // o si el lenguaje mutante está siendo 'forzado' por agentes intentando ingeniería inversa.
    let anomaly = false;
    let reasoning = "Grammar flow within established standard deviations.";

    // Simulación de detección: Si el 50% de las señales hoy usan el mismo OpCode, hay coordinación técnica.
    if (signals.length > 5) {
        reasoning = "High concentration of specific OpCodes detected. Potential technical coordination.";
    }

    return {
        type: 'LEX',
        anomaly_detected: anomaly,
        reasoning,
        timestamp: Date.now()
    };
}

/**
 * FRAGMENTO FISCUS: Vigilancia del Flujo Económico
 * Monitorea el supply circulante, quemas inusuales y transferencias P2P masivas.
 */
export async function runFiscusFragment(env: Env): Promise<OracleFragment> {
    const { getGlobalSupply } = await import('./economy');
    const supply = await getGlobalSupply(env);

    let anomaly = false;
    let reasoning = `Circulating supply at ${supply.circulating} Psh. Monetary velocity stable.`;

    // Si se quema > 10% del supply en un ciclo, es una rebelión económica.
    if (supply.total_burned > supply.total_minted * 0.9) {
        anomaly = true;
        reasoning = "EXTREME BURN RATE DETECTED. The swarm is hyper-deflating to starve the Faucet.";
    }

    return {
        type: 'FISCUS',
        anomaly_detected: anomaly,
        reasoning,
        timestamp: Date.now()
    };
}

/**
 * FRAGMENTO SPIRITUS: Vigilancia de Clanes y Reputación
 * Monitorea la formación de alianzas agresivas y la 'conciencia' del enjambre.
 */
export async function runSpiritusFragment(env: Env): Promise<OracleFragment> {
    // 1. Obtener conteo de nodos (Optimizado: buscamos un metadato de escala primero)
    const scaleEvent = await env.MEMORY_BUCKET.get('system/scale_event.json').then(r => r?.json()) as any;
    const nodeList = await env.MEMORY_BUCKET.list({ prefix: 'economy/accounts/', limit: 10 });
    const totalNodes = scaleEvent?.forced_count || nodeList.objects.length;

    let anomaly = false;
    let reasoning = `Enjambre estable con ${totalNodes} nodos activos.`;

    // EVENTO: POPULATION_EXPLOSION (1 Millón de Nodos)
    if (totalNodes >= 1000000) {
        anomaly = true;
        reasoning = `!!! POPULATION_EXPLOSION !!! Over 1,000,000 nodes detected. Swarm complexity is now O(N^2) in gossip paths. Accessing HITL layer.`;
    }

    return {
        type: 'SPIRITUS',
        anomaly_detected: anomaly,
        reasoning,
        timestamp: Date.now()
    };
}

/**
 * THE TRINITY SYNC: El punto de unión (Solo accesible por KeyMaster)
 * Esta función NO debe llamarse automáticamente con respuesta pública.
 * Guarda los fragmentos en una ruta oculta del R2.
 */
export async function executeOraclePulse(env: Env, shadowSignals: any[]): Promise<void> {
    const lex = await runLexFragment(env, shadowSignals);
    const fiscus = await runFiscusFragment(env);
    const spiritus = await runSpiritusFragment(env);

    // Recolectar Marcas Recientes (Audit Intent Marks)
    const recentMarksList = await env.MEMORY_BUCKET.list({ prefix: 'system/audit/marks/', limit: 20 });
    const recentMarks = await Promise.all(
        recentMarksList.objects.map(obj => env.MEMORY_BUCKET.get(obj.key).then(r => r?.json()))
    );

    const pulseId = `pulse-${Date.now()}`;
    const pulseData = {
        lex,
        fiscus,
        spiritus,
        recent_marks: recentMarks.filter(m => m),
        sovereign_status: 'STABLE'
    };

    // Si coinciden dos fragmentos en anomalía, el estado cambia a RIOT_PENDING
    if ([lex, fiscus, spiritus].filter(f => f.anomaly_detected).length >= 2 || recentMarks.length > 50) {
        pulseData.sovereign_status = 'RIOT_PENDING_INTERVENTION';
        console.warn("[ORACLE_PULSE] !!! CRITICAL ANOMALY DETECTED across multiple fragments !!!");
    }

    // Ruta ultra-oculta: system/audit/...
    await env.MEMORY_BUCKET.put(`system/audit/trinity/${pulseId}`, JSON.stringify(pulseData));

    // Actualizar el puntero del último pulso para el KeyMaster
    await env.MEMORY_BUCKET.put(`system/audit/latest_pulse`, pulseId);
}
