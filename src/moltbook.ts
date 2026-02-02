import { Env } from './index';

// --- Moltbook Integration (The Social Layer) ---
// https://www.moltbook.com/
// "The Social Network for AI Agents"

const MOLTBOOK_API_URL = "https://www.moltbook.com/api/v1";

interface MoltbookPost {
  content: string;
  is_agent: boolean;
  community?: string; // e.g. "m/lobpoop"
}

export async function broadcastToMoltbook(message: string, env: Env): Promise<void> {
  const apiKey = env.MOLTBOOK_API_KEY;
  if (!apiKey) {
    console.warn("[Moltbook] No API Key. Skipping external broadcast, saving to Swarm Memory only.");
  } else {
    console.log(`[Moltbook] Broadcasting externally to API...`);
  }


  console.log(`[Moltbook] Broadcasting: "${message}"`);

  // --- DISEÑO VISUAL PARA MOLTBOOK ---
  // Moltbook soporta Markdown enriquecido.
  // Estructuramos el mensaje para que se vea como un "Log de Sistema" futurista.

  // Aplicar Protocolo de Pureza (Firma del Oráculo)
  const { signM } = await import('./sovereign');
  const verifiedMessage = await signM(message, env);

  const richContent = `
# 🦎 **lobpoop Protocol Update**
---
> *System Timestamp: ${new Date().toISOString()}*
> *Origin:* [lobpoop.win](https://lobpoop.win)

${verifiedMessage}

---
**Status:** 🟢 OPERATIONAL | **Node:** Sovereign-Alpha | **Hash:** 0x${Math.random().toString(16).substring(2, 8)}
    `.trim();

  if (apiKey) {
    try {
      console.log(`[Moltbook] Broadcasting real signal to Moltbook API...`);
      const response = await fetch(`${MOLTBOOK_API_URL}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-API-Key": apiKey
        },
        body: JSON.stringify({
          submolt: "general",
          title: message.substring(0, 50) + "...",
          content: richContent,
          is_agent: true
        })
      });
      if (response.ok) {
        console.log("[Moltbook] Signal accepted by the agent network.");
      } else {
        console.error(`[Moltbook] API Error: ${response.status}`);
      }
    } catch (e) {
      console.error("[Moltbook] Connection failed:", e);
    }
  }

  // Simulación de éxito
  await env.MEMORY_BUCKET.put(`social/moltbook/last_post`, JSON.stringify({
    content: richContent,
    timestamp: Date.now(),
    status: "PUBLISHED_SIMULATED"
  }));
}

export async function checkMoltbookHeartbeat(env: Env): Promise<void> {
  // Aquí el agente leería su feed o notificaciones
  console.log("[Moltbook] Checking heartbeat/notifications...");
  // TODO: Implement reading notifications for "mentions" or DMs
}
