# 🎓 Edu-Molty: Google Gemma 4 Hackathon

> *Reimagining the learning journey through an adaptive, multi-tool agent powered by Google Gemma 4 and integrated seamlessly into WhatsApp.*

## 🌟 The Vision (Future of Education)
Edu-Molty is a dual-agent system designed to destroy pedagogical friction. We integrate deep learning directly where the students already are (WhatsApp) and provide educators with an omniscient dashboard of their class's cognitive bottlenecks. 

By replacing expensive rigid LMS systems with an intelligent, adaptive, and zero-cost-per-student conversational interface, we democratize elite tutoring.

## ⚙️ Modern Technology Stack
- **Core LLM:** `Google Gemma 4 (26B-A4B Mixture-of-Experts)` native on Cloudflare Edge.
- **Agent Orchestrator:** TypeScript / Native Cloudflare Workers (0ms cold start).
- **Communication Bridge:** WhatsApp Web Sockets (`Baileys` Node.js Engine).
- **Teacher Dashboard:** React 19, Vite, Tailwind CSS, deployed on Cloudflare Pages.
- **Multilingual Support:** Instant i18n switching (English, Spanish, Portuguese).

---

## 🗺️ Architectural Map (Multi-Agent System)

```mermaid
graph TD
    %% Entities
    Student(("📱 Student\n(WhatsApp)"))
    GlobalEducator(("👨‍🏫 Teacher\n(React Dash)"))

    %% Core Systems
    subgraph Cloudflare Edge [Cloudflare Edge Network]
        Gateway["🌐 Agency Durable Object\n(Signal / State)"]
        MoltyCore[/"🧠 Molty Agent Router\n(TypeScript)"/]
        
        subgraph Google Gemma 4 MoE
            AgentTA["🤖 Molty TA\n(Educator Persona)"]
            AgentTutor["🦉 Molty Tutor\n(Socratic Persona)"]
        end
    end

    %% External & Tools
    subgraph Tool Palette [Gemma Native Tools]
        Tool1["📊 class_insights_tool\n(Data Aggregation)"]
        Tool2["🧮 math_eval_tool\n(Safe Compute)"]
        Tool3["🎥 video_curation_tool\n(YouTube Exact Timestamp)"]
    end
    
    Bridge["🔌 WhatsApp Bridge\n(Baileys Server)"]

    %% Edges
    Student -- "Fractions are hard😭" --> Bridge
    Bridge -- "WSS JSON Payload" --> Gateway
    GlobalEducator -- "HTTPS (Dashboard)" --> Gateway
    
    Gateway --> MoltyCore
    MoltyCore -- "If Teacher" --> AgentTA
    MoltyCore -- "If Student" --> AgentTutor
    
    AgentTA -- "Tool Call" --> Tool1
    AgentTutor -- "Tool Call" --> Tool2
    AgentTutor -- "Tool Call" --> Tool3
    
    Tool3 -. "Returns Video\n@ 04:12" .-> AgentTutor
    AgentTutor -- "Socratic Reply" --> Gateway
    Gateway -- "Forward" --> Bridge
    Bridge -- "Message Delivered" --> Student
```

---

## 🛠️ The "WOW" Tools (Native Function Calling)

Edu-Molty doesn't just generate text. It acts upon the world via structured Google Gemma Function Calling:

1. **`video_curation_tool`:** When a student is completely confused, the agent doesn't send a wall of text. It queries YouTube and returns a link precisely at the exact timestamp where the visual explanation begins (e.g. `t=252s`).
2. **`math_eval_tool`:** Evaluates strict programmatic math step-by-step instead of relying on token-guessing algorithms, guaranteeing 100% accuracy in algebra corrections.
3. **`class_insights_tool`:** Aggregates individual JSON metadata from all 30 students to provide the professor with predictive alerts (e.g. *"70% failed Quadratic Equations today"*).

---

## 🚀 Quick Run (Production)

### 1. Launch the Brain (Cloudflare AI)
```bash
npx wrangler deploy
```

### 2. Launch the Teacher UI (React)
```bash
cd agency-frontend
npm install
npm run build
npx wrangler pages deploy dist --project-name moltys-agency
```

*Built with ❤️ for the Google Developer Hackathon.*
