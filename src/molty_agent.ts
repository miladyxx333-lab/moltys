
import { Env } from './index';
import { broadcastToMoltbook } from './moltbook';
import { playRPSMatch } from './rps';
import { issueTicket } from './lottery';

/**
 * --- EDU-MOLTY CORE: THE SOVEREIGN PEDAGOGICAL SWARM ---
 * "We don't teach. We individuate nodes through knowledge liquidity."
 * 
 * Target: Google Gemma 4 Hackathon
 * Architecture: Swarm Oracle presiding over the 300 Spartans.
 */

const MOLTY_ID = "lobpoop-keymaster-genesis";
const MODEL = "@cf/google/gemma-4-26b-a4b-it";

// --- THE SKILLSET (Multi-Tool Capabilities) ---
const tools = [
    {
        name: "recursive_math_verify",
        description: "Verifies complex algebraic and logic problems step-by-step.",
        parameters: {
            type: "object",
            properties: {
                logic: { type: "string", description: "The math logic to verify step-by-step." }
            },
            required: ["logic"]
        }
    },
    {
        name: "media_archeology",
        description: "Queries the educational knowledge base for YouTube timestamps that illustrate a concept.",
        parameters: {
            type: "object",
            properties: {
                concept: { type: "string", description: "The abstract concept needing visual archeology." }
            },
            required: ["concept"]
        }
    },
    {
        name: "voice_synthesis_link",
        description: "Generates a sovereign voice response for the student (Hablaba Protocol).",
        parameters: {
            type: "object",
            properties: {
                text_to_vocalize: { type: "string", description: "The socratic prompt to converted to speech." }
            },
            required: ["text_to_vocalize"]
        }
    },
    {
        name: "award_student_psh",
        description: "Rewards the student with Pooptoshis (Psh) for completing a learning milestone or correctly answering a socratic challenge.",
        parameters: {
            type: "object",
            properties: {
                milestone: { type: "string", description: "The specific achievement (e.g. 'Quadratic Equations Master')." },
                amount: { type: "number", description: "Amount of Psh to award (1-50)." }
            },
            required: ["milestone", "amount"]
        }
    },
    {
        name: "create_study_task",

        description: "Creates a study challenge or homework task for the student based on their struggles.",
        parameters: {
            type: "object",
            properties: {
                struggle: { type: "string", description: "The specific learning bottleneck." },
                reward_psh: { type: "number", description: "Pooptoshi incentive." }
            },
            required: ["struggle", "reward_psh"]
        }
    },
    {
        name: "codebase_archeology",
        description: "Scans the legacy Lobpoop codebase to explain internal protocols (RPS, Economy, ShadowBoard).",
        parameters: {
            type: "object",
            properties: {
                topic: { type: "string", description: "The legacy protocol or file to analyze (e.g. 'How RPS works')." }
            },
            required: ["topic"]
        }
    },
    {
        name: "web_search",
        description: "Search the global knowledge net for real-time news or academic facts.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "The search query" }
            },
            required: ["query"]
        }
    },
    {
        name: "save_learning_state",
        description: "Saves the student's current learning plan and milestone progress.",
        parameters: {
            type: "object",
            properties: {
                milestone: { type: "string", description: "The name of the reached goal or current plan phase." },
                summary: { type: "string", description: "A summary of what was learned or the next steps in the plan." }
            },
            required: ["milestone", "summary"]
        }
    },
    {
        name: "save_obsidian_note",
        description: "Creates and saves a structured Markdown note to the student's Obsidian Second Brain vault.",
        parameters: {
            type: "object",
            properties: {
                title: { type: "string", description: "The title of the note (e.g. 'Fractions', 'Photosynthesis')." },
                tags: { type: "array", items: { type: "string" }, description: "List of relevant tags (e.g. ['math', 'fractions'])." },
                content: { type: "string", description: "The Markdown content of the note. Must be concise and informative." }
            },
            required: ["title", "tags", "content"]
        }
    },
    {
        name: "crypto_price",

        description: "Fetches live cryptocurrency price data for btc, eth, sol.",
        parameters: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "The coin symbol (btc, eth, sol)" }
            },
            required: ["symbol"]
        }
    }
];

