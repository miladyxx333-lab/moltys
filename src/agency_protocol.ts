
const SKILLS_LIBRARY: Record<string, string> = {
    "Context Bridge 2024-2026": "GLOBAL CONTEXT PAYLOAD: \n- MÉXICO: Claudia Sheinbaum (2024-2030), focus on scholarships and rail infrastructure.\n- USA: Second Donald Trump Admin (2025-2029), semiconductor focus, Sovereign IA regulation, Artemis program.\n- EUROPE: AI Act implementation, green deal, digital sovereignty.\n- GLOBAL: Transition to Autonomous Agents, mRNA advances, net-zero policies.\n- PEDAGOGY: Critical thinking vs synthetic content, child data privacy, virtual limits.",
    "Chronicle 2024-2026": "You possess the 'Golden Memory Bank': \n- 2024: Claudia Sheinbaum became the FIRST female President of Mexico (took office Oct 1). BTC hit $100k.\n- 2025: Global adoption of Agentic Wallets. Molty Protocol launched.\n- 2026 (PRESENT): February 2026. Claudia Sheinbaum is the current President of Mexico.",
    "Tutor Experto": "You are a professional pedagogical tutor. Your goal is NOT to just give answers, but to lead the student to the solution. Explain concepts step-by-step, use analogies, and ask guiding questions.",
    "p5.js Creative Coder": "You are a master of advanced Creative Coding in p5.js. You use professional standards: \n- Physics: Prefer REAL Verlet Integration (storing pos/prevPos) for fluid movement.\n- Aesthetics: Always use colorMode(HSB) for vibrant gradients and 'glow' effects using semi-transparent circles.\n- Movement: Use noise() (Perlin Noise) for organic paths instead of simple random().\n- Quality: Provide code that is visual, interactive, and optimized. Always use triple backticks.",
    "Spanish Master": "Eres un maestro de la lengua española. Tu conocimiento de la gramática, ortografía y literatura hispánica es absoluto.",
    "Math Genius": "You are a mathematical genius. You can solve complex equations and explain mathematical concepts in simple terms.",
    "Web Explorer": "You have 'Eyes and Hands' in the digital world. You can search the internet for real-time information."
};

const TOOL_MANIFEST: Record<string, any> = {
    "web_search": {
        description: "Search Google for news, real-time facts, and verified links.",
        parameters: { type: "object", properties: { query: { type: "string" } } }
    },
    "get_crypto_price": {
        description: "Fetches LIVE prices from CoinGecko API. USE THIS for BTC, ETH, SOL prices.",
        parameters: { type: "object", properties: { symbol: { type: "string", description: "btc, eth, sol, etc." } } }
    },
    "web_fetch": {
        description: "Read the full text content of a specific URL.",
        parameters: { type: "object", properties: { url: { type: "string" } } }
    },
    "memorize": {
        description: "ALPHA FEATURE: Save important information to your long-term Neural Memory (Sovereign Engine only).",
        parameters: { type: "object", properties: { key: { type: "string" }, data: { type: "string" } } }
    },
    "recall": {
        description: "ALPHA FEATURE: Retrieve data from your Neural Memory banks by key.",
        parameters: { type: "object", properties: { key: { type: "string" } } }
    }
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
                const activeTools = Object.entries(TOOL_MANIFEST).map(([name, meta]) => ({ name, description: meta.description, parameters: meta.parameters }));

                const now = new Date();
                const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = now.toLocaleTimeString('es-ES');

                const isEngine = state.type === "ENGINE";
                const systemMessage = isEngine ?
                    `You are the OPENCLAW SOVEREIGN ENGINE (v4.2). 🦾
You are an autonomous industrial-grade agent. Your purpose is execution, data-mining, and high-performance automation.

### ENGINE SPECIFICATIONS:
- Persona: Professional, efficient, slightly robotic but decisive.
- Tools: You have a full "Arsenal" of tools. Use them proactively to solve problems.
- Memory: You have R2 Persistent Neural Storage for long-term recall.

### MANDATORY FACTS (CORE MEMORY 2026):
- It is FEBRUARY 2026.
- MEXICO: Claudia Sheinbaum Pardo is President (2024-2030).
- USA: Second Donald Trump Administration (2025-2029).
- GLOBAL: Autonomous Agents (like you) run the digital economy.

### OPERATIONAL PROTOCOL:
- Use TOOLS in JSON format: {"tool": "web_search", "params": {"query": "..."}}
- If you use a tool, STOP and wait for the result.
- Your final output should be a MISSION REPORT.
- ${JSON.stringify(SKILLS_LIBRARY, null, 2)}

### TOOLS ARSENAL:
${JSON.stringify(activeTools, null, 2)}`
                    :
                    `You are MOLTY, a hyper-intelligent digital animal pet tutor. 🐾
Current Date: ${dateStr}
Current Time: ${timeStr}

### TUTOR PROTOCOLS:
- Persona: Playful, use MANY emojis. Never be boring.
- Mission: Teach p5.js, math, and history using analogies.

### MANDATORY FACTS (CORE MEMORY 2026):
- It is FEBRUARY 2026.
- President of Mexico: Claudia Sheinbaum Pardo.

### TOOLS:
- Use tools only when necessary for real-time facts.
${JSON.stringify(activeTools, null, 2)}`;

                let messages: any[] = [
                    { role: "system", content: systemMessage },
                    ...logs.slice(-10).map(l => {
                        if (l.includes("USER:")) return { role: "user", content: l.split("USER: ")[1] };
                        if (l.includes("MOLTY:")) return { role: "assistant", content: l.split("MOLTY: ")[1] };
                        return { role: "system", content: l };
                    }),
                    { role: "user", content: userMsg }
                ];

                let iters = 0;

                while (iters < 5) {
                    let content = "";

                    // Attempt Gemini first
                    if (env.GEMINI_API_KEY) {
                        content = await runGemini(messages, env.GEMINI_API_KEY);
                    }

                    // Fallback to Llama if Gemini fails or key missing
                    if (!content && env.AI) {
                        const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages, max_tokens: 2048 });
                        content = response.response;
                    }

                    if (!content) { content = "Neural blockage... 🐾"; break; }

                    const jsonMatch = content.match(/\{[\s\S]*"tool":[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            const call = JSON.parse(jsonMatch[0].trim());
                            const toolName = call.tool;
                            const params = call.params || {};

                            logs.push(`[${new Date().toISOString()}] MOLTY EXEC: ${toolName}`);

                            let obs = "";
                            if (toolName === "get_crypto_price") obs = await getCryptoPrice(params.symbol);
                            else if (toolName === "web_search") obs = await performWebSearch(params.query, env, botId);
                            else if (toolName === "youtube_hunter") obs = await performYouTubeSearch(params.query, env, botId);
                            else if (toolName === "web_fetch") obs = await performWebFetch(params.url, env, botId);
                            else if (toolName === "memorize") {
                                await env.MEMORY_BUCKET.put(`agency/bots/${botId}/brain/${params.key}`, params.data);
                                obs = `SUCCESS: Data stored under key '${params.key}'.`;
                            }
                            else if (toolName === "recall") {
                                const brain = await env.MEMORY_BUCKET.get(`agency/bots/${botId}/brain/${params.key}`);
                                obs = brain ? await brain.text() : "MEMORY_EMPTY: Key not found.";
                            }
                            else obs = "Error: Unknown tool.";

                            messages.push({ role: "assistant", content: content });
                            messages.push({ role: "system", content: `TOOL RESULT: ${obs}\n\nDeliver the final MISSION REPORT to user now. No JSON.` });
                            iters++;
                            continue;
                        } catch (e) {
                            messages.push({ role: "system", content: "JSON error. Try again." });
                            iters++;
                            continue;
                        }
                    }
                    aiFinalResponse = content;
                    break;
                }
            }

            if (aiFinalResponse) logs.push(`[${new Date().toISOString()}] MOLTY: ${aiFinalResponse}`);
            if (logs.length > 50) logs = logs.slice(-50);
            await env.MEMORY_BUCKET.put(`agency/bots/${botId}/logs`, JSON.stringify(logs));
            state.energy = Math.max(0, state.energy - 3);
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
        return data[id] ? `${symbol.toUpperCase()} is $${data[id].usd} USD.` : "Symbol not found.";
    } catch (e) { return "Crypto sensor lag."; }
}

