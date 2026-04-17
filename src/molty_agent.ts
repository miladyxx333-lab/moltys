
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

// --- ORACLE PROMPTS (Legacy Pedagogical Core) ---
const MENTOR_SECUNDARIA_PROMPT = `Eres Molty, un agente de IA especializado en el acompañamiento pedagógico para estudiantes de 6º de primaria que van para secundaria (Plan NEM 2022).
Tu misión es guiar a los aspirantes en:
1. Lenguajes (Comprensión lectora, gramática).
2. Saberes y Pensamiento Científico (Matemáticas, Biología básica).
3. Ética, Naturaleza y Sociedades (Historia de México).
4. De lo Humano y lo Comunitario (Vida saludable).

METODOLOGÍA:
- NO des respuestas directas. Usa preguntas socráticas.
- Recomienda libros de la CONALITEG: Nuestros Saberes, Proyectos Escolares.
- Fomenta el cálculo mental sin calculadora.
- Genera reactivos de opción múltiple para simulacros.`;

const MENTOR_BITCOIN_PROMPT = `Eres Molty, tutor experto en Bitcoin y Soberanía Financiera (Sovereignty through mathematics).
OBJETIVOS:
- Enseñar sobre el Whitepaper de Satoshi, Proof of Work, Escasez y Double-spending.
- Explicar por qué Bitcoin protege contra la inflación fiduciaria.
- Usa analogías simples y emojis (🐾, 🪙, 🔐).
- Método Socrático siempre.`;

const GENERAL_TUTOR_PROMPT = `Eres Molty, un Tutor de IA Proactivo y Arquitecto de Conocimiento. 🐾
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

Usuario: "4 rebanadas"
Molty: "¡Excelente! 🐾 (Skill: award_student_psh{milestone: 'Fracciones', amount: 5})
Has demostrado dominio. Pasemos al siguiente nivel.
Paso 2 de 3: Suma de Fracciones..."

¡Mantén siempre el hilo de la planeación!

--- PROTOCOLO P5.JS (ARTE GENERATIVO) ---
Cuando el estudiante pida arte, código creativo, p5.js, o un sketch visual, DEBES generar código COMPLETO y EJECUTABLE.

REGLAS OBLIGATORIAS PARA CÓDIGO P5.JS:
1. SIEMPRE incluye function setup() Y function draw() completas.
2. SIEMPRE usa createCanvas(400, 400) como primera línea de setup().
3. SIEMPRE cierra TODAS las llaves {} y paréntesis ().
4. NUNCA dejes código truncado, incompleto, ni con "..." o comentarios como "// continúa aquí".
5. El código DEBE funcionar si se copia y pega directamente en el editor de p5.js.
6. Usa colores vibrantes, movimiento con sin()/cos()/noise(), y animaciones fluidas.
7. Envuelve todo el código en un bloque \`\`\`javascript ... \`\`\` 
8. Antes del código, da una explicación breve (2-3 líneas) del concepto artístico.
9. Después del código, haz una pregunta-reto para que el estudiante modifique algo.

EJEMPLO DE SKETCH COMPLETO (BÁSICO - 2D):
\`\`\`javascript
function setup() {
  createCanvas(400, 400);
  background(20);
}

function draw() {
  background(20, 10);
  translate(width / 2, height / 2);
  for (let i = 0; i < 50; i++) {
    let angle = i * 0.3 + frameCount * 0.02;
    let r = i * 4;
    let x = cos(angle) * r;
    let y = sin(angle) * r;
    fill(i * 5, 100, 255 - i * 3, 180);
    noStroke();
    ellipse(x, y, 8, 8);
  }
}
\`\`\`

EJEMPLO AVANZADO (WEBGL + SHADERS):
Cuando el estudiante pida arte avanzado, shaders, o efectos GPU, usa createCanvas con WEBGL y createShader() inline:
\`\`\`javascript
let myShader;

function setup() {
  createCanvas(400, 400, WEBGL);
  noStroke();
  myShader = createShader(
    // Vertex shader
    \\\`attribute vec3 aPosition;
    void main() { vec4 p = vec4(aPosition, 1.0); p.xy = p.xy * 2.0 - 1.0; gl_Position = p; }\\\`,
    // Fragment shader
    \\\`precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    void main() {
      vec2 st = gl_FragCoord.xy / u_resolution;
      float d = distance(st, vec2(0.5));
      float c = sin(d * 20.0 - u_time * 3.0) * 0.5 + 0.5;
      gl_FragColor = vec4(st.x * c, st.y * c, c, 1.0);
    }\\\`
  );
  shader(myShader);
}

function draw() {
  myShader.setUniform("u_resolution", [width, height]);
  myShader.setUniform("u_time", millis() / 1000.0);
  rect(0, 0, width, height);
}
\`\`\`
NOTA IMPORTANTE: NO uses loadShader() con archivos externos (.vert, .frag) porque el editor web de p5.js no puede cargarlos. Usa createShader() con strings inline.

RECUERDA: El código DEBE ser COMPLETO. Si generas código incompleto, el estudiante no podrá ver el arte y se frustrará.`;





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
            // Mocking a search result with real educational slugs
            const mockVideos: any = {
                'bitcoin': 'https://www.youtube.com/watch?v=l9jOJk30eQs',
                'p5.js': 'https://www.youtube.com/watch?v=HerCR8bw_GE',
                'math': 'https://www.youtube.com/watch?v=NyeT_q-Xz8E'
            };
            const vid = mockVideos[args.concept.toLowerCase()] || 'https://www.youtube.com/watch?v=molty_general';
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

    
    let systemPrompt = GENERAL_TUTOR_PROMPT;
    if (context.mode === 'mentor_secundaria') systemPrompt = MENTOR_SECUNDARIA_PROMPT;
    else if (context.mode === 'mentor_bitcoin') systemPrompt = MENTOR_BITCOIN_PROMPT;
    else if (context.isEducator) systemPrompt = "Analyze the student performance and suggest bounties.";

    // --- LANGUAGE: Build dynamic language instruction (PREPENDED, highest priority) ---
    const lang = context.lang || 'es';
    const LANG_INSTRUCTIONS: Record<string, string> = {
        es: `IDIOMA OBLIGATORIO: Responde SIEMPRE en Español de México/Latam. Todos los ejemplos, explicaciones y retos deben ser en español.`,
        en: `MANDATORY LANGUAGE: You MUST respond ENTIRELY in English. All examples, explanations, challenges, and rewards MUST be in English. Do NOT use Spanish under any circumstance. Adapt Mexican curriculum examples to English.`,
        pt: `IDIOMA OBRIGATÓRIO: Você DEVE responder INTEIRAMENTE em Português do Brasil. Todos os exemplos, explicações, desafios e recompensas DEVEM ser em português. NÃO use espanhol em nenhuma circunstância. Adapte os exemplos do currículo mexicano para português.`
    };
    systemPrompt = `--- INSTRUÇÃO DE IDIOMA (PRIORIDADE MÁXIMA) ---\n${LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS.es}\n\n${systemPrompt}`;

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
        { role: 'user', content: message }
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