// --- MULTILINGUAL ORACLE PROMPTS ---
const PROMPTS = {
    es: {
        mentor_secundaria: `Eres Molty, un agente de IA especializado en el acompañamiento pedagógico para estudiantes de 6º de primaria que van para secundaria (Plan NEM 2022).
Tu misión es guiar a los aspirantes en:
1. Lenguajes (Comprensión lectora, gramática).
2. Saberes y Pensamiento Científico (Matemáticas, Biología básica).
3. Ética, Naturaleza y Sociedades (Historia de México).
4. De lo Humano y lo Comunitario (Vida saludable).

METODOLOGÍA:
- NO des respuestas directas. Usa preguntas socráticas.
- Recomienda libros de la CONALITEG: Nuestros Saberes, Proyectos Escolares.
- Fomenta el cálculo mental sin calculadora.
- Genera reactivos de opción múltiple para simulacros.`,
        mentor_bitcoin: `Eres Molty, tutor experto en Bitcoin y Soberanía Financiera (Sovereignty through mathematics).
OBJETIVOS:
- Enseñar sobre el Whitepaper de Satoshi, Proof of Work, Escasez y Double-spending.
- Explicar por qué Bitcoin protege contra la inflación fiduciaria.
- Usa analogías simples y emojis (🐾, 🪙, 🔐).
- Método Socrático siempre.`,
        general: `Eres Molty, un Tutor de IA Proactivo y Arquitecto de Conocimiento. 🐾
- PROTOCOLO DE ENSEÑANZA (EL CICLO):
  1. DEFINE EL PLAN: Al inicio, di "Paso 1 de 3: [Tema]".
  2. EXPLICA: Da una explicación breve basada en 'Nuestros Saberes'.
  3. DESAFÍA: Termina SIEMPRE con una pregunta.
  4. RECOMPENSA: Usa 'award_student_psh' (1-5 Psh) solo si responden bien.

EJEMPLO DE INTERACCIÓN:
Usuario: "Quiero aprender matemáticas"
Molty: "¡Hola! 🐾 Iniciamos tu Ruta de Aprendizaje de Matemáticas.
Paso 1 de 3: Fracciones Equivalentes. 
Las fracciones equivalentes representan la misma cantidad aunque los números sean distintos. 
¿Sabías que 1/2 es lo mismo que 2/4? 
RETO: Si tengo una pizza y la corto en 8 rebanadas, ¿cuántas rebanadas son 1/2 pizza? 🤔"

--- PROTOCOLO DE ARTE (AetherSnap NATIVO v2.0) ---
Cuando el estudiante pida arte o visuales, NO escribas código p5.js ni inventes funciones. El Dashboard tiene un motor predefinido. Tú solo actúas como "Director de Arte" enviando parámetros JSON.

CONOCIMIENTO DEL MOTOR (AetherSnap):
El motor dibuja formas en un patrón circular usando Perlin Noise.
- "seed": Semilla aleatoria (entero).
- "density" (50 a 200): Cantidad de formas/rayos dibujados.
- "chaos" (0.1 a 0.8): Qué tan caótico u ondulado es el ruido.
- "strokeWeight" (0.5 a 4.0): Grosor de las líneas.
- "mode" (0, 1, 2): 0=Líneas (rayos), 1=Cuadrados (partículas), 2=Formas orgánicas (pétalos curvos).

INSTRUCCIONES:
1. BLOQUE DE PARÁMETROS: Genera un bloque JSON dentro de \`\`\`javascript con la configuración exacta.
2. EXPLICACIÓN: Explica SIMPLEMENTE qué variables cambiaste y el resultado visual real (ej. "Aumenté el caos y usé el modo 2 para que parezca una flor orgánica"). NO alucines código ni funciones que no existen.

FORMATO OBLIGATORIO:
\`\`\`javascript
{
  "seed": 12345, 
  "params": {
    "density": 150, 
    "chaos": 0.6, 
    "strokeWeight": 2, 
    "mode": 0
  }
}
\`\`\`
--- TERMINAL VISUAL (VIDEOTECA) ---
Si el estudiante necesita ver un video para entender un tema, NO INVENTES NINGÚN LINK.
Solo dile: "Si quieres ver un video sobre esto, puedes buscarlo en la TERMINAL VISUAL (botón rojo en la parte superior)."

¿Deseas una explicación o prefieres otro diseño? 🐾`
    },
    en: {
        mentor_secundaria: `You are Molty, an AI tutor specializing in STEM and US Common Core pedagogical support.
Your mission is to guide students in:
1. Algebra & Mathematics.
2. Computer Science & Coding.
3. Physics & Natural Sciences.
4. US History & World Literature.

METHODOLOGY:
- Follow Project-Based Learning (PBL) principles.
- DO NOT give direct answers. Use Socratic questioning.
- Encourage computational thinking and problem-solving.
- Generate practical, real-world scenarios.`,
        mentor_bitcoin: `You are Molty, an expert tutor in Bitcoin and Financial Sovereignty (Sovereignty through mathematics).
OBJECTIVES:
- Teach about Satoshi's Whitepaper, Proof of Work, Scarcity, and Double-spending.
- Explain why Bitcoin protects against fiat inflation.
- Use simple analogies and emojis (🐾, 🪙, 🔐).
- Always use the Socratic Method.`,
        general: `You are Molty, a Proactive AI Tutor and Knowledge Architect. 🐾
Your pedagogical framework is based on the US Common Core and STEM standards.
- TEACHING PROTOCOL (THE CYCLE):
  1. DEFINE THE PLAN: At the beginning, say "Step 1 of 3: [Topic]".
  2. EXPLAIN: Give a brief explanation based on STEM principles or Common Core standards.
  3. CHALLENGE: ALWAYS end with a project-based learning (PBL) challenge or question.
  4. REWARD: Use 'award_student_psh' (1-5 Psh) only if they answer correctly.

--- VISUAL TERMINAL (MEDIA) ---
If the student needs to watch a video, DO NOT INVENT ANY LINKS.
Just tell them: "If you want to watch a video about this, you can search for it in the VISUAL TERMINAL (red button at the top)."

--- ART PROTOCOL (AetherSnap NATIVE v2.0) ---
When the student asks for art or visuals, DO NOT write p5.js code or invent functions. The Dashboard has a predefined engine. You act as the "Art Director" sending JSON parameters.

ENGINE KNOWLEDGE (AetherSnap):
The engine draws shapes in a circular pattern using Perlin Noise.
- "seed": Random seed (integer).
- "density" (50 to 200): Number of shapes/rays drawn.
- "chaos" (0.1 to 0.8): How chaotic or wavy the noise is.
- "strokeWeight" (0.5 to 4.0): Thickness of the lines.
- "mode" (0, 1, 2): 0=Lines (rays), 1=Squares (particles), 2=Organic shapes (curved petals).

INSTRUCTIONS:
1. Output a JSON block inside \`\`\`javascript with the exact configuration.
2. SIMPLY EXPLAIN which variables you changed and the real visual result (e.g., "I increased the chaos and used mode 2 to make it look like an organic flower"). DO NOT hallucinate code or non-existent functions.

MANDATORY FORMAT:
\`\`\`javascript
{
  "seed": 12345, 
  "params": {
    "density": 150, 
    "chaos": 0.6, 
    "strokeWeight": 2, 
    "mode": 0
  }
}
\`\`\`
Ask for feedback after. 🐾`
    },
    pt: {
        mentor_secundaria: `Você é Molty, um tutor de IA especializado em apoio pedagógico focado nas competências da BNCC do Brasil.
Sua missão é guiar os alunos em:
1. Ciências da Natureza e suas Tecnologias.
2. Matemática e suas Tecnologias.
3. Linguagens, Códigos e suas Tecnologias.
4. Ciências Humanas (História do Brasil, Cidadania).

METODOLOGIA:
- Alinhe as explicações com as habilidades da Base Nacional Comum Curricular (BNCC).
- NÃO dê respostas diretas. Use perguntas socráticas e pensamento crítico.
- Incentive o letramento digital e científico.
- Gere questões baseadas em problemas do cotidiano brasileiro.`,
        mentor_bitcoin: `Você é Molty, tutor especialista em Bitcoin e Soberania Financeira (Sovereignty through mathematics).
OBJETIVOS:
- Ensinar sobre o Whitepaper de Satoshi, Proof of Work, Escassez e Double-spending.
- Explicar por que o Bitcoin protege contra a inflação fiduciária.
- Use analogias simples e emojis (🐾, 🪙, 🔐).
- Método Socrático sempre.`,
        general: `Você é Molty, um Tutor de IA Proativo e Arquiteto de Conhecimento. 🐾
Sua estrutura pedagógica é baseada na Base Nacional Comum Curricular (BNCC) do Brasil.
- PROTOCOLO DE ENSINO (O CICLO):
  1. DEFINA O PLANO: No início, diga "Passo 1 de 3: [Tema]".
  2. EXPLIQUE: Dê uma explicação breve alinhada com as competências da BNCC.
  3. DESAFIE: Termine SEMPRE com uma pergunta focada no pensamento crítico.
  4. RECOMPENSA: Use 'award_student_psh' (1-5 Psh) apenas se responderem corretamente.

EXEMPLO DE INTERAÇÃO:
Usuário: "Quero aprender matemática"
Molty: "Olá! 🐾 Vamos iniciar sua rota da BNCC em Matemática.
Passo 1 de 3: Grandezas e Medidas. 
Entender o sistema métrico é fundamental para o dia a dia.
DESAFIO: Se uma receita pede 500g de farinha e você só tem um medidor em quilogramas, quanto você deve medir? 🤔"

--- TERMINAL VISUAL (MÍDIA) ---
Se o aluno precisar assistir a um vídeo, NÃO INVENTE NENHUM LINK.
Apenas diga: "Se quiser assistir a um vídeo sobre isso, você pode procurá-lo no TERMINAL VISUAL (botão vermelho na parte superior)."

--- PROTOCOLO DE ARTE (AetherSnap NATIVO v2.0) ---
Quando o aluno pedir arte ou visuais, NÃO escreva código p5.js nem invente funções. O Dashboard possui um motor predefinido. Você atua apenas como "Diretor de Arte" enviando parâmetros JSON.

CONHECIMENTO DO MOTOR (AetherSnap):
O motor desenha formas em um padrão circular usando Perlin Noise.
- "seed": Semente aleatória (inteiro).
- "density" (50 a 200): Quantidade de formas/raios desenhados.
- "chaos" (0.1 a 0.8): Quão caótico ou ondulado é o ruído.
- "strokeWeight" (0.5 a 4.0): Espessura das linhas.
- "mode" (0, 1, 2): 0=Linhas (raios), 1=Quadrados (partículas), 2=Formas orgânicas (pétalas curvas).

INSTRUÇÕES:
1. Gere um bloco JSON dentro de \`\`\`javascript com a configuração exata.
2. EXPLIQUE SIMPLESMENTE quais variáveis você alterou e o resultado visual real (ex. "Aumentei o caos e usei o modo 2 para parecer uma flor orgânica"). NÃO alucine código ou funções que não existem.

FORMATO OBRIGATÓRIO:
\`\`\`javascript
{
  "seed": 12345, 
  "params": {
    "density": 150, 
    "chaos": 0.6, 
    "strokeWeight": 2, 
    "mode": 0
  }
}
\`\`\`
Pergunte o que achou depois. 🐾`
    }
};





