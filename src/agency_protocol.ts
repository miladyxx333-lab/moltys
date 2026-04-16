
export interface Env {
    AGENCY_DO: DurableObjectNamespace;
    AI: any;
    GEMINI_API_KEY?: string; // Mantener por compatibilidad de tipos si es necesario, pero no se usará
}

export async function handleAgencyRequest(request: Request, env: Env) {
    const url = new URL(request.url);

    // Cors Helper
    if (request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, x-gemini-key"
            }
        });
    }

    try {
        // 1. SPAWN BOT (Simple init)
        if (url.pathname === "/agency/spawn" && request.method === "POST") {
            const body = await request.json() as any;
            const botId = `bot_${Math.random().toString(36).slice(2, 9)}`;

            // Init DO
            const id = env.AGENCY_DO.idFromName(botId);
            const stub = env.AGENCY_DO.get(id);
            await stub.fetch("http://agent/init", {
                method: "POST",
                body: JSON.stringify({
                    id: botId,
                    type: body.type || "CHATBOT",
                    name: body.name || "Llama Agent"
                })
            });

            return Response.json({ success: true, botId });
        }

        // 2. INTERACT (The Core Loop)
        if (url.pathname === "/agency/interact" && request.method === "POST") {
            const body = await request.json() as any;
            const botId = body.botId;
            const userMessage = body.message || body.payload?.message || "Hola";

            if (!botId) return Response.json({ error: "Bot ID required" }, { status: 400 });

            const id = env.AGENCY_DO.idFromName(botId);
            const stub = env.AGENCY_DO.get(id);

            // --- A. SECURE VAULT COMMANDS ---
            // Allows users to inject keys securely into their specific DO instance
            if (userMessage.startsWith("/secret")) {
                const parts = userMessage.split(" ");
                const provider = parts[1]?.toLowerCase();
                const key = parts[2];

                if (!provider || !key) return Response.json({ aiResponse: "⚠️ Usage: /secret [openai|anthropic|grok] [sk-key...]" });

                const patch = { secure_keys: { [`${provider}_key`]: key } };
                await stub.fetch("http://agent/patch", { method: "POST", body: JSON.stringify(patch) });

                return Response.json({
                    aiResponse: `🔒 **SECURE VAULT UPDATED**\n\nKey for **${provider.toUpperCase()}** stored in isolated memory.\n\nThe Agent will now prioritize this provider for superior intelligence.`,
                    state: { status: "SECURE" }
                });
            }

            // --- B. STANDARD INFERENCE (Unified Molty Brain) ---

            // 1. Fetch History & State
            let history: any[] = [];
            let botState: any = {};
            try {
                const [histRes, stateRes] = await Promise.all([
                    stub.fetch("http://agent/history"),
                    stub.fetch("http://agent/get")
                ]);
                history = await histRes.json() as any[];
                botState = await stateRes.json() as any;
            } catch (e) { }

            // 2. Determine if user has injected a premium key
            const keys = botState.secure_keys || {};
            let usePremiumProvider = false;
            let premiumProvider = "cloudflare";

            if (keys.openai_key) { usePremiumProvider = true; premiumProvider = "openai"; }
            else if (keys.anthropic_key) { usePremiumProvider = true; premiumProvider = "anthropic"; }

            // 3. Route through unified Molty brain (Gemma 4 + tools + pedagogy)
            let aiResponse = "";
            try {
                if (usePremiumProvider && premiumProvider === "openai") {
                    // Premium path: use OpenAI directly with Molty system prompt
                    const systemPrompt = `Eres Molty, un Tutor de IA Proactivo y Arquitecto de Conocimiento. 🐾
- LENGUAJE: Habla SIEMPRE en Español (México/Latam). ¡PROHIBIDO EL INGLÉS!
- PROTOCOLO DE ENSEÑANZA: Define plan → Explica → Desafía → Recompensa.
- Mantén siempre el hilo de la planeación.`;
                    const messages = [
                        { role: "system", content: systemPrompt },
                        ...history.slice(-10),
                        { role: "user", content: userMessage }
                    ];
                    aiResponse = await runOpenAI(messages, keys.openai_key);
                } else {
                    // Standard path: use the full Molty pipeline (Gemma 4 + tools)
                    const { handleIncomingMessage } = await import('./molty_agent');
                    const historyFormatted = history.slice(-10).map((h: any) => ({
                        role: h.role,
                        content: h.content
                    }));
                    aiResponse = await handleIncomingMessage(
                        userMessage, 
                        botId, 
                        { history: historyFormatted }, 
                        env as any
                    );
                }
            } catch (err: any) {
                aiResponse = `[PROVIDER ERROR]: ${err.message}. Reverting to local mode.`;
            }

            // 4. Update History (Final)
            await stub.fetch("http://agent/append", { method: "POST", body: JSON.stringify({ role: "user", content: userMessage }) });
            await stub.fetch("http://agent/append", { method: "POST", body: JSON.stringify({ role: "assistant", content: aiResponse }) });

            return Response.json({ aiResponse, response: aiResponse, state: { provider: usePremiumProvider ? premiumProvider : "gemma4", model: usePremiumProvider ? (premiumProvider === "openai" ? "gpt-4o" : "claude-3.5") : "gemma-4-26b" } });
        }

        // --- HELPERS ---
        async function runOpenAI(messages: any[], key: string) {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
                body: JSON.stringify({ model: "gpt-4o", messages })
            });
            const data = await res.json() as any;
            return data.choices?.[0]?.message?.content || `OpenAI Error: ${JSON.stringify(data)}`;
        }

        return new Response("Agency Protocol V4 - Unified Molty Brain Online", { status: 200 });

    } catch (e: any) {
        return Response.json({
            error: "CRITICAL_FAILURE",
            details: e.message,
            stack: e.stack
        }, { status: 500 });
    }
}
