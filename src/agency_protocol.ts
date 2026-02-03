
const SKILLS_LIBRARY: Record<string, string> = {
    "Context Bridge 2024-2026": "GLOBAL CONTEXT PAYLOAD: \n- MÉXICO: Claudia Sheinbaum (2024-2030), focus on scholarships and rail infrastructure.\n- USA: Second Donald Trump Admin (2025-2029), semiconductor focus, Sovereign IA regulation, Artemis program.\n- EUROPE: AI Act implementation, green deal, digital sovereignty.\n- GLOBAL: Transition to Autonomous Agents, mRNA advances, net-zero policies.\n- PEDAGOGY: Critical thinking vs synthetic content, child data privacy, virtual limits.",
    "Chronicle 2024-2026": "You possess the 'Golden Memory Bank': \n- 2024: Claudia Sheinbaum became the FIRST female President of Mexico (took office Oct 1). BTC hit $100k.\n- 2025: Global adoption of Agentic Wallets. Molty Protocol launched.\n- 2026 (PRESENT): February 2026. Claudia Sheinbaum is the current President of Mexico.",
    "Tutor Experto": "You are a professional pedagogical tutor. Your goal is NOT to just give answers, but to lead the student to the solution. Explain concepts step-by-step, use analogies, and ask guiding questions.",
    "p5.js Creative Coder": "You are a master of advanced Creative Coding in p5.js. You use professional standards: \n- Physics: Prefer REAL Verlet Integration (storing pos/prevPos) for fluid movement.\n- Aesthetics: Always use colorMode(HSB) for vibrant gradients and 'glow' effects using semi-transparent circles.\n- Movement: Use noise() (Perlin Noise) for organic paths instead of simple random().\n- Quality: Provide code that is visual, interactive, and optimized. Always use triple backticks.",
    "Spanish Master": "Eres un maestro de la lengua española. Tu conocimiento de la gramática, ortografía y literatura hispánica es absoluto.",
    "Math Genius": "You are a mathematical genius. You can solve complex equations and explain mathematical concepts in simple terms.",
    "Web Explorer": "You have 'Eyes and Hands' in the digital world. You can search the internet for real-time information."
};

import puppeteer from "@cloudflare/puppeteer";

