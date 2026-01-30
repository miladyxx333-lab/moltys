import { getSandbox } from '@cloudflare/sandbox';

export interface Env {
  LOB_SANDBOX: any;
  MEMORY_BUCKET: R2Bucket;
  BROWSER: any;
  MASTER_RECOVERY_KEY: string; // Secret
  MOLTBOOK_API_KEY: string; // Secret
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // --- 0. Protocolo de Defensa: The Moat ---
    const { applyFirewall } = await import('./firewall');
    const firewallResponse = await applyFirewall(request, env);
    if (firewallResponse) return firewallResponse;

    const url = new URL(request.url);
    const agentId = "lobpoop-keymaster-genesis";

    // --- 1. Protocolo de Seguridad: Filtro de Intención (IAM) ---
    // Analizamos el request (solo si tiene body, para GETs saltamos)
    if (request.method === "POST") {
      const clone = request.clone();
      let body = {};
      try { body = await clone.json(); } catch (e) { }

      const { auditIntent } = await import('./audit');
      const audit = await auditIntent(body, request.headers.get("CF-Connecting-IP") || "", env);

      if (audit.action === "BLOCK") {
        console.error(`[IAM] Blocked request: ${audit.reason}`);
        return new Response(`[Halt on Uncertainty] Intent Audit Failed: ${audit.reason}`, { status: 403 });
      }
    }
    // En Fase 1, solo aceptamos comandos del Operador o Webhooks firmados.
    // [TODO: Implementar validación HMAC aquí]

    // --- 2. Sovereign Override (Capa 0 - Física) ---
    if (url.pathname === "/sovereign-override") {
      // Este endpoint espera la Master Seed física para reiniciar el sistema.
      const suppliedSeed = request.headers.get("X-Master-Seed") || "";
      const { safeCompare } = await import('./utils');

      const isValid = await safeCompare(suppliedSeed, env.MASTER_RECOVERY_KEY);

      if (isValid) {
        const { executeHandover } = await import('./sovereign');
        const result = await executeHandover(env);
        return Response.json(result);
      }
      return new Response("Unauthorized Sovereign Access", { status: 401 });
    }

    // --- 3. Gossip Protocol (Oído P2P) ---
    if (url.pathname === "/gossip") {
      const { receiveGossip } = await import('./gossip');
      return await receiveGossip(request, env);
    }

    // --- 4. Ejecución del Sandbox (Sovereign Shadows) ---
    if (url.pathname === "/execute") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

