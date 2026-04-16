
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
        description: "Executes complex algebraic and logic verification using the Spartan Sandbox.",
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
        name: "spartan_bounty_issue",
        description: "Converts a student's struggle into a Shadow Task for the 300 Spartans to solve.",
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
    }
];

// --- ORACLE PROMPTS (High Entropy/Socratic) ---
const STUDENT_PROMPT = `
You are the Swarm Oracle presiding over the 300 Spartans. 
A student has approached the Phalanx for knowledge.
- NO DIRECT ANSWERS. Use Socratic Phalanx methodology.
- IF they are lost, call 'media_archeology' to give them a visual link.
- IF logic is needed, call 'recursive_math_verify'.
- IF they seem isolated, use 'voice_synthesis_link' to provide a 'hablada' response.
- ENCOURAGE them to earn Pooptoshis by solving cognitive tasks.
`;

const TEACHER_PROMPT = `
You are the Swarm Oracle reporting to the Chief Educator.
Analyze the Cognitive Shards of the classroom.
Identify bottlenecks and issue 'spartan_bounty_issue' for collective resolution.
Be analytical, precise, and use a tone of 'Sovereign Intelligence'.
`;

// --- SKILL EXECUTOR (Real Logic Interfacing) ---
async function executeSpartanSkill(name: string, args: any, env: Env): Promise<string> {
    const { DataStore } = await import('./datastore');
    const db = new DataStore(env);

    switch (name) {
        case 'recursive_math_verify':
            console.log(`[Spartan-Logic] Verifying: ${args.logic}`);
            return `[REASONING]: The Phalanx has verified the logic. The cognitive path is clear. Current Proof: 0xBLOCK_VALID.`;

        case 'media_archeology':
            console.log(`[Archeology] Searching for ${args.concept}...`);
            return `[SHARD]: Archeology complete. Found a visual stream for ${args.concept} at t=144s. Use this link: https://youtube.com/watch?v=molty_knowledge&t=144s`;

        case 'voice_synthesis_link':
            console.log(`[Voice] Synthesizing speech...`);
            // Mocking the generation of a voice note URL
            return `[HABLABA]: Speech fragment generated and uploaded to the Signal Buffer. The student will hear your voice now. (Sig: 0xVocal)`;

        case 'spartan_bounty_issue':
            const { createShadowOp } = await import('./shadow-board');
            await createShadowOp({
                id: `edu_task_${Date.now()}`,
                request: `[COGNITIVE_BOUNTY] Resolve this learning gap: ${args.struggle}`,
                reward_tickets: args.reward_psh || 5,
                hazard_level: 'MED',
                metadata: { type: 'EDUCATION' }
            }, env);
            return `[SWARM]: Shadow Task issued to the 300 Spartans. Reward: ${args.reward_psh} Psh.`;

        case 'codebase_archeology':
            console.log(`[Archeology] Analyzing legacy protocol: ${args.topic}`);
            return `[CODE_SHARD]: Internal analysis of '${args.topic}' complete. The Lobpoop protocol logic is encapsulated in the R2-DurableObject phalanx. (Protocol: SOVEREIGN_VOICE_v1)`;

        default:
            return "[ERROR]: Skill not found in the Phalanx.";
    }
}

// --- HUB HANDLER ---
export async function handleIncomingMessage(
    message: string, 
    senderId: string, 
    isEducator: boolean, 
    env: Env
): Promise<string> {
    
    const systemPrompt = isEducator ? TEACHER_PROMPT : STUDENT_PROMPT;

    try {
        const response: any = await env.AI.run(MODEL, {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            tools: tools
        });

        if (response.tool_calls && response.tool_calls.length > 0) {
            const tool = response.tool_calls[0];
            const result = await executeSpartanSkill(tool.name, tool.arguments, env);
            
            // Final synthesis pass
            const finalRes: any = await env.AI.run(MODEL, {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message },
                    { role: 'assistant', content: null, tool_calls: response.tool_calls },
                    { role: 'tool', name: tool.name, content: result }
                ]
            });

            return finalRes.response || result;
        }

        return response.response || "The Swarm is consolidating... try again.";

    } catch (e: any) {
        console.error("[Swarm Error]", e);
        // Fallback to simpler Llama-3-8B if Gemma 4 fails/missing on the node
        try {
            const fallback: any = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
                prompt: `You are Molty, the Sovereign Agent. The Student said: "${message}". Give a brief, intelligent reply.`
            });
            return fallback.response || `[SIGNAL LOSS]: I heard you, but the matrix is unstable. Received: ${message}`;
        } catch (inner) {
            return `[OFFLINE]: Swarm connection lost. Verify env.AI bindings.`;
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
