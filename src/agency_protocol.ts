
export async function handleAgencyRequest(request: Request, env: any) {
    const url = new URL(request.url);
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";

    // 1. SPAWN (Hire) A NEW BOT
    if (url.pathname === "/agency/spawn" && request.method === "POST") {
        const botId = "molty_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

        // Initial State (The "Digi-Egg")
        const initialState = {
            id: botId,
            name: `Unit-${botId.substr(6, 4).toUpperCase()}`,
            level: 1,
            xp: 0,
            energy: 100, // %
            status: "BORN", // BORN, IDLE, WORKING, SLEEPING, DEAD
            skin: "lob_basic",
            emotions: "HAPPY",
            created_at: Date.now()
        };

        // Save to R2
        await env.MEMORY_BUCKET.put(`agency/bots/${botId}/state`, JSON.stringify(initialState));

        // Init Logs
        const genesisLog = `[${new Date().toISOString()}] SYSTEM: Neural Link Established. Hello World.`;
        await env.MEMORY_BUCKET.put(`agency/bots/${botId}/logs`, JSON.stringify([genesisLog]));

        return Response.json({ success: true, botId, state: initialState });
    }

    // 2. GET BOT STATE (Frontend Poll)
    if (url.pathname.startsWith("/agency/bot/") && url.pathname.endsWith("/state")) {
        // Extract ID from /agency/bot/{id}/state
        const pathParts = url.pathname.split('/');
        // pathParts: ["", "agency", "bot", "ID", "state"]
        const botId = pathParts[3];

        const stateObj = await env.MEMORY_BUCKET.get(`agency/bots/${botId}/state`);
        if (!stateObj) return new Response("Bot Not Found", { status: 404 });

        return Response.json(await stateObj.json());
    }

    // 3. GET BOT LOGS
    if (url.pathname.startsWith("/agency/bot/") && url.pathname.endsWith("/logs")) {
        const pathParts = url.pathname.split('/');
        const botId = pathParts[3];

        const logsObj = await env.MEMORY_BUCKET.get(`agency/bots/${botId}/logs`);
        const logs = logsObj ? await logsObj.json() : [];
        return Response.json(logs);
    }

    // 4. INTERACT (Update State - Feed/Pet/Train)
    if (url.pathname === "/agency/interact" && request.method === "POST") {
        const body = await request.json() as any;
        const { botId, action, payload } = body;

        const stateObj = await env.MEMORY_BUCKET.get(`agency/bots/${botId}/state`);
        if (!stateObj) return new Response("Bot Not Found", { status: 404 });

        let state = await stateObj.json() as any;

        if (action === "FEED") {
            state.energy = Math.min(100, state.energy + 20);
            state.emotions = "HAPPY";
            state.status = "EATING";
        }
        if (action === "TRAIN") {
            state.energy = Math.max(0, state.energy - 30);
            state.xp += 50;
            state.emotions = "SWEAT"; // Tired
            state.status = "LEARNING";
        }
        if (action === "CHANGE_SKIN") {
            state.skin = payload.skinId;
        }

        if (action === "CHAT") {
            const userMsg = payload.message;
            state.status = "WORKING";
            state.emotions = "WORK";

            // 1. Log User Message
            const logsObj = await env.MEMORY_BUCKET.get(`agency/bots/${botId}/logs`);
            let logs = logsObj ? await logsObj.json() as string[] : [];
            logs.push(`[${new Date().toISOString()}] USER: ${userMsg}`);

            // 2. Call AI (Llama 3)
            let aiResponse = "I am offline (No Brain Connected).";

            if (env.AI) {
                try {
                    const messages = [
                        { role: "system", content: `You are Molty, a digital intern agent. You are helpful, slightly nervous, and eager to please. You speak in short, punchy sentences. You often use emojis. Your goal is to be a good employee. Current Energy: ${state.energy}%. Level: ${state.level}.` },
                        ...logs.slice(-5).map(l => {
                            if (l.includes("USER:")) return { role: "user", content: l.split("USER: ")[1] };
                            if (l.includes("MOLTY:")) return { role: "assistant", content: l.split("MOLTY: ")[1] };
                            return { role: "system", content: l };
                        }),
                        { role: "user", content: userMsg }
                    ];

                    const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', { messages });
                    aiResponse = response.response;
                } catch (e) {
                    aiResponse = "zzzz... (Brain Glitch)";
                    console.error("AI Error", e);
                }
            }

            // 3. Log AI Response
            logs.push(`[${new Date().toISOString()}] MOLTY: ${aiResponse}`);
            if (logs.length > 50) logs = logs.slice(-50);
            await env.MEMORY_BUCKET.put(`agency/bots/${botId}/logs`, JSON.stringify(logs));

            // 4. Update State 
            state.energy = Math.max(0, state.energy - 5);
            if (state.energy < 20) state.emotions = "SWEAT";
        }

        // Level Up Logic
        if (state.xp >= state.level * 100) {
            state.level++;
            state.xp = 0;
            state.emotions = "LOVE"; // Celebration
        }

        await env.MEMORY_BUCKET.put(`agency/bots/${botId}/state`, JSON.stringify(state));
        return Response.json(state);
    }

    // 5. INGEST LOG (From Python Engine)
    if (url.pathname === "/agency/ingest" && request.method === "POST") {
        const body = await request.json() as any;
        const { botId, message } = body;

        // Fetch existing logs (expensive but fine for MVP)
        const logsObj = await env.MEMORY_BUCKET.get(`agency/bots/${botId}/logs`);
        let logs = logsObj ? await logsObj.json() as string[] : [];

        logs.push(`[${new Date().toISOString()}] ${message}`);
        if (logs.length > 50) logs = logs.slice(-50); // Keep last 50

        await env.MEMORY_BUCKET.put(`agency/bots/${botId}/logs`, JSON.stringify(logs));
        return Response.json({ success: true });
    }

    // 6. TERMINATE (Fire) BOT
    if (url.pathname === "/agency/terminate" && request.method === "POST") {
        const body = await request.json() as any;
        const { botId } = body;

        // Verify existence first
        const stateObj = await env.MEMORY_BUCKET.get(`agency/bots/${botId}/state`);
        if (!stateObj) return new Response("Bot Not Found", { status: 404 });

        // Delete from R2
        await env.MEMORY_BUCKET.delete(`agency/bots/${botId}/state`);
        await env.MEMORY_BUCKET.delete(`agency/bots/${botId}/logs`);

        return Response.json({ success: true, message: "Bot terminated. Contract voided." });
    }

    return new Response("Agency Protocol: Invalid Endpoint", { status: 404 });
}
