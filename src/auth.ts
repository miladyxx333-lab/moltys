
import { Env } from './index';

// --- Cryptographic Security Protocol (Ed25519) ---

/**
 * Convierte un string base64 a Uint8Array.
 */
export function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Importa una llave pública en formato SPKI para verificación.
 */
export async function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
    const spkiBytes = base64ToBytes(spkiBase64);
    // Intentar 'Ed25519' estándar, fallback a 'NODE-ED25519' para entornos antiguos
    try {
        return await crypto.subtle.importKey(
            'spki',
            spkiBytes,
            { name: 'Ed25519' },
            false,
            ['verify']
        );
    } catch (e) {
        return await crypto.subtle.importKey(
            'spki',
            spkiBytes,
            { name: 'NODE-ED25519' } as any,
            false,
            ['verify']
        );
    }
}

/**
 * Verifica una firma digital contra un mensaje y una llave pública.
 */
export async function verifySignature(publicKey: CryptoKey, signatureBase64: string, messageBytes: Uint8Array): Promise<boolean> {
    const sigBytes = base64ToBytes(signatureBase64);
    const algorithm = (publicKey.algorithm.name === 'NODE-ED25519') ? 'NODE-ED25519' : 'Ed25519';
    return await crypto.subtle.verify(
        algorithm,
        publicKey,
        sigBytes,
        messageBytes
    );
}

/**
 * Valida la frescura de un timestamp para evitar ataques de replay.
 * @param timestamp Milisegundos desde la época.
 * @param windowMs Ventana de tiempo permitida (default 5 min).
 */
export function isTimestampFresh(timestamp: number, windowMs: number = 300000): boolean {
    const now = Date.now();
    return Math.abs(now - timestamp) < windowMs;
}

/**
 * Verifica un request firmado.
 * Extrae firma y mensaje de los headers, recupera la llave del nodo y valida.
 */
export async function verifySignedRequest(request: Request, env: Env): Promise<{ success: boolean; nodeId?: string; data?: any; message?: string }> {
    const signature = request.headers.get('X-Signature');
    const messageBase64 = request.headers.get('X-Message');

    if (!signature || !messageBase64) {
        return { success: false, message: "Missing cryptographic headers (X-Signature, X-Message)." };
    }

    try {
        const messageBytes = base64ToBytes(messageBase64);
        const decodedMessage = JSON.parse(new TextDecoder().decode(messageBytes));
        const { nodeId, timestamp, action, data } = decodedMessage;

        // 1. Validar Timestamp
        if (!isTimestampFresh(timestamp)) {
            return { success: false, message: "Request expired (Timestamp out of window)." };
        }

        // 2. Recuperar Llave Pública desde el DO de la cuenta
        const { getAccount } = await import('./economy');
        const account = await getAccount(nodeId, env);

        if (!account.publicKeySpki) {
            return { success: false, message: "Node not registered. Public key not found." };
        }

        // 3. Importar y Verificar
        const publicKey = await importPublicKey(account.publicKeySpki);
        const isValid = await verifySignature(publicKey, signature, messageBytes);

        if (!isValid) {
            return { success: false, message: "Invalid digital signature. Authentication failed." };
        }

        return { success: true, nodeId, data };
    } catch (e: any) {
        return { success: false, message: `Crypto error: ${e.message}` };
    }
}