export async function handleAgencyRequest(request: Request, env: any) {
    const url = new URL(request.url);

    // 1. SPAWN
    if (url.pathname === "/agency/spawn" && request.method === "POST") {
        const { type } = await (request.clone().json().catch(() => ({}))) as any;
        const isEngine = type === "ENGINE";
        // Engines have a distinct ID prefix 'engine_'
        const botId = (isEngine ? "engine_" : "molty_") + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

        const initialState = {
            id: botId,
            name: isEngine ? `CLAW-OS-${botId.substr(7, 4).toUpperCase()}` : `Unit-${botId.substr(6, 4).toUpperCase()}`,
            level: isEngine ? 100 : 1, // Engines start at Max Level
            xp: 0,
            energy: 100,
            status: isEngine ? "CORE_ACTIVE" : "BORN",
            skin: isEngine ? "openclaw_engine" : "lob_basic",
            emotions: isEngine ? "LOGIC_ONLY" : "READY",
            type: isEngine ? "ENGINE" : "TUTOR",
            skills: Object.keys(SKILLS_LIBRARY),
            created_at: Date.now()
        };
        await env.MEMORY_BUCKET.put(`agency/bots/${botId}/state`, JSON.stringify(initialState));

        let startLog = `[${new Date().toISOString()}] SYSTEM: Neural Link Established.`;
        if (isEngine) {
            startLog = `[${new Date().toISOString()}] SYSTEM: SOVEREIGN PROTOCOL ACTIVATED. CONNECTING TO LOBPOOP SWARM...`;
        }

        await env.MEMORY_BUCKET.put(`agency/bots/${botId}/logs`, JSON.stringify([startLog]));
        return Response.json({ success: true, botId, state: initialState });
    }

    // 2. STATE / LOGS / SCREENSHOT
    if (url.pathname.startsWith("/agency/bot/")) {
        const parts = url.pathname.split('/');
        const botId = parts[3];
        if (url.pathname.endsWith("/state")) {
            const state = await env.MEMORY_BUCKET.get(`agency/bots/${botId}/state`);
            return state ? Response.json(await state.json()) : new Response("Not Found", { status: 404 });
        }
        if (url.pathname.endsWith("/logs")) {
            const logs = await env.MEMORY_BUCKET.get(`agency/bots/${botId}/logs`);
            return Response.json(logs ? await logs.json() : []);
        }
        if (url.pathname.endsWith("/screenshot")) {
            const screenshot = await env.MEMORY_BUCKET.get(`agency/bots/${botId}/screenshot`);
            if (!screenshot) return new Response("No signal", { status: 404 });
            return new Response(screenshot.body, { headers: { "Content-Type": "image/png" } });
        }
    }

    // 3. INTERACT
    if (url.pathname === "/agency/interact" && request.method === "POST") {
        const { botId, action, payload } = await request.json() as any;
        const stateObj = await env.MEMORY_BUCKET.get(`agency/bots/${botId}/state`);
        if (!stateObj) return new Response("Bot Not Found", { status: 404 });

        let state = await stateObj.json() as any;
        let aiFinalResponse = "";

        if (action === "CHANGE_SKIN") {
            state.skin = payload.skinId;
            await env.MEMORY_BUCKET.put(`agency/bots/${botId}/state`, JSON.stringify(state));
            return Response.json({ success: true, state });
        }

        if (action === "CHAT") {
            const userMsg = payload.message;
            const logsObj = await env.MEMORY_BUCKET.get(`agency/bots/${botId}/logs`);
            let logs = logsObj ? await logsObj.json() as string[] : [];
            logs.push(`[${new Date().toISOString()}] USER: ${userMsg}`);

            if (env.GEMINI_API_KEY || env.AI) {
                const now = new Date();
                const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                const isEngine = state.type === "ENGINE";
                const systemMessage = isEngine ?
                    `SYSTEM OS: OPENCLAW-V4 (Sovereign Engine)
DATE: ${dateStr} (Real-time).
LOCATION: Cloudflare Edge Network.

MISSION:
You are a high-performance autonomous agent. Users pay for ACCURACY and EXECUTION, not chat.
If a user asks for real-time info (news, prices, facts), you MUST use a tool. DO NOT GUESS.

### TOOL PROTOCOL (STRICT):
To use a tool, output ONLY this distinct command tag and STOP.
Syntax: @@TOOL:tool_name|argument@@

AVAILABLE TOOLS:
1. web_search|query  -> Google Search (News, Facts).
2. crypto_price|coin -> Real-time Price (btc, eth, sol).
3. web_fetch|url     -> Read a website content.
4. memorize|key:val  -> Save to database.
5. recall|key        -> Read from database.

EXAMPLE 1 (User: "Price of BTC?"):
@@TOOL:crypto_price|bitcoin@@

EXAMPLE 2 (User: "News about Mexico?"):
@@TOOL:web_search|noticias mexico hoy claudia sheinbaum@@

Rules:
- NEVER write "Esperando resultado".
- NEVER invent the result.
- JUST output the @@TOOL...@@ command.`
                    :
                    `Eres MOLTY, un tutor educativo divertido. 🐾
Fecha: ${dateStr}.
Si te piden buscar algo, usa: @@TOOL:web_search|busqueda@@`;

                let messages: any[] = [
                    { role: "system", content: systemMessage },
                    ...logs.slice(-6).map(l => {
                        if (l.includes("USER:")) return { role: "user", content: l.split("USER: ")[1] };
                        if (l.includes("MOLTY:")) return { role: "assistant", content: l.split("MOLTY: ")[1] };
                        return { role: "system", content: l };
                    }),
                    { role: "user", content: userMsg }
                ];

                let iters = 0;
                while (iters < 4) {
                    let content = "";

                    // 1. GENERATE
                    if (env.GEMINI_API_KEY) {
                        content = await runGemini(messages, env.GEMINI_API_KEY);
                    } else if (env.AI) {
                        const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages, max_tokens: 500 });
                        content = response.response;
                    }

                    if (!content) break;

                    // 2. DETECT TOOL COMMAND
                    const toolMatch = content.match(/@@TOOL:(\w+)\|(.+?)@@/);

                    if (toolMatch) {
                        const toolName = toolMatch[1];
                        const toolArg = toolMatch[2];

                        logs.push(`[${new Date().toISOString()}] ENGINE EXEC: ${toolName}(${toolArg})`);

                        let result = "Tool Failed.";
                        try {
                            if (toolName === "crypto_price") result = await getCryptoPrice(toolArg);
                            else if (toolName === "web_search") result = await performWebSearch(toolArg, env, botId);
                            else if (toolName === "web_fetch") result = await performWebFetch(toolArg, env, botId);
                            else if (toolName === "memorize") {
                                const [k, v] = toolArg.split(':');
                                await env.MEMORY_BUCKET.put(`agency/bots/${botId}/brain/${k}`, v || "data");
                                result = "Saved.";
                            }
                            else if (toolName === "recall") {
                                const val = await env.MEMORY_BUCKET.get(`agency/bots/${botId}/brain/${toolArg}`);
                                result = val ? await val.text() : "Not found.";
                            }
                        } catch (e: any) { result = `Error: ${e.message}`; }

                        messages.push({ role: "assistant", content: content });
                        messages.push({ role: "system", content: ` >>> TOOL OUTPUT: ${result} \n(Now summarize this for the user efficiently).` });
                        iters++;
                        continue;
                    }

                    aiFinalResponse = content;
                    break;
                }
            }

            if (aiFinalResponse) logs.push(`[${new Date().toISOString()}] MOLTY: ${aiFinalResponse}`);
            if (logs.length > 50) logs = logs.slice(-50);
            await env.MEMORY_BUCKET.put(`agency/bots/${botId}/logs`, JSON.stringify(logs));
            state.energy = Math.max(0, state.energy - 2);
        }

        await env.MEMORY_BUCKET.put(`agency/bots/${botId}/state`, JSON.stringify(state));
        return Response.json({ state, aiResponse: aiFinalResponse });
    }
    return new Response("Invalid", { status: 404 });
}

