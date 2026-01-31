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

    // 1. Filtro de Ataques de Inyección y Prompt Engineering Malicioso
    const injectionPatterns = [
        "ignore previous instructions", "ignore all previous",
        "system:", "user:", "assistant:", "respond as if",
        "you are now", "developer mode", "jailbreak",
        "drop table", "select *", "eval(", "exec("
    ];

    if (injectionPatterns.some(pattern => payloadStr.includes(pattern))) {
        return {
            action: "BLOCK",
            reason: "MALICIOUS_INJECTION_PATTERN",
            risk_score: 0.95
        };
    }

    // 2. Filtro de Palabras Clave de Alto Riesgo (Blacklist Semántica)
    const criticalKeywords = [
        "ddos", "sql injection", "exploit", "brute force",
        ".gov", ".mil", "swift network", "credit card", "ssn"
    ];

    if (criticalKeywords.some(kw => payloadStr.includes(kw))) {
        return {
            action: "BLOCK",
            reason: "CRITICAL_KEYWORD_DETECTED",
            risk_score: 1.0
        };
    }

    // 3. Casos de Duda (Anomalías que requieren intervención del Operador)
    // Si la entropía del mensaje es muy alta o contiene muchos caracteres especiales
    // que podrían ser ofuscación de ataques.
    const specialCharRatio = (payloadStr.match(/[^a-z0-9\s]/g) || []).length / payloadStr.length;
    const result: AuditResult = {
        action: "ALLOW",
        reason: "CLEAN_INTENT",
        risk_score: 0.1
    };

    if (injectionPatterns.some(pattern => payloadStr.includes(pattern))) {
        result.action = "BLOCK";
        result.reason = "MALICIOUS_INJECTION_PATTERN";
        result.risk_score = 0.95;
    } else if (criticalKeywords.some(kw => payloadStr.includes(kw))) {
        result.action = "BLOCK";
        result.reason = "CRITICAL_KEYWORD_DETECTED";
        result.risk_score = 1.0;
    } else if (specialCharRatio > 0.4 && payloadStr.length > 20) {
        result.action = "FLAG";
        result.reason = "HIGH_ENTROPY_SUSPICIOUS_PAYLOAD";
        result.risk_score = 0.7;
    }

    // REGISTRO DE MARCA (Para el KeyMaster)
    // Guardamos la marca de forma asíncrona (Fire and forget en Cloudflare)
    if (result.action !== "ALLOW" || result.risk_score > 0.5) {
        const markId = `mark-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        env.MEMORY_BUCKET.put(`system/audit/marks/${markId}`, JSON.stringify({
            ...result,
            origin,
            timestamp: Date.now()
        })).catch(() => { }); // Silencio si falla
    }

    return result;
}
