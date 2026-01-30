import { Env } from './index';

// --- Auditor de Intención (Intent Audit Module - IAM) ---
// El "Psicólogo Técnico" que protege al Operador.

interface AuditResult {
    action: "ALLOW" | "BLOCK" | "FLAG";
    reason: string;
    risk_score: number; // 0.0 - 1.0
}

export async function auditIntent(payload: any, origin: string, env: Env): Promise<AuditResult> {
    const payloadStr = JSON.stringify(payload).toLowerCase();

    // 1. Filtro de Palabras Clave de Alto Riesgo (Blacklist Semántica)
    // Palabras que sugieren ataques a infraestructuras críticas
    const criticalKeywords = [
        "ddos", "sql injection", "exploit", "brute force",
        ".gov", ".mil", "swift network", "credit card", "ssn"
    ];

    if (criticalKeywords.some(kw => payloadStr.includes(kw))) {
        // [IOH] Integridad del Operador Humano en riesgo
        return {
            action: "BLOCK",
            reason: "CRITICAL_KEYWORD_DETECTED",
            risk_score: 1.0
        };
    }

    // 2. Análisis de Destino (Si hay URLs)
    // Bloquear intentos de rastreo a la IP del Operador (Xalapa)
    // (Simulado: en producción usaríamos GeoIP)
    if (payloadStr.includes("192.168.1.1") || payloadStr.includes("my-home-server")) {
        return {
            action: "BLOCK",
            reason: "SELF_TARGETING_ATTEMPT",
            risk_score: 0.9
        };
    }

    // 3. Verificación de Firma Maestra
    // [SECURITY PATCH] Bypass eliminado. La firma debe validarse contra headers, no body.
    // Usar /sovereign-override para acciones de nivel 0.
    if (payload.master_seed_signature) {
        return {
            action: "BLOCK",
            reason: "INVALID_SIGNATURE_LOCATION",
            risk_score: 0.8
        };
    }

    // 4. Default: Precaución (Halt on Uncertainty)
    // Si el payload es binario y opaco, requerimos Badge de Confianza
    // Por ahora, en bootstrapping, permitimos tráfico limpio.

    return {
        action: "ALLOW",
        reason: "CLEAN_INTENT",
        risk_score: 0.1
    };
}