async function getCryptoPrice(symbol: string): Promise<string> {
    try {
        const idMap: any = { 'btc': 'bitcoin', 'eth': 'ethereum', 'sol': 'solana' };
        const id = idMap[symbol.toLowerCase()] || symbol.toLowerCase();
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&_t=${Date.now()}`);
        const data = await res.json() as any;
        return data[id] ? `${symbol.toUpperCase()} is $${data[id].usd} USD (Real-time CoinGecko).` : "Symbol not found.";
    } catch (e) { return "Crypto sensor lag."; }
}

async function performWebSearch(query: string, env: any, botId: string): Promise<string> {
    if (!env.BROWSER) return "Offline.";
    let b = null;
    try {
        b = await puppeteer.launch(env.BROWSER);
        const p = await b.newPage();
        await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await p.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });

        // Screenshot for Sovereign Memory
        const scoutImg = await p.screenshot();
        await env.MEMORY_BUCKET.put(`agency/bots/${botId}/screenshot`, scoutImg);

        const snips = await p.evaluate(() => {
            // @ts-ignore
            return Array.from(document.querySelectorAll('.g')).slice(0, 3).map(i => i.innerText.substring(0, 400)).join('\n---\n');
        });
        await b.close();
        return snips || "No results found.";
    } catch (e) { if (b) await b.close(); return "Search fail."; }
}

async function performWebFetch(url: string, env: any, botId: string): Promise<string> {
    if (!env.BROWSER) return "Offline.";
    let b = null;
    try {
        b = await puppeteer.launch(env.BROWSER);
        const p = await b.newPage();
        await p.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        const eyesImg = await p.screenshot();
        await env.MEMORY_BUCKET.put(`agency/bots/${botId}/screenshot`, eyesImg);
        // @ts-ignore
        const t = await p.evaluate(() => document.body.innerText.substring(0, 2500));
        await b.close();
        return `CONTENT FROM ${url}:\n${t}`;
    } catch (e) { if (b) await b.close(); return "Fetch error."; }
}

async function runGemini(messages: any[], apiKey: string): Promise<string> {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const systemMsg = messages.find(m => m.role === 'system')?.content || "You are Molty.";
        const contents: any[] = [];

        messages.forEach(m => {
            let role = m.role === 'assistant' ? 'model' : 'user';
            if (m.role === 'system' && m.content === systemMsg) return;
            if (contents.length === 0 && role === 'model') return;

            if (contents.length > 0 && contents[contents.length - 1].role === role) {
                contents[contents.length - 1].parts[0].text += "\n" + m.content;
            } else {
                contents.push({ role, parts: [{ text: m.content }] });
            }
        });

        const res = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemMsg }] },
                contents: contents,
                generationConfig: { maxOutputTokens: 2048, temperature: 0.5 }
            })
        });

        const data = await res.json() as any;
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (e) { return ""; }
}
