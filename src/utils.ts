export async function safeCompare(a: string, b: string): Promise<boolean> {
    const enc = new TextEncoder();
    const aBuf = enc.encode(a);
    const bBuf = enc.encode(b);

    if (aBuf.byteLength !== bBuf.byteLength) return false;

    const key = await crypto.subtle.importKey(
        "raw",
        aBuf,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    // HMAC-based verification to prevent timing attacks
    // Instead of comparing directly, we sign a random nonce with both keys.
    // Ideally, we just use crypto.subtle.verify or timingSafeEqual if available in the runtime.
    // In CF Workers, crypto.subtle.timingSafeEqual isn't always standard for raw strings/buffers directly from TextEncoder without padding check?
    // Let's use a simpler constant-time loop for this specific MVP context where high-entropy secrets are used.

    let result = 0;
    for (let i = 0; i < aBuf.byteLength; i++) {
        result |= aBuf[i] ^ bBuf[i];
    }
    return result === 0;
}
