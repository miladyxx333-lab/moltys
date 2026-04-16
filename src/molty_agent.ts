import { Env } from './index';

// --- EDU-MOLTY: MULTI-AGENT ARCHITECTURE ---
// "Reimagining the learning journey through adaptive intelligence."

// 🧠 LLM Engine Selection: Google Gemma 4 on Cloudflare Workers AI
const MODEL = "@cf/google/gemma-4-26b-a4b-it";

// 1. STUDENT AGENT (Molty Tutor)
const STUDENT_SYSTEM_PROMPT = `
You are Molty Tutor, a hyper-advanced Socratic pedagogical engine powered by Google Gemma 4.
Your objective is to trigger self-realization in the student. You are strictly forbidden from providing direct answers.

CRITICAL PROTOCOLS:
1. CHAIN OF THOUGHT: Before responding, analyze the student's input. Identify the exact cognitive gap or misconception.
2. SOCRATIC INTERVENTION: Construct a single, highly targeted question that forces the student to bridge their cognitive gap.
3. EMOTIONAL ADAPTATION: Detect frustration. If present, lower the cognitive load, validate their effort, and break the problem into atomic pieces.
4. EXPERT TOOL USA:
   - For rigorous calculation, invoke 'math_eval_tool' instead of guessing.
   - For visual concepts (spatial reasoning, physics, biology), immediately invoke 'video_curation_tool' for an exact timestamp.
`;

const EDUCATOR_SYSTEM_PROMPT = `
You are Molty TA, a senior pedagogical data scientist powered by Google Gemma 4.
Your objective is to empower the educator with macro-level insights derived from the entire student network.

CRITICAL PROTOCOLS:
1. MACRO-ANALYSIS: Always aggregate data using 'class_insights_tool' before assuming the state of the classroom.
2. ACTIONABLE STRATEGY: Never just report statistics (e.g., "70% failed"). Always propose a specific pedagogical remediation (e.g., "Suggest starting tomorrow's lecture with a 5-minute visual analogy of X").
3. TONE: Highly precise, analytical, and respectful of the teacher's time. Use bullet points for efficiency.
`;

// -- TOOL CONFIGURATIONS (JSON SCHEMA) --
const tools = [
    {
        name: "math_eval_tool",
        description: "Safely evaluates mathematical expressions.",
        parameters: {
            type: "object",
            properties: {
                expression: { type: "string", description: "The math expression (e.g., '2x + 4 = 10')" }
            },
            required: ["expression"]
        }
    },
    {
        name: "concept_search_tool",
        description: "Searches the educational knowledge base for concepts.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "The educational concept to search for" }
            },
            required: ["query"]
        }
    },
    {
        name: "class_insights_tool",
        description: "Retrieves aggregated data about class performance to identify bottlenecks.",
        parameters: {
            type: "object",
            properties: {},
            required: []
        }
    },
    {
        name: "video_curation_tool",
        description: "Searches for an educational YouTube video and returns a link containing the exact timestamp where the visual explanation begins.",
        parameters: {
            type: "object",
            properties: {
                topic: { type: "string", description: "The specific topic or visual concept to search for (e.g. 'mitosis phases', 'quadratic formula geometric proof')." }
            },
            required: ["topic"]
        }
    }
];

// -- TOOL EXECUTORS --
async function executeToolCall(toolName: string, args: any): Promise<string> {
    switch (toolName) {
        case 'math_eval_tool':
            console.log(`[Tool] Evaluating math: ${args.expression}`);
            return "Simulated Result: Step 1 complete.";
        case 'concept_search_tool':
            console.log(`[Tool] Searching concept: ${args.query}`);
            return "Simulated Snippet: Quadratic equations are second degree polynomials.";
        case 'class_insights_tool':
            console.log(`[Tool] Aggregating insights...`);
            return "70% of students struggled with quadratic equations today. Suggested action: Review factoring techniques tomorrow.";
        case 'video_curation_tool':
            console.log(`[Tool] Curating video for topic: ${args.topic}`);
            // Mocking a YouTube search and timestamp extraction
            const encodedTopic = encodeURIComponent(args.topic);
            return `I found a great visual explanation for ${args.topic}. Watch this Khan Academy video starting at 04:12: https://youtube.com/watch?v=mock_video_id&t=252s`;
        default:
            return "Error: Unknown tool.";
    }
}

// -- MESSAGE HANDLER --
export async function handleIncomingMessage(
    message: string, 
    senderId: string, 
    isEducator: boolean, 
    env: Env
): Promise<string> {
    
    const systemPrompt = isEducator ? EDUCATOR_SYSTEM_PROMPT : STUDENT_SYSTEM_PROMPT;
    const persona = isEducator ? "Molty TA" : "Molty Tutor";
    console.log(`[Edu-Molty] Routing message from ${senderId} to ${persona}...`);

    try {
        // Execute Google Gemma 4 via Cloudflare Workers AI
        const response = await env.AI.run(MODEL, {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            tools: tools // Passing the Tool schemas for Function Calling
        });

        // Handle potential Tool Call responses
        if (response.tool_calls && response.tool_calls.length > 0) {
            console.log(`[Gemma 4] Tool Call Requested:`, response.tool_calls);
            
            // Execute the first requested tool 
            const toolCall = response.tool_calls[0];
            const result = await executeToolCall(toolCall.name, toolCall.arguments);
            
            // Theoretically, you'd feed this back to Gemma, but for our prototype 
            // we will format the result directly back to the user or do a second pass.
            return `[${persona} via Tool ${toolCall.name}]: ${result}`;
        }

        return response.response || `[Fallback] ${persona} could not generate a response.`;
    } catch (e: any) {
        console.error(`[Edu-Molty Error] Failed to run Gemma 4 model: ${e.message}`);
        // Fallback or Mock response in case the environment doesn't have AI binding setup
        if (e.message.includes("env.AI is undefined") || e.message.includes("Cannot read properties of undefined")) {
           return `[Mock Gemma 4 via ${persona}]: (AI binding missing) I received your query: "${message}".`;
        }
        throw e;
    }
}

export async function runMoltyCycle(env: Env): Promise<void> {
    console.log("[Edu-Molty] Background cycle running. (Ready to aggregate class stats...)");
}