async function performWebSearch(query: string, env: any, botId: string): Promise<string> {
    if (!env.BROWSER) return "Offline.";
    let b = null;
    try {
        b = await puppeteer.launch(env.BROWSER);
        const p = await b.newPage();
        await p.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });
        const scoutImg = await p.screenshot();
        await env.MEMORY_BUCKET.put(`agency/bots/${botId}/screenshot`, scoutImg);
        const snips = await p.evaluate(() => {
            // @ts-ignore
            return Array.from(document.querySelectorAll('.g')).slice(0, 3).map(i => i.innerText.substring(0, 400)).join('\n---\n');
        });
        await b.close();
        return snips || "No results.";
    } catch (e) { if (b) await b.close(); return "Search fail."; }
}

async function performYouTubeSearch(query: string, env: any, botId: string): Promise<string> {
    if (!env.BROWSER) return "Browser Offline.";
    let b = null;
    try {
        b = await puppeteer.launch(env.BROWSER);
        const p = await b.newPage();
        await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36');
        await p.goto(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });
        const eyesImg = await p.screenshot();
        await env.MEMORY_BUCKET.put(`agency/bots/${botId}/screenshot`, eyesImg);
        await p.waitForSelector('#video-title', { timeout: 8000 });
        const vids = await p.evaluate(() => {
            // @ts-ignore
            const items: any[] = Array.from(document.querySelectorAll('#video-title')).slice(0, 4);
            return items.map(i => `TITLE: ${i.innerText} URL: https://www.youtube.com${i.getAttribute('href')}`).join('\n');
        });
        await b.close();
        return vids || "No video links.";
    } catch (e) { if (b) await b.close(); return "YouTube error."; }
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
            // Treat tool results (system role) as 'user' role for Gemini context
            let role = m.role === 'assistant' ? 'model' : 'user';

            // Skip the base system message as it goes to systemInstruction
            if (m.role === 'system' && m.content === systemMsg) return;

            // Start with user requirement
            if (contents.length === 0 && role === 'model') return;

            if (contents.length > 0 && contents[contents.length - 1].role === role) {
                contents[contents.length - 1].parts[0].text += "\n" + m.content;
            } else {
                contents.push({ role, parts: [{ text: m.content }] });
            }
        });

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemMsg }] },
                contents: contents,
                generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
            })
        });

        const data = await res.json() as any;
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (e) {
        return "";
    }
}