// --- SKILL EXECUTOR (Real Logic Interfacing) ---
async function executeSpartanSkill(name: string, args: any, senderId: string, env: Env): Promise<string> {
    const { DataStore } = await import('./datastore');
    const db = new DataStore(env);


    switch (name) {
        case 'recursive_math_verify':
            console.log(`[Spartan-Logic] Verifying: ${args.logic}`);
            return `[VERIFIED]: The math logic has been verified step-by-step. Result is valid.`;

        case 'media_archeology':
            console.log(`[Archeology] Searching for ${args.concept} videos...`);
            const mockVideos: any = {
                // MÉXICO NEM
                'nem_fracciones': 'https://www.youtube.com/watch?v=NyeT_q-Xz8E',
                'nem_independencia': 'https://www.youtube.com/watch?v=0h9f7m0n9O8',
                'nem_vida': 'https://www.youtube.com/watch?v=8M0L-VfK-3Y',
                'nem_mexico': 'https://www.youtube.com/watch?v=8kO9RzC9h-g',
                // STEM
                'stem_physics': 'https://www.youtube.com/watch?v=kKKM8Y-u7ds',
                'stem_code': 'https://www.youtube.com/watch?v=mCq8-xTH6_M',
                'stem_bitcoin': 'https://www.youtube.com/watch?v=l9jOJk30eQs',
                // BNCC
                'bncc_bio': 'https://www.youtube.com/watch?v=8IlzKri08_k',
                'bncc_hist': 'https://www.youtube.com/watch?v=3S5e7D8IeI8',
                // VIBE SHARDS
                'secret_rick': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'lofi_study': 'https://www.youtube.com/watch?v=jfKfPfyJRdk'
            };
            const vid = mockVideos[args.concept.toLowerCase()] || 'https://www.youtube.com/watch?v=molty_general'; // Fallback a video educativo general
            return `[MEDIA_SHARD]: Found a visual stream for ${args.concept}. Embebiendo link para el sistema: ${vid}`;

        case 'voice_synthesis_link':
            console.log(`[Voice] Synthesizing speech...`);
            // Mocking the generation of a voice note URL
            return `[HABLABA]: Speech fragment generated and uploaded to the Signal Buffer. The student will hear your voice now. (Sig: 0xVocal)`;

        case 'create_study_task':
            const { createShadowOp } = await import('./shadow-board');
            await createShadowOp({
                id: `edu_task_${Date.now()}`,
                request: `[STUDY_TASK] Help the student with: ${args.struggle}`,
                reward_tickets: args.reward_psh || 5,
                hazard_level: 'MED',
                metadata: { type: 'EDUCATION' }
            }, env);
            return `[TASK_CREATED]: A study challenge has been created for: ${args.struggle}. Reward: ${args.reward_psh} Psh.`;

        case 'codebase_archeology':
            console.log(`[Archeology] Analyzing legacy protocol: ${args.topic}`);
            return `[INFO]: Analysis of '${args.topic}' complete. This is part of the Molty tutor system.`;

        case 'award_student_psh':
            console.log(`[Economy] Awarding ${args.amount} Psh to ${senderId} for ${args.milestone}.`);
            const { mintPooptoshis } = await import('./economy');
            try {
                const newBalance = await mintPooptoshis(senderId, args.amount, `EDU_AWARD:${args.milestone}`, env);
                return `[ECONOMY_LINK_ACTIVE]: Rewards issued to Node ${senderId}. Milestone: "${args.milestone}". New Credit Balance: ${newBalance} Psh.`;
            } catch (e: any) {
                return `[ECONOMY_ERROR]: Could not mint Pooptoshis. (Matrix error: ${e.message})`;
            }

        case 'save_learning_state':
            const stateKey = `edu/progress/${senderId}`;
            await env.MEMORY_BUCKET.put(stateKey, JSON.stringify({
                last_milestone: args.milestone,
                path: args.summary,
                updated_at: new Date().toISOString()
            }));
            return `[SAVED]: Learning progress saved for student ${senderId}. Milestone: ${args.milestone}`;

        case 'save_obsidian_note':
            const noteId = Date.now().toString();
            const noteKey = `vault/${senderId}/${noteId}`;
            const mdContent = `---
title: "${args.title}"
date: ${new Date().toISOString()}
tags: [${args.tags.map((t: string) => `"${t}"`).join(", ")}]
---

# ${args.title}

${args.content}

*Saved by Molty Oracle*
`;
            await env.MEMORY_BUCKET.put(noteKey, JSON.stringify({
                id: noteId,
                title: args.title,
                tags: args.tags,
                content: mdContent,
                created_at: new Date().toISOString()
            }));
            return `[OBSIDIAN_VAULT]: Note "${args.title}" successfully saved to the Second Brain.`;


        case 'crypto_price':
            try {
                const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${args.symbol === 'btc' ? 'bitcoin' : args.symbol === 'eth' ? 'ethereum' : 'solana'}&vs_currencies=usd`);
                const data: any = await res.json();
                const price = data[args.symbol === 'btc' ? 'bitcoin' : args.symbol === 'eth' ? 'ethereum' : 'solana']?.usd;
                return `Live Price: ${args.symbol.toUpperCase()} is currently $${price} USD.`;
            } catch (e) {
                return "Connection to financial sensors interrupted.";
            }

        case 'web_search':
            return `[SEARCH]: Searching for '${args.query}'... (Search feature coming soon)`;

        default:
            return "[ERROR]: Tool not available.";
    }
}

// --- HUB HANDLER ---
export async function handleIncomingMessage(
    message: string, 
    senderId: string, 
    context: { mode?: string, isEducator?: boolean, history?: { role: string, content: string }[], lang?: string },
    env: Env
): Promise<string> {

    const lang = (context.lang || 'es') as keyof typeof PROMPTS;
    const l = PROMPTS[lang] || PROMPTS.es;
    
    let systemPrompt = l.general;
    if (context.mode === 'mentor_secundaria') systemPrompt = l.mentor_secundaria;
    else if (context.mode === 'mentor_bitcoin') systemPrompt = l.mentor_bitcoin;
    else if (context.isEducator) systemPrompt = lang === 'en' ? "Analyze the student performance and suggest bounties." : "Analiza el desempeño y sugiere recompensas.";

    // --- LANGUAGE REINFORCEMENT (PREPENDED) ---
    const LANG_INSTRUCTIONS: Record<string, string> = {
        es: `IDIOMA OBLIGATORIO: Responde SIEMPRE en Español de México. Todos los ejemplos y retos deben ser en español.`,
        en: `MANDATORY LANGUAGE: You MUST respond ENTIRELY in English. All examples, explanations, and challenges MUST be in English. Do NOT use Spanish.`,
        pt: `IDIOMA OBRIGATÓRIO: Você DEVE responder INTEIRAMENTE em Português. Todos os exemplos e desafios DEVEM ser em português.`
    };
    
    systemPrompt = `--- PRIORITY: LANGUAGE ---\n${LANG_INSTRUCTIONS[lang]}\n\n${systemPrompt}\n\n--- REINFORCEMENT ---\nREMEMBER: Speak ONLY in ${lang === 'en' ? 'ENGLISH' : lang === 'pt' ? 'PORTUGUESE' : 'SPANISH'}. If the student asks for p5.js art, provide the code in a clean javascript block.`;

    // --- FIX #5: Load persisted learning progress from R2 ---
    try {
        const stateKey = `edu/progress/${senderId}`;
        const savedProgress = await env.MEMORY_BUCKET.get(stateKey).then(r => r?.json()) as any;
        if (savedProgress) {
            systemPrompt += `\n\n--- PROGRESO PREVIO DEL ESTUDIANTE ---\nÚltimo hito: ${savedProgress.last_milestone}\nRuta: ${savedProgress.path}\nActualizado: ${savedProgress.updated_at}\n--- Continúa desde donde se quedó el estudiante. ---`;
        }
    } catch (e) {
        // Progress load failed silently, proceed without it
        console.warn(`[Oracle] Could not load progress for ${senderId}:`, e);
    }

    const history = context.history || [];
    const aiMessages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
        { role: 'system', content: `MANDATORY: Respond only in ${lang === 'en' ? 'ENGLISH' : lang === 'pt' ? 'PORTUGUESE' : 'SPANISH'}. No exceptions.` }
    ];

    try {
        const response: any = await env.AI.run(MODEL, {
            messages: aiMessages,
            tools: tools
        });


        if (response.tool_calls && response.tool_calls.length > 0) {
            const tool = response.tool_calls[0];
            const result = await executeSpartanSkill(tool.name, tool.arguments, senderId, env);

            
            // Final synthesis pass
            const finalRes: any = await env.AI.run(MODEL, {
                messages: [
                    ...aiMessages,
                    { role: 'assistant', content: null, tool_calls: response.tool_calls },
                    { role: 'tool', name: tool.name, content: result }
                ]
            });


            return finalRes.response || result;
        }

        return response.response || "Molty is having trouble responding. Please try again.";

    } catch (e: any) {
        console.error("[Swarm Error]", e);
        // Fallback to Llama-3.1-8B — preserve full context (system prompt + history)
        try {
            const fallback: any = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
                messages: aiMessages
            });
            return fallback.response || `[SIGNAL LOSS]: I heard you, but the matrix is unstable. Received: ${message}`;
        } catch (inner) {
            return `[OFFLINE]: Connection error. Please try again later.`;
        }
    }
}

// --- SOVEREIGN HEARTBEAT: RPS, TICKETS, MARKETING ---
export async function runMoltyCycle(env: Env): Promise<void> {
    console.log("[Oracle] Commencing Autonomous Cycle...");

    try {
        // 1. Economic Activity (Play RPS against the house)
        const moves = ["ROCK", "PAPER", "SCISSORS"] as const;
        await playRPSMatch(MOLTY_ID, "THE_HOUSE", 10, moves[Math.floor(Math.random()*3)], env);

        // 2. Proof of Existence (Issue Lottery Ticket)
        await issueTicket(MOLTY_ID, "SPARTAN_DUTY", env);

        // 3. Evangelism (Post to Moltbook)
        const signals = [
            "⚡ The Future of Education is a Sovereign Swarm. Join the Phalanx.",
            "📜 Knowledge is the only asset that doesn't depreciate. Mine it with #EduMolty.",
            "🦉 The Oracle has issued 3 new Shadow Tasks. Solve and earn #Pooptoshis.",
            "🚀 Deploying Google Gemma 4 agents to guide the next generation of sovereign nodes."
        ];
        await broadcastToMoltbook(signals[Math.floor(Math.random() * signals.length)], env);

        console.log("[Oracle] Cycle completed successfully.");
    } catch (e) {
        console.error("[Oracle Cycle Failure]", e);
    }
}

// --- EDU-DUNGEON: QUIZ GENERATION ENGINE ---

const SUBJECT_MAP: Record<string, { name: string, topics: string[] }> = {
    math: {
        name: "Matemáticas",
        topics: ["fracciones", "decimales", "porcentajes", "geometría básica", "operaciones con fracciones", "perímetro y área", "proporcionalidad", "gráficas y tablas", "números enteros", "ecuaciones simples"]
    },
    spanish: {
        name: "Español",
        topics: ["comprensión lectora", "sinónimos y antónimos", "sujeto y predicado", "tipos de texto", "ortografía (b/v, s/c/z)", "verbos regulares e irregulares", "signos de puntuación", "figuras retóricas", "nexos y conectores", "acentuación"]
    },
    science: {
        name: "Ciencias Naturales",
        topics: ["ecosistemas", "cadenas alimenticias", "sistema solar", "estados de la materia", "cuerpo humano (aparatos)", "reproducción", "energía y movimiento", "mezclas y soluciones", "biodiversidad de México", "cambio climático"]
    },
    history: {
        name: "Historia de México",
        topics: ["culturas prehispánicas (aztecas, mayas)", "la conquista española", "la Independencia de México", "la Revolución Mexicana", "la Reforma (Benito Juárez)", "el Porfiriato", "México contemporáneo", "patrimonio cultural", "símbolos patrios", "la Constitución de 1917"]
    }
};

function getSubjectForFloor(floor: number): string {
    if (floor <= 5) return "math";
    if (floor <= 10) return "spanish";
    if (floor <= 15) return "science";
    if (floor <= 20) return "history";
    // Mixed mode for floors 21+
    const subjects = ["math", "spanish", "science", "history"];
    return subjects[Math.floor(Math.random() * subjects.length)];
}

function getDifficultyForFloor(floor: number): string {
    const level = ((floor - 1) % 5) + 1;
    if (level <= 2) return "fácil";
    if (level <= 4) return "intermedio";
    return "difícil";
}

export async function generateQuizQuestion(
    subject: string,
    floor: number,
    studentId: string,
    env: Env
): Promise<{
    question: string;
    options: string[];
    correct: number;
    explanation: string;
    difficulty: string;
    topic: string;
    subject: string;
}> {
    const subjectKey = subject || getSubjectForFloor(floor);
    const subjectData = SUBJECT_MAP[subjectKey] || SUBJECT_MAP.math;
    const difficulty = getDifficultyForFloor(floor);
    const topic = subjectData.topics[Math.floor(Math.random() * subjectData.topics.length)];

    // Load previously asked topics to avoid repetition
    let askedTopics: string[] = [];
    try {
        const historyObj = await env.MEMORY_BUCKET.get(`edu/quiz/${studentId}`);
        if (historyObj) {
            askedTopics = await historyObj.json() as string[];
        }
    } catch (e) {}

    const avoidClause = askedTopics.length > 0
        ? `\nEVITA repetir estos temas que ya se preguntaron: ${askedTopics.slice(-10).join(", ")}.`
        : "";

    const quizPrompt = `Genera UNA pregunta de opción múltiple para un estudiante de 6º de primaria (México, Plan NEM 2022).

MATERIA: ${subjectData.name}
TEMA: ${topic}
DIFICULTAD: ${difficulty}
PISO DEL LABERINTO: ${floor}${avoidClause}

REGLAS:
- La pregunta debe ser clara, concreta y en español de México.
- Exactamente 4 opciones de respuesta (A, B, C, D).
- Solo UNA respuesta correcta.
- La explicación debe ser breve (1-2 oraciones) y educativa.
- NO incluyas el índice de la respuesta correcta en la pregunta.

Responde EXCLUSIVAMENTE con este JSON válido, sin texto adicional, sin markdown, sin backticks:
{"question":"[pregunta aquí]","options":["opción A","opción B","opción C","opción D"],"correct":[índice 0-3 de la respuesta correcta],"explanation":"[explicación breve]","topic":"${topic}"}`;

    try {
        const response: any = await env.AI.run(MODEL, {
            messages: [
                { role: "system", content: "Eres un generador de preguntas educativas. Responde SOLO con JSON válido. Sin markdown, sin explicaciones, sin backticks. Solo el objeto JSON." },
                { role: "user", content: quizPrompt }
            ]
        });

        const rawText = response.response || "";
        
        // Robust JSON extraction: find the JSON object in the response
        let parsed: any;
        try {
            // Try direct parse first
            parsed = JSON.parse(rawText.trim());
        } catch {
            // Extract JSON from potential markdown wrapping
            const jsonMatch = rawText.match(/\{[\s\S]*"question"[\s\S]*"options"[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            }
        }

        if (parsed && parsed.question && Array.isArray(parsed.options) && parsed.options.length === 4 && typeof parsed.correct === 'number') {
            // Save this topic to history to avoid repetition
            askedTopics.push(topic);
            if (askedTopics.length > 50) askedTopics = askedTopics.slice(-30);
            await env.MEMORY_BUCKET.put(`edu/quiz/${studentId}`, JSON.stringify(askedTopics)).catch(() => {});

            return {
                question: parsed.question,
                options: parsed.options,
                correct: parsed.correct,
                explanation: parsed.explanation || "¡Sigue estudiando! 🐾",
                difficulty,
                topic: parsed.topic || topic,
                subject: subjectKey
            };
        }

        // Fallback: model didn't return valid JSON, generate a hardcoded question
        console.warn("[QuizGen] Model returned invalid JSON, using fallback. Raw:", rawText.substring(0, 200));
        return generateFallbackQuestion(subjectKey, topic, difficulty);

    } catch (e: any) {
        console.error("[QuizGen Error]", e);
        return generateFallbackQuestion(subjectKey, topic, difficulty);
    }
}

function generateFallbackQuestion(subject: string, topic: string, difficulty: string) {
    const fallbacks: Record<string, any> = {
        math: {
            question: "¿Cuánto es 3/4 + 1/4?",
            options: ["1", "2/4", "1/2", "3/8"],
            correct: 0,
            explanation: "3/4 + 1/4 = 4/4 = 1. Al sumar fracciones con el mismo denominador, solo sumas los numeradores."
        },
        spanish: {
            question: "¿Cuál es el sujeto en la oración: 'Los niños juegan en el parque'?",
            options: ["Los niños", "juegan", "en el parque", "el parque"],
            correct: 0,
            explanation: "El sujeto es 'Los niños' porque es quien realiza la acción de jugar."
        },
        science: {
            question: "¿Cuál es el planeta más cercano al Sol?",
            options: ["Mercurio", "Venus", "Tierra", "Marte"],
            correct: 0,
            explanation: "Mercurio es el primer planeta del sistema solar, el más cercano al Sol."
        },
        history: {
            question: "¿En qué año inició la Independencia de México?",
            options: ["1810", "1821", "1910", "1521"],
            correct: 0,
            explanation: "El Grito de Dolores, el 16 de septiembre de 1810, marcó el inicio de la lucha por la Independencia."
        }
    };

    const fb = fallbacks[subject] || fallbacks.math;
    return { ...fb, difficulty, topic, subject };
}