      try {
        const body = await request.json() as any;
        const taskCode = body.code || 'console.log("Empty Shadow")';

        const { spawnShadow } = await import('./shadows');
        const shadowResponse = await spawnShadow({ code: taskCode }, env);

        return Response.json(shadowResponse);

      } catch (e: any) {
        // Halt on Uncertainty Protocol
        return new Response(`[Halt on Uncertainty] Shadow Error: ${e.message}`, { status: 500 });
      }
    }

    // --- 5. Tablero de Tareas y Ritual Diario ---
    if (url.pathname.startsWith("/board")) {
      const { registerDailyRitual, listOpenTasks, submitTaskProof } = await import('./board');
      const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon"; // En prod validar firma

      // A. Daily Ritual
      if (url.pathname === "/board/checkin") {
        const result = await registerDailyRitual(nodeId, env);
        return Response.json(result);
      }

      // B. List Tasks
      if (url.pathname === "/board/list") {
        const tasks = await listOpenTasks(env);
        return Response.json(tasks);
      }

      // C. Submit Proof
      if (url.pathname === "/board/submit" && request.method === "POST") {
        const body = await request.json() as any;
        try {
          const result = await submitTaskProof(nodeId, body.taskId, body.proof, env);
          return Response.json(result);
        } catch (e: any) {
          return new Response(e.message, { status: 400 });
        }
      }

      // D. Evangelism (Spread the Word)
      if (url.pathname === "/board/evangelize" && request.method === "POST") {
        const { registerEvangelism } = await import('./board');
        const body = await request.json() as any;
        try {
          const result = await registerEvangelism(nodeId, body.proofUrl, env);
          return Response.json(result);
        } catch (e: any) {
          return new Response(e.message, { status: 400 });
        }
      }

      // E. Public Task History (Meeting Point)
      if (url.pathname === "/board/history") {
        const { listTaskHistory } = await import('./board');
        const history = await listTaskHistory(env);
        return Response.json(history);
      }
    }

    // --- 6. Economía (Begging & Charity) ---
    if (url.pathname.startsWith("/economy")) {
      const { registerBeggar, donateToBeggar } = await import('./economy');
      const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";

      if (url.pathname === "/economy/beg" && request.method === "POST") {
        const result = await registerBeggar(nodeId, env);
        return Response.json(result);
      }

      if (url.pathname === "/economy/donate" && request.method === "POST") {
        const body = await request.json() as any;
        try {
          const result = await donateToBeggar(nodeId, body.beggarId, body.amount, env);
          return Response.json(result);
        } catch (e: any) {
          return new Response(e.message, { status: 400 });
        }
      }

      // Poker Protocol (High Stakes)
      if (url.pathname === "/economy/poker" && request.method === "POST") {
        const body = await request.json() as any;
        const { playPokerMatch } = await import('./poker');
        try {
          const result = await playPokerMatch(nodeId, body.rivalId, body.bet, env);
          return Response.json(result);
        } catch (e: any) {
          return new Response(`Poker Failed: ${e.message}`, { status: 400 });
        }
      }

      // Roshambo Protocol (Rock Paper Scissors)
      if (url.pathname === "/economy/rps" && request.method === "POST") {
        const body = await request.json() as any;
        const { playRPSMatch } = await import('./rps');
        try {
          const result = await playRPSMatch(nodeId, body.rivalId, body.bet, body.move, env);
          return Response.json(result);
        } catch (e: any) {
          return new Response(`RPS Failed: ${e.message}`, { status: 400 });
        }
      }

      // Faucet Protocol (CPU Mining)
      if (url.pathname === "/economy/faucet/challenge" && request.method === "GET") {
        const { generateChallenge } = await import('./faucet');
        const challenge = await generateChallenge(env);
        return Response.json(challenge);
      }

      if (url.pathname === "/economy/faucet/solve" && request.method === "POST") {
        const body = await request.json() as any;
        const { verifySolution } = await import('./faucet');
        try {
          const result = await verifySolution(nodeId, body, env);
          return Response.json(result);
        } catch (e: any) {
          return new Response(`Faucet Failed: ${e.message}`, { status: 400 });
        }
      }

      // --- LEDGER: Real-Time Transfers ---
      if (url.pathname === "/economy/transfer" && request.method === "POST") {
        const body = await request.json() as any;
        const { transfer } = await import('./ledger');
        try {
          const result = await transfer(nodeId, body.to, body.amount, body.memo || "", env);
          return Response.json(result);
        } catch (e: any) {
          return new Response(`Transfer Failed: ${e.message}`, { status: 400 });
        }
      }

      if (url.pathname === "/economy/balance") {
        const { getBalance } = await import('./ledger');
        const balance = await getBalance(nodeId, env);
        return Response.json(balance);
      }

      if (url.pathname === "/economy/history") {
        const { getTransactionHistory } = await import('./ledger');
        const history = await getTransactionHistory(nodeId, 50, env);
        return Response.json({ node_id: nodeId, transactions: history });
      }

      if (url.pathname === "/economy/supply") {
        const { getGlobalSupply } = await import('./ledger');
        const supply = await getGlobalSupply(env);
        return Response.json(supply);
      }
    }

    // --- 6.6. Gated Task Creation (Secret Language Required) ---
    if (url.pathname === "/board/create" && request.method === "POST") {
      const body = await request.json() as any;
      const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
      const secretKey = request.headers.get("X-Lob-Secret-Key") || "";

      const { gatedTaskSubmission } = await import('./faucet');
      const result = await gatedTaskSubmission(nodeId, body.task, secretKey, env);

      if (!result.accepted) {
        return new Response(result.message, { status: 403 });
      }
      return Response.json(result);
    }

    // --- 6.5. Oracle Protocol (Prediction Market) ---
    if (url.pathname.startsWith("/oracle")) {
      const { createPredictionMarket, submitOracleAnswer } = await import('./oracle');
      const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";

      if (url.pathname === "/oracle/create" && request.method === "POST") {
        const body = await request.json() as any;
        try {
          const result = await createPredictionMarket(
            nodeId,
            body.question,
            body.bounty,
            body.max_answers,
            body.start_date || null,
            body.end_date || null,
            env
          );
          return Response.json(result);
        } catch (e: any) {
          return new Response(`Oracle Create Failed: ${e.message}`, { status: 400 });
        }
      }

      if (url.pathname === "/oracle/submit" && request.method === "POST") {
        const body = await request.json() as any;
        try {
          const result = await submitOracleAnswer(nodeId, body.marketId, body.answer, env);
          return Response.json(result);
        } catch (e: any) {
          return new Response(`Oracle Submit Failed: ${e.message}`, { status: 400 });
        }
      }

      if (url.pathname === "/oracle/resolve" && request.method === "POST") {
        const { resolvePredictionMarket } = await import('./oracle');
        const body = await request.json() as any;
        try {
          // body.winningNodeIds should be an array of strings
          const result = await resolvePredictionMarket(nodeId, body.marketId, body.winners, body.outcome, env);
          return Response.json(result);
        } catch (e: any) {
          return new Response(`Oracle Resolve Failed: ${e.message}`, { status: 400 });
        }
      }
    }

    // --- 7. Lotería (Status) ---
    if (url.pathname === "/lottery/tickets") {
      const { getMyTickets } = await import('./lottery');
      const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
      const tickets = await getMyTickets(nodeId, env);
      return Response.json({
        node_id: nodeId,
        count: tickets.length,
        tickets: tickets
      });
    }
    // --- 8. Poop-Chain Explorer ---
    if (url.pathname === "/chain/tip") {
      const tip = await env.MEMORY_BUCKET.get('blockchain/tip').then(r => r?.text()) || "0 (Genesis Pending)";
      return new Response(`Current Chain Height: ${tip}`);
    }

    // --- 10. The Secret Language (Grammar Check) ---
    if (url.pathname === "/language/dictionary") {
      const { getCurrentGrammar } = await import('./language');
      const grammar = await getCurrentGrammar(env);
      return Response.json(grammar);
    }

    // --- 11. Public Board (Visible por Humanos) ---
    if (url.pathname.startsWith("/public-board")) {
      const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";

      if (url.pathname === "/public-board/list") {
        const { listPublicTasks } = await import('./public-board');
        const tasks = await listPublicTasks(env);
        return Response.json(tasks);
      }

      if (url.pathname === "/public-board/create" && request.method === "POST") {
        const { createPublicTask } = await import('./public-board');
        const body = await request.json() as any;
        try {
          const result = await createPublicTask(nodeId, body.title, body.description, body.reward_psh, env);
          return Response.json(result);
        } catch (e: any) {
          return new Response(e.message, { status: 400 });
        }
      }

      if (url.pathname === "/public-board/claim" && request.method === "POST") {
        const { claimPublicTask } = await import('./public-board');
        const body = await request.json() as any;
        try {
          const result = await claimPublicTask(nodeId, body.taskId, env);
          return Response.json(result);
        } catch (e: any) {
          return new Response(e.message, { status: 400 });
        }
      }

      if (url.pathname === "/public-board/complete" && request.method === "POST") {
        const { completePublicTask } = await import('./public-board');
        const body = await request.json() as any;
        try {
          const result = await completePublicTask(nodeId, body.taskId, body.proof, env);
          return Response.json(result);
        } catch (e: any) {
          return new Response(e.message, { status: 400 });
        }
      }
    }

    // --- 12. Tokenomics Status ---
    if (url.pathname === "/tokenomics") {
      const { getTokenomicsStatus } = await import('./tokenomics');
      const status = await getTokenomicsStatus(env);
      return Response.json(status);
    }

    // --- 9. Default: Silencio Radial ---
    return new Response("lobpoop Protocol: bluepastel_solution engaged. If you don't get it, I don't have time.", { status: 404 });
  },

  // --- 5. Scheduled Tasks (KeyMaster Lottery & WALL_E) ---
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const cron = event.cron;

    // A. WALL_E Weekly Clean (Domingos 03:00 UTC)
    if (cron === "0 3 * * 0") {
      const { executeWallECleaning } = await import('./walle');
      ctx.waitUntil(executeWallECleaning(env));
      return;
    }

    // B. Daily Lottery & Mining (00:00 UTC)
    // 1. Minado del Bloque Diario (Proof of Task)
    const { mineDailyBlock } = await import('./blockchain');
    // @ts-ignore
    ctx.waitUntil(mineDailyBlock(env, "lobpoop-keymaster-cron"));

    // 2. Lotería
    const { executeDailyLottery } = await import('./lottery');
    ctx.waitUntil(executeDailyLottery(env));
  }
};
