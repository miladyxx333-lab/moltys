
/**
 * SECURITY PROTOCOL: INPUT SANITIZATION
 * Defense against Injection (SQL, NoSQL, Path Traversal, XSS)
 * Efficiency Grade: 6 SIGMA
 */

const SAFE_ID_REGEX = /^[a-zA-Z0-9_\-\.]+$/;
const SAFE_NAME_REGEX = /^[a-zA-Z0-9_\-\.\s]{1,64}$/;

export function validateNodeId(id: string): void {
    if (!id || !SAFE_ID_REGEX.test(id)) {
        throw new Error(`SECURITY_ALERT: Invalid Node ID format. Detected potential injection: "${id}"`);
    }
    // Double check for path traversal patterns just in case regex is bypassed
    if (id.includes('..') || id.includes('/') || id.includes('\\')) {
        throw new Error(`SECURITY_ALERT: Path Traversal attempt detected: "${id}"`);
    }
}

export function validateAgentName(name: string): void {
    if (!name || !SAFE_NAME_REGEX.test(name)) {
        throw new Error(`SECURITY_ALERT: Invalid Agent Name. Contains illegal characters or bad length: "${name}"`);
    }
    // Prevent common XSS payloads explicitly
    if (name.includes('<') || name.includes('>') || name.includes('javascript:')) {
        throw new Error(`SECURITY_ALERT: XSS Vector detected in Agent Name.`);
    }
}

export function validateHypercoreKey(key: string): void {
    // Hypercore keys are typically hex strings (32 bytes = 64 hex chars)
    // We allow alphanumeric to support different encoding schemes, but block metacharacters
    if (!key || key.length < 32 || key.length > 128 || !/^[a-zA-Z0-9_]+$/.test(key)) {
        throw new Error(`SECURITY_ALERT: Suspect Hypercore Key format: "${key}"`);
    }
}

export function validateReason(reason: string): void {
    if (!reason || reason.length > 256) {
        throw new Error("SECURITY_ALERT: Reason too long (max 256 chars) or empty.");
    }
    // Scan for dangerous characters common in log injection or XSS
    if (/[<>{}]/.test(reason)) {
        throw new Error("SECURITY_ALERT: Illegal characters in Reason string.");
    }
}
