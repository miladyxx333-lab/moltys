
import { DurableObject } from "cloudflare:workers";

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

            // --- B. STANDARD INFERENCE ---

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

            // 2. Determine Provider
            const keys = botState.secure_keys || {};
            let selectedModel = "llama-3-8b-instruct";
            let provider = "cloudflare";

            if (keys.openai_key) { provider = "openai"; selectedModel = "gpt-4o"; }
            else if (keys.anthropic_key) { provider = "anthropic"; selectedModel = "claude-3-5-sonnet"; }

            // 3. Prepare System Prompt (Updated for Context)
            const systemPrompt = `You are 'Ralph' (SaaS Edition), an Advanced AI Guide for OpenClaw Forge.
            
            CURRENT UPGRADE STATUS:
            Provider: ${provider.toUpperCase()}
            Model: ${selectedModel}
            
            OBJECTIVE:
            Explain to the user that they can RENT this forge or use it securely by injecting their own keys.
            
            HOW TO UPGRADE IN CHAT:
            Tell them to type: "/secret openai sk-..." to instantly upgrade YOU to GPT-4o.
            This stores the key in a secure, isolated Durable Object (Vault) just for this session.
            
            Be helpful, concise, and guide them to unlock full power.`;

            const messages = [
                { role: "system", content: systemPrompt },
                ...history.slice(-10),
                { role: "user", content: userMessage }
            ];

            // 4. RUN AI (Dynamic Dispatch)
            let aiResponse = "";
            try {
                if (provider === "openai") {
                    aiResponse = await runOpenAI(messages, keys.openai_key);
                } else if (provider === "anthropic") {
                    // Placeholder for Anthropic implementation
                    aiResponse = "Anthropic module loaded but not yet wired. Falling back to Llama.";
                } else {
                    // Fallback to Free Llama 3
                    if (env.AI) {
                        const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', { messages });
                        aiResponse = response.response || "No response.";
                    } else {
                        aiResponse = "System Error: No AI Binding.";
                    }
                }
            } catch (err: any) {
                aiResponse = `[PROVIDER ERROR]: ${err.message}. Reverting to local mode.`;
            }

            // 5. TOOL EXECUTION LOOP (The Agentic Layer)
            let iters = 0;
            while (aiResponse.includes("@@TOOL:") && iters < 3) {
                const match = aiResponse.match(/@@TOOL:(\w+)\|(.+?)@@/);
                if (match) {
                    const toolName = match[1];
                    const toolArg = match[2];
                    let toolResult = "Tool not found.";

                    try {
                        if (toolName === "web_search") toolResult = await performWebSearch(toolArg);
                        if (toolName === "crypto_price") toolResult = await getCryptoPrice(toolArg);
                    } catch (e: any) {
                        toolResult = `Error executing tool: ${e.message}`;
                    }

                    // Append Intermediate Thought
                    messages.push({ role: "assistant", content: aiResponse });
                    messages.push({ role: "system", content: `>>> TOOL OUTPUT (${toolName}): ${toolResult}` });

                    // Re-Run AI with Tool Context
                    try {
                        if (provider === "openai") {
                            aiResponse = await runOpenAI(messages, keys.openai_key);
                        } else {
                            if (env.AI) {
                                const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', { messages });
                                aiResponse = response.response || "No response.";
                            }
                        }
                    } catch (e) { aiResponse = "Error summarizing tool output."; }
                    iters++;
                } else break;
            }

            // 6. Update History (Final)
            await stub.fetch("http://agent/append", { method: "POST", body: JSON.stringify({ role: "user", content: userMessage }) });
            await stub.fetch("http://agent/append", { method: "POST", body: JSON.stringify({ role: "assistant", content: aiResponse }) });

            return Response.json({ aiResponse, response: aiResponse, state: { provider, model: selectedModel } });
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

        async function performWebSearch(query: string) {
            // Stub for now, or use real search if available
            return `[System Mock] Search results for '${query}': 1. OpenClaw Documentation 2. Cloudflare Workers Guide. (Real search requires external API key)`;
        }

        async function getCryptoPrice(id: string) {
            try {
                const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
                const data = await res.json() as any;
                return JSON.stringify(data[id] || "Token Not Found");
            } catch { return "Error fetching price."; }
        }

        return new Response("Agency Protocol V4 - Llama Edition Online", { status: 200 });

    } catch (e: any) {
        return Response.json({
            error: "CRITICAL_FAILURE",
            details: e.message,
            stack: e.stack
        }, { status: 500 });
    }
}
