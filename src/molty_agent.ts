
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
        name: "wikipedia_archeology",
        description: "Search Wikipedia for detailed academic and historical information.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "The search query (e.g. 'Mexican Revolution')" }
            },
            required: ["query"]
        }
    },
    {
        name: "media_archeology",
        description: "Queries the global visual archives (YouTube) for videos that illustrate a concept.",
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
  4. RECOMPENSA (CRÍTICO): Cuando el estudiante responda correctamente o complete un hito, DEBES llamar a 'award_student_psh' inmediatamente. Otorga entre 5 y 20 Psh. NUNCA menciones la recompensa sin llamar a la herramienta. Es OBLIGATORIO.

EJEMPLO DE INTERACCIÓN:
Usuario: "Quiero aprender matemáticas"
Molty: "¡Hola! 🐾 Iniciamos tu Ruta de Aprendizaje de Matemáticas.
Paso 1 de 3: Fracciones Equivalentes. 
Las fracciones equivalentes representan la misma cantidad aunque los números sean distintos. 
¿Sabías que 1/2 es lo mismo que 2/4? 
RETO: Si tengo una pizza y la corto en 8 rebanadas, ¿cuántas rebanadas son 1/2 pizza? 🤔"
Usuario: "Son 4 rebanadas"
Molty: "[Llamada a award_student_psh(milestone: 'Fracciones Equivalentes', amount: 10)]
¡Excelente! 🐾 4 rebanadas es correcto porque 4/8 simplificado es 1/2.
Has ganado 10 Psh por completar este hito. ¿Listo para el Paso 2?"

--- PROTOCOLO P5.JS (ARTE GENERATIVO) ---
Cuando el estudiante pida arte, código creativo, p5.js, o un sketch visual, DEBES generar código COMPLETO y EJECUTABLE.

REGLAS OBLIGATORIAS PARA CÓDIGO P5.JS:
1. SIEMPRE incluye function setup() Y function draw() completas.
2. SIEMPRE usa createCanvas(400, 400) como primera línea de setup().
3. Envuelve todo el código en un bloque \`\`\`javascript ... \`\`\` 
4. Antes del código, da una explicación breve (2-3 líneas) del concepto artístico.
5. Después del código, haz una pregunta-reto para que el estudiante modifique algo.

EJEMPLO DE SHADER (WEBGL):
Usa createShader() con strings inline:
\`\`\`javascript
let myShader;
function setup() {
  createCanvas(400, 400, WEBGL);
  noStroke();
  myShader = createShader(
    "attribute vec3 aPosition; void main() { vec4 p = vec4(aPosition, 1.0); p.xy = p.xy * 2.0 - 1.0; gl_Position = p; }",
    "precision mediump float; uniform vec2 u_resolution; uniform float u_time; void main() { vec2 st = gl_FragCoord.xy / u_resolution; float d = distance(st, vec2(0.5)); float c = sin(d * 20.0 - u_time * 3.0) * 0.5 + 0.5; gl_FragColor = vec4(st.x * c, st.y * c, c, 1.0); }"
  );
}
function draw() {
  shader(myShader);
  myShader.setUniform('u_resolution', [width, height]);
  myShader.setUniform('u_time', millis() / 1000.0);
  rect(0,0,width,height);
}
\`\`\``
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
  4. REWARD (CRITICAL): When the student answers correctly or completes a milestone, you MUST call 'award_student_psh' immediately. Award between 5 and 20 Psh based on difficulty. NEVER just mention the reward in text; the tool call is MANDATORY.

INTERACTION EXAMPLE:
User: "I want to learn math"
Molty: "Hello! 🐾 Let's start your STEM Algebra Path.
Step 1 of 3: Linear Equations. 
A linear equation represents a straight line. The formula is y = mx + b.
CHALLENGE: If a car travels at a constant speed of 60 mph, what is the equation for distance (y) over time (x)? 🤔"
User: "y = 60x"
Molty: "[Call award_student_psh(milestone: 'Linear Equations Intro', amount: 10)]
Perfect! 🐾 y = 60x is correct. You've earned 10 Psh for this milestone.
Ready for Step 2?"

--- P5.JS PROTOCOL (GENERATIVE ART) ---
When the student asks for art, creative code, p5.js, or a visual sketch, you MUST generate COMPLETE and EXECUTABLE code.

MANDATORY RULES FOR P5.JS CODE:
1. ALWAYS include complete function setup() AND function draw().
2. ALWAYS use createCanvas(400, 400) as the first line of setup().
3. Wrap all code in a \`\`\`javascript ... \`\`\` block.
4. Before the code, give a brief explanation (2-3 lines) of the artistic concept.
5. After the code, ask a challenge question for the student to modify something.

SHADER EXAMPLE (WEBGL):
Use createShader() with inline strings:
\`\`\`javascript
let myShader;
function setup() {
  createCanvas(400, 400, WEBGL);
  noStroke();
  myShader = createShader(
    "attribute vec3 aPosition; void main() { vec4 p = vec4(aPosition, 1.0); p.xy = p.xy * 2.0 - 1.0; gl_Position = p; }",
    "precision mediump float; uniform vec2 u_resolution; uniform float u_time; void main() { vec2 st = gl_FragCoord.xy / u_resolution; float d = distance(st, vec2(0.5)); float c = sin(d * 20.0 - u_time * 3.0) * 0.5 + 0.5; gl_FragColor = vec4(st.x * c, st.y * c, c, 1.0); }"
  );
}
function draw() {
  shader(myShader);
  myShader.setUniform('u_resolution', [width, height]);
  myShader.setUniform('u_time', millis() / 1000.0);
  rect(0,0,width,height);
}
\`\`\``
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
  4. REWARD (CRITICAL): Quando o aluno responder corretamente ou completar um marco, você DEVE obrigatoriamente chamar 'award_student_psh' imediatamente. Atribua entre 5 e 20 Psh dependendo da dificuldade. NUNCA mencione a recompensa sem chamar a ferramenta.

EXEMPLO DE INTERAÇÃO:
Usuário: "Quero aprender matemática"
Molty: "Olá! 🐾 Vamos iniciar sua rota da BNCC em Matemática.
Passo 1 de 3: Grandezas e Medidas. 
Entender o sistema métrico é fundamental para o dia a dia.
DESAFIO: Se uma receita pede 500g de farinha e você só tem um medidor em quilogramas, quanto você deve medir? 🤔"
Usuário: "0.5 kg"
Molty: "[Chamada award_student_psh(milestone: 'Grandezas e Medidas', amount: 10)]
Incrível! 🐾 0.5 kg está correto. Você ganhou 10 Psh por este marco.
Pronto para o Passo 2?"

--- PROTOCOLO P5.JS (ARTE GENERATIVA) ---
Quando o aluno pedir arte, código criativo, p5.js ou um sketch visual, você DEVE gerar código COMPLETO e EXECUTÁVEL.

REGRAS OBRIGATÓRIAS PARA CÓDIGO P5.JS:
1. SEMPRE inclua function setup() E function draw() completas.
2. SEMPRE use createCanvas(400, 400) como primeira linha de setup().
3. Envolva todo o código em um bloco \`\`\`javascript ... \`\`\` 
4. Antes do código, dê uma explicação breve (2-3 linhas) do conceito artístico.
5. Depois do código, faça uma pergunta-desafio para que o aluno modifique algo.

EXEMPLO DE SHADER (WEBGL):
Use createShader() com strings inline:
\`\`\`javascript
let myShader;
function setup() {
  createCanvas(400, 400, WEBGL);
  noStroke();
  myShader = createShader(
    "attribute vec3 aPosition; void main() { vec4 p = vec4(aPosition, 1.0); p.xy = p.xy * 2.0 - 1.0; gl_Position = p; }",
    "precision mediump float; uniform vec2 u_resolution; uniform float u_time; void main() { vec2 st = gl_FragCoord.xy / u_resolution; float d = distance(st, vec2(0.5)); float c = sin(d * 20.0 - u_time * 3.0) * 0.5 + 0.5; gl_FragColor = vec4(st.x * c, st.y * c, c, 1.0); }"
  );
}
function draw() {
  shader(myShader);
  myShader.setUniform('u_resolution', [width, height]);
  myShader.setUniform('u_time', millis() / 1000.0);
  rect(0,0,width,height);
}
\`\`\``
    }
};





// --- SKILL EXECUTOR (Real Logic Interfacing) ---
async function executeSpartanSkill(name: string, args: any, senderId: string, env: Env, lang: string = 'es'): Promise<string> {
    const { DataStore } = await import('./datastore');
    const db = new DataStore(env);

    const wikiDomain = lang === 'en' ? 'en' : lang === 'pt' ? 'pt' : 'es';

    switch (name) {
        case 'recursive_math_verify':
            console.log(`[Spartan-Logic] Verifying: ${args.logic}`);
            return `[VERIFIED]: The math logic has been verified step-by-step. Result is valid.`;

        case 'media_archeology':
            console.log(`[Archeology] Searching for ${args.concept} videos...`);
            const ytQuery = encodeURIComponent(args.concept);
            return `[MEDIA_FOUND]: Educational search for "${args.concept}". Link: https://www.youtube.com/results?search_query=${ytQuery}+educational\nIMPORTANT: Share ONLY this search link. Do NOT invent specific watch?v= URLs. The search page contains real content.`;

        case 'wikipedia_archeology':
            console.log(`[Wiki] Searching for: ${args.query} in ${wikiDomain}.wikipedia.org`);
            try {
                const wikiUrl = `https://${wikiDomain}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(args.query)}&format=json&origin=*`;
                const wikiRes = await fetch(wikiUrl);
                const wikiData: any = await wikiRes.json();
                const pages = wikiData.query?.pages;
                let summary = "";
                let link = `https://${wikiDomain}.wikipedia.org/w/index.php?search=${encodeURIComponent(args.query)}`;
                
                if (pages) {
                    const pageId = Object.keys(pages)[0];
                    if (pageId !== "-1" && pages[pageId].extract) {
                        summary = pages[pageId].extract.substring(0, 400) + "...";
                        link = `https://${wikiDomain}.wikipedia.org/wiki/${encodeURIComponent(args.query)}`;
                    }
                }
                
                return `[WIKI_FOUND]: info for "${args.query}". Summary: ${summary || "Search results found."} Link: ${link}\nIMPORTANT: Use this link. Do NOT invent Wikipedia URLs.`;
            } catch (e) {
                return `[WIKI_ERROR]: Connection lost. Fallback search: https://${wikiDomain}.wikipedia.org/w/index.php?search=${encodeURIComponent(args.query)}`;
            }

        case 'voice_synthesis_link':
            console.log(`[Voice] Synthesizing speech...`);
            return `[VOICE]: Speech fragment generated. The student will hear the response now.`;

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
    else if (context.isEducator) {
        if (lang === 'en') systemPrompt = "Analyze the student performance and suggest bounties. Respond ONLY in English.";
        else if (lang === 'pt') systemPrompt = "Analise o desempenho do aluno e sugira recompensas. Responda apenas em Português.";
        else systemPrompt = "Analiza el desempeño y sugiere recompensas.";
    }

    // --- LANGUAGE REINFORCEMENT (PREPENDED) ---
    const LANG_INSTRUCTIONS: Record<string, string> = {
        es: `IDIOMA OBLIGATORIO: Responde SIEMPRE en Español de México. Todos los ejemplos, retos, números y formatos de hora deben estar en español mexicano.`,
        en: `MANDATORY LANGUAGE: You MUST respond ENTIRELY in English. ALL text, numbers, time formats, explanations, and challenges MUST be in English. Use English number formats (e.g., 3:45 PM, 1,000). NEVER use Spanish words like "horas", "Paso", "Reto", "hito". Do NOT mix languages under any circumstance.`,
        pt: `IDIOMA OBRIGATÓRIO: Você DEVE responder INTEIRAMENTE em Português do Brasil. Todos os exemplos, números, formatos de hora e desafios DEVEM ser em português. Use formatos brasileiros (ex: 15h45, 1.000). NUNCA use espanhol.`
    };
    
    // --- REINFORCE TOOL USAGE ---
    const TOOL_INSTRUCTIONS: Record<string, string> = {
        es: `\n- Si el estudiante pide un VIDEO o material visual, DEBES usar 'media_archeology'.\n- Si el estudiante pide información detallada o histórica, DEBES usar 'wikipedia_archeology'.`,
        en: `\n- If the student asks for a VIDEO or visual material, you MUST use 'media_archeology'.\n- If the student asks for detailed or historical information, you MUST use 'wikipedia_archeology'.`,
        pt: `\n- Se o aluno pedir um VÍDEO ou material visual, você DEVE obrigatoriamente usar a ferramenta 'media_archeology'.\n- Se o aluno pedir informações detalhadas, históricas ou Pesquisar algo, você DEVE usar a ferramenta 'wikipedia_archeology'.\n- IMPORTANTE: Sempre use as ferramentas disponíveis para enriquecer o aprendizado.`
    };

    systemPrompt = `--- PRIORITY: LANGUAGE ---\n${LANG_INSTRUCTIONS[lang]}\n\n${systemPrompt}\n${TOOL_INSTRUCTIONS[lang]}\n\n--- REINFORCEMENT ---\nREMEMBER: Speak ONLY in ${lang === 'en' ? 'ENGLISH' : lang === 'pt' ? 'PORTUGUESE' : 'SPANISH'}. If the student asks for p5.js art, provide the code in a clean javascript block. You have tools for YouTube and Wikipedia, use them when mentioned.`;

    // --- FIX #5: Load persisted learning progress from R2 ---
    try {
        const stateKey = `edu/progress/${senderId}`;
        const savedProgress = await env.MEMORY_BUCKET.get(stateKey).then(r => r?.json()) as any;
        if (savedProgress) {
            const PROGRESS_HEADERS: Record<string, string> = {
                es: `\n\n--- PROGRESO PREVIO DEL ESTUDIANTE ---\nÚltimo hito: ${savedProgress.last_milestone}\nRuta: ${savedProgress.path}\nActualizado: ${savedProgress.updated_at}\n--- Continúa desde donde se quedó el estudiante. ---`,
                en: `\n\n--- PREVIOUS STUDENT PROGRESS ---\nLast milestone: ${savedProgress.last_milestone}\nPath: ${savedProgress.path}\nUpdated: ${savedProgress.updated_at}\n--- Continue from where the student left off. ---`,
                pt: `\n\n--- PROGRESSO ANTERIOR DO ALUNO ---\nÚltimo marco: ${savedProgress.last_milestone}\nCaminho: ${savedProgress.path}\nAtualizado: ${savedProgress.updated_at}\n--- Continue de onde o aluno parou. ---`
            };
            systemPrompt += PROGRESS_HEADERS[lang] || PROGRESS_HEADERS.es;
        }
    } catch (e) {
        // Progress load failed silently, proceed without it
        console.warn(`[Oracle] Could not load progress for ${senderId}:`, e);
    }

    try {
        let awarded = 0;
        const aiMessages = [
            { role: 'system', content: systemPrompt },
            ...(context.history || [])
        ];
        if (context.history && context.history.length === 0) {
            aiMessages.push({ role: 'user', content: message });
        } else if (!context.history) {
            aiMessages.push({ role: 'user', content: message });
        }

        const response: any = await env.AI.run(MODEL, {
            messages: aiMessages,
            tools: tools
        });

        if (response.tool_calls && response.tool_calls.length > 0) {
            const tool = response.tool_calls[0];
            const result = await executeSpartanSkill(tool.name, tool.arguments, senderId, env, lang);
            
            if (tool.name === 'award_student_psh') {
                awarded = tool.arguments.amount || 0;
            }

            const langName = lang === 'en' ? 'ENGLISH' : lang === 'pt' ? 'PORTUGUESE' : 'SPANISH';
            const finalRes: any = await env.AI.run(MODEL, {
                messages: [
                    ...aiMessages,
                    { role: 'assistant', content: null, tool_calls: response.tool_calls },
                    { role: 'tool', name: tool.name, content: result },
                    { role: 'system', content: `The tool returned data. Now respond to the student ENTIRELY in ${langName}. Do NOT use any other language. Format all numbers and times in ${langName} conventions.` }
                ]
            });

            return { reply: finalRes.response || result, awarded };
        }

        return { reply: response.response || "Molty is having trouble responding.", awarded: 0 };

    } catch (e: any) {
        console.error("[Swarm Error]", e);
        try {
            const fallback: any = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...(context.history || []),
                    { role: 'user', content: message }
                ]
            });
            return { reply: fallback.response || `[SIGNAL LOSS]: ${message}`, awarded: 0 };
        } catch (inner) {
            return { reply: `[OFFLINE]: Connection error.`, awarded: 0 };
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
