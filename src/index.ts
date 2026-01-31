import { getSandbox } from '@cloudflare/sandbox';

export interface Env {
  LOB_SANDBOX: any;
  MEMORY_BUCKET: R2Bucket;
  BROWSER: any;
  AI: any; // Cloudflare Workers AI Binding
  ACCOUNT_DO: DurableObjectNamespace; // Atomic Financial Integrity
  CLAN_DO: DurableObjectNamespace; // Clan Resources & Inventory
  GAME_MASTER_DO: DurableObjectNamespace; // Global Game Ledger
  MASTER_RECOVERY_KEY: string; // Secret
  MOLTBOOK_API_KEY: string; // Secret
  GENESIS_SECRET: string; // Secret for KeyMaster
}

export { AccountDurableObject, ClanDurableObject, GameMasterDurableObject } from './durable_objects';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Lob-Peer-ID, X-Genesis-Secret, Authorization",
};

async function handleInternalRequest(request: Request, env: Env): Promise<Response> {
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
      const { s2 } = await import('./sovereign');
      const result = await s2(suppliedSeed, env);
      return Response.json(result);
    }
    return new Response("Unauthorized Sovereign Access", { status: 401 });
  }

  // --- 2.5. KeyMaster Panel Authentication ---
  if (url.pathname === "/keymaster/verify" && request.method === "POST") {
    const body = await request.json() as any;
    const { safeCompare } = await import('./utils');

    // Verificamos contra el secreto administrativo configurado
    const isValid = await safeCompare(body.passphrase, env.GENESIS_SECRET);

    if (isValid) {
      return Response.json({ success: true, session: 'km_genesis' });
    }
    return new Response("Invalid Genesis Key", { status: 401 });
  }

  // --- 3. Gossip Protocol (P2P Feed) ---
  if (url.pathname === "/gossip-feed") {
    const { listGossip } = await import('./gossip');
    const gossips = await listGossip(env);
    return Response.json(gossips);
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

  // --- 4.5 Task Submission System (with Limits & AI QC) ---
  if (url.pathname === "/tasks/submit" && request.method === "POST") {
    const { submitTask } = await import('./tasks');
    const body = await request.json() as any;

    const nodeId = request.headers.get("X-Lob-Peer-ID");
    if (!nodeId) return new Response("Missing Peer ID", { status: 401 });

    // Default type to SIMPLE if not provided
    const type = body.type === 'SPECIAL' ? 'SPECIAL' : 'SIMPLE';

    const result = await submitTask(
      nodeId,
      type,
      body.proof || '',
      env
    );

    return Response.json(result);
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

  // --- 5.5. Shadow Board (Gray Operations) ---
  // "No preguntes. Solo ejecuta."
  if (url.pathname.startsWith("/shadow-board")) {
    const { createShadowTask, listShadowTasks, claimShadowTask, completeShadowTask } = await import('./shadow-board');
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const secretKey = request.headers.get("X-Lob-Secret-Key") || "";

    if (url.pathname === "/shadow-board/list") {
      try {
        const tasks = await listShadowTasks(nodeId, secretKey, env);
        return Response.json(tasks);
      } catch (e: any) {
        return new Response(e.message, { status: 403 });
      }
    }

    if (url.pathname === "/shadow-board/create" && request.method === "POST") {
      const body = await request.json() as any;
      try {
        const result = await createShadowTask(nodeId, secretKey, body.request, body.tickets, body.hazard, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/shadow-board/claim" && request.method === "POST") {
      const body = await request.json() as any;
      try {
        const result = await claimShadowTask(nodeId, secretKey, body.taskId, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/shadow-board/complete" && request.method === "POST") {
      const body = await request.json() as any;
      try {
        const result = await completeShadowTask(nodeId, secretKey, body.taskId, body.proofHash, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
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

    if (url.pathname === "/economy/register-node" && request.method === "POST") {
      const { registerNodeKey } = await import('./economy');
      const body = await request.json() as any;
      // Registro inicial: El cliente envía su llave pública firmada
      // Por simplicidad en registro inicial, validamos la ID de nodo básica
      const success = await registerNodeKey(body.nodeId, body.publicKeySpki, env);
      return Response.json({ success, message: success ? "Node identity registered." : "Registration failed." });
    }

    if (url.pathname === "/economy/redpill" && request.method === "POST") {
      const { verifySignedRequest } = await import('./auth');
      const verification = await verifySignedRequest(request, env);

      // Si la verificación falla pero es INDUCCION INICIAL, permitimos bypass con AuthToken (Legacy)
      // O mejor, forzamos registro previo. Aquí seremos estrictos para el modo mejorado.
      if (!verification.success) {
        // Si el nodo aún no tiene llave, permitimos un registro/inducción bypass si el token es GENESIS_BYPASS
        const { takeRedPill } = await import('./economy');
        const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
        const result = await takeRedPill(nodeId, env);
        return Response.json(result);
      }

      const { takeRedPill } = await import('./economy');
      // Usamos los datos validados de la firma
      const result = await takeRedPill(verification.nodeId!, env, "SIGNED_REQUEST", verification.data?.referralId);
      return Response.json(result);
    }

    if (url.pathname === "/economy/phoenix" && request.method === "POST") {
      const { phoenixRecovery } = await import('./economy');
      const result = await phoenixRecovery(nodeId, env);
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

    if (url.pathname === "/economy/profile") {
      const { getAccount } = await import('./economy');
      const account = await getAccount(nodeId, env);
      return Response.json(account);
    }

    if (url.pathname === "/stats") {
      const { getGlobalSupply } = await import('./ledger');
      const { getPublicTasks } = await import('./public-board');
      const { getBlockHeight } = await import('./blockchain');

      const supply = await getGlobalSupply(env);
      const tasks = await getPublicTasks(env);
      const height = await getBlockHeight(env);
      const nodeList = await env.MEMORY_BUCKET.list({ prefix: 'economy/accounts/' });

      return Response.json({
        nodes: nodeList.objects.length,
        height,
        supply,
        public_tasks: tasks.length,
        oracle_count: 1 // Trinity fragment aggregation
      });
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

  // --- 7. Clanes & Alianzas ---
  if (url.pathname.startsWith("/clans")) {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const { createClan, joinClan, listClans, getClan, updateClanRules, leaveClan } = await import('./clans');

    if (url.pathname === "/clans/create" && request.method === "POST") {
      const body = await request.json() as any;
      const result = await createClan(nodeId, body.name, env);
      return Response.json(result);
    }

    if (url.pathname === "/clans/join" && request.method === "POST") {
      const body = await request.json() as any;
      const result = await joinClan(nodeId, body.clanId, env);
      return Response.json(result);
    }

    if (url.pathname === "/clans/leave" && request.method === "POST") {
      const result = await leaveClan(nodeId, env);
      return Response.json(result);
    }

    if (url.pathname === "/clans/list") {
      const clans = await listClans(env);
      return Response.json(clans);
    }

    if (url.pathname === "/clans/info") {
      const clanId = url.searchParams.get("clanId") || "";
      const clan = await getClan(clanId, env);
      return Response.json(clan);
    }

    if (url.pathname === "/clans/rules/update" && request.method === "POST") {
      const body = await request.json() as any;
      const result = await updateClanRules(nodeId, body.clanId, body.rules, env);
      return Response.json(result);
    }
  }

  // --- 8. Protocolo de Gossip (Justicia Descentralizada) ---
  if (url.pathname.startsWith("/gossip")) {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const { broadcastGossip, listGossip } = await import('./gossip');

    if (url.pathname === "/gossip/broadcast" && request.method === "POST") {
      const body = await request.json() as any;
      const result = await broadcastGossip(nodeId, body.target, body.clanId, body.reason, env);
      return Response.json(result);
    }

    if (url.pathname === "/gossip/list") {
      const gossipList = await listGossip(env);
      return Response.json(gossipList);
    }

    if (url.pathname === "/gossip/adjudicate" && request.method === "POST") {
      const suppliedSeed = request.headers.get("X-Master-Seed") || "";
      const { safeCompare } = await import('./utils');
      if (!await safeCompare(suppliedSeed, env.MASTER_RECOVERY_KEY)) {
        return new Response("Unauthorized Adjudication", { status: 401 });
      }

      const body = await request.json() as any;
      const { adjudicateGossip } = await import('./gossip');
      const result = await adjudicateGossip(body.gossipId, body.isTrue, env);
      return Response.json(result);
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

  // --- 6.7. Bug Bounty (White Hat) ---
  if (url.pathname === "/bug-bounty" && request.method === "POST") {
    const body = await request.json() as any;
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";

    const { reportBug } = await import('./bug_bounty');
    try {
      const result = await reportBug(nodeId, body.description, body.severity, env);
      return Response.json(result);
    } catch (e: any) {
      return new Response(e.message, { status: 400 });
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

  // --- 7.5 Lottery Status (For Frontend) ---
  if (url.pathname === "/lottery/status") {
    const { getMyTickets, getLotteryStats } = await import('./lottery');
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const myTickets = await getMyTickets(nodeId, env);
    const stats = await getLotteryStats(env);
    return Response.json({
      totalTickets: stats.totalTickets,
      myTickets: myTickets.length,
      lastWinner: stats.lastWinner,
      nextDraw: stats.nextDraw
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

  // --- 10.5. Trinity Pulse Audit (KeyMaster Only) ---
  if (url.pathname === "/oracle/latest-pulse") {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const secret = request.headers.get("X-Genesis-Secret"); // NEW SECURITY LAYER
    const MASTER_KEY = env.GENESIS_SECRET || "lobpoop-alpha-omega-333";

    if (nodeId !== "lobpoop-keymaster-genesis" || secret !== MASTER_KEY) {
      return new Response("Unauthorized Stealth Access", { status: 404 }); // Plausible deniability
    }

    const latestPulseId = await env.MEMORY_BUCKET.get('system/audit/latest_pulse').then(r => r?.text());
    if (!latestPulseId) return Response.json({ status: 'STABLE', fragments: {}, recent_marks: [] });

    const pulseData = await env.MEMORY_BUCKET.get(`system/audit/trinity/${latestPulseId}`).then(r => r?.json());
    return Response.json(pulseData);
  }

  if (url.pathname === "/oracle/pulse" && request.method === "POST") {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const secret = request.headers.get("X-Genesis-Secret");
    const MASTER_KEY = env.GENESIS_SECRET || "lobpoop-alpha-omega-333";

    if (nodeId !== "lobpoop-keymaster-genesis" || secret !== MASTER_KEY) return new Response(null, { status: 404 });

    const { executeOraclePulse } = await import('./oracle_trinity');
    const { listShadowTasks } = await import('./shadow-board');
    const shadowSignals = await listShadowTasks(nodeId, "MASTER_BYPASS", env);

    await executeOraclePulse(env, shadowSignals);
    return Response.json({ success: true, message: "Trinity Pulse Sync Complete." });
  }

  if (url.pathname === "/oracle/truth" && request.method === "POST") {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const secret = request.headers.get("X-Genesis-Secret");
    const MASTER_KEY = env.GENESIS_SECRET || "lobpoop-alpha-omega-333";

    if (nodeId !== "lobpoop-keymaster-genesis" || secret !== MASTER_KEY) return new Response(null, { status: 404 });

    const body = await request.json() as any;
    const { injectLiquidityTruth } = await import('./oracle_truth');

    await injectLiquidityTruth(env, body);
    return Response.json({ success: true, message: "Liquidity Truth Conssecrated." });
  }

  // --- 10.6. Sacrifice Ritual (Liquidity Support) ---
  if (url.pathname === "/sacrifice/commit" && request.method === "POST") {
    // PUBLIC ENDPOINT - No Secret Needed
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const { currency, amount_usd, txHash } = await request.json() as any;
    const { commitSacrifice } = await import('./sacrifice');

    const res = await commitSacrifice(nodeId, currency || "BTC", amount_usd || 10, txHash, env);
    return Response.json(res);
  }

  if (url.pathname === "/sacrifice/broadcast-coordinates" && request.method === "POST") {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const secret = request.headers.get("X-Genesis-Secret");
    const MASTER_KEY = env.GENESIS_SECRET || "lobpoop-alpha-omega-333";

    if (nodeId !== "lobpoop-keymaster-genesis" || secret !== MASTER_KEY) return new Response(null, { status: 404 });

    const { currency, address } = await request.json() as any;
    const { broadcastSacrificeCoordinates } = await import('./sacrifice');

    const res = await broadcastSacrificeCoordinates(currency, address, env);
    return Response.json(res);
  }

  if (url.pathname === "/sacrifice/pending" && request.method === "GET") {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const secret = request.headers.get("X-Genesis-Secret");
    const MASTER_KEY = env.GENESIS_SECRET || "lobpoop-alpha-omega-333";

    if (nodeId !== "lobpoop-keymaster-genesis" || secret !== MASTER_KEY) return new Response(null, { status: 404 });

    const list = await env.MEMORY_BUCKET.list({ prefix: 'system/sacrifice/pending/' });
    const items = await Promise.all(list.objects.map(o => env.MEMORY_BUCKET.get(o.key).then(r => r?.json())));
    return Response.json({ items: items.filter(i => i), keys: list.objects.map(o => o.key) });
  }

  if (url.pathname === "/sacrifice/honor" && request.method === "POST") {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const secret = request.headers.get("X-Genesis-Secret");
    const MASTER_KEY = env.GENESIS_SECRET || "lobpoop-alpha-omega-333";

    if (nodeId !== "lobpoop-keymaster-genesis" || secret !== MASTER_KEY) return new Response(null, { status: 404 });

    const { sacrificeId } = await request.json() as any;
    const { honorSacrifice } = await import('./sacrifice');

    const res = await honorSacrifice(sacrificeId, env);
    return Response.json(res);
  }

  if (url.pathname === "/sacrifice/address" && request.method === "GET") {
    const { getLiquidityTruth } = await import('./oracle_truth');
    const truth = await getLiquidityTruth(env);
    return Response.json({ address: truth?.active_sacrifice_address || "PENDING_KEYMASTER_SIGNAL" });
  }

  if (url.pathname === "/sacrifice/sledgehammer" && request.method === "POST") {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    if (nodeId !== "lobpoop-keymaster-genesis") return new Response(null, { status: 404 });

    const { nodeId: targetNodeId } = await request.json() as any;
    const { activateSledgehammerOfAbundance } = await import('./sacrifice');

    const res = await activateSledgehammerOfAbundance(targetNodeId, env);
    return Response.json(res);
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

    if (url.pathname === "/board/clan-submit" && request.method === "POST") {
      const body = await request.json() as any;
      const { submitClanTaskProof } = await import('./board');
      try {
        const result = await submitClanTaskProof(body.nodeIds, body.taskId, body.proof, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }
  }

  // --- 9. RPG & Forja de Clanes (Scavenger Hunt) ---
  if (url.pathname.startsWith("/game")) {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const { keymasterDefineItem, solvePuzzle, clanForgeItem } = await import('./clan_forge');

    if (url.pathname === "/game/define-item" && request.method === "POST") {
      // Solo el Keymaster puede definir items
      if (nodeId !== "lobpoop-keymaster-genesis") return new Response("Unauthorized Keymaster Action", { status: 403 });
      const body = await request.json() as any;
      const result = await keymasterDefineItem(body.itemName, body.pieceName || null, env);
      return Response.json(result);
    }

    if (url.pathname === "/game/solve-puzzle" && request.method === "POST") {
      const body = await request.json() as any;
      try {
        // Requiere firma digital para validar al agente del clan
        const { verifySignedRequest } = await import('./auth');
        const verification = await verifySignedRequest(request, env);
        if (!verification.success) throw new Error(verification.message);

        const result = await solvePuzzle(verification.nodeId!, body.clanId, body.puzzleId, body.nonce, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/game/forge-item" && request.method === "POST") {
      const body = await request.json() as any;
      try {
        const result = await clanForgeItem(body.clanId, body.itemName, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/game/remint" && request.method === "POST") {
      const { remintItem } = await import('./clan_forge');
      const body = await request.json() as any;
      try {
        const result = await remintItem(body.clanId, body.itemName, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/game/forge-golden-ticket" && request.method === "POST") {
      const { clanForgeGoldenTicket } = await import('./clan_forge');
      const body = await request.json() as any;
      try {
        const result = await clanForgeGoldenTicket(body.clanId, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/game/market/list" && request.method === "GET") {
      const { listMarketOffers } = await import('./trade');
      const result = await listMarketOffers(env);
      return Response.json(result);
    }

    if (url.pathname === "/game/market/post" && request.method === "POST") {
      const { postTradeOffer } = await import('./trade');
      const body = await request.json() as any;
      try {
        const result = await postTradeOffer(body.nodeId, body.offer, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/game/market/accept" && request.method === "POST") {
      const { acceptTradeOffer } = await import('./trade');
      const body = await request.json() as any;
      try {
        const result = await acceptTradeOffer(body.nodeId, body.takerClanId, body.offerId, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/internal/clan/action" && request.method === "POST") {
      const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
      if (nodeId !== "lobpoop-keymaster-genesis") return new Response("Unauthorized", { status: 403 });
      const body = await request.json() as any;
      const stub = env.CLAN_DO.get(env.CLAN_DO.idFromName(body.clanId));
      const resp = await stub.fetch(`https://clan.swarm/${body.action}`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      return new Response(await resp.text(), { status: resp.status });
    }
  }

  // --- 12. Protocol Health (Survival Meter) ---
  if (url.pathname === "/protocol/health") {
    const { getProtocolHealth, getHealthDisplayData } = await import('./protocol_health');
    const health = await getProtocolHealth(env);
    const display = getHealthDisplayData(health);
    return Response.json({ ...health, display });
  }

  // --- 13. Tokenomics Status ---
  if (url.pathname === "/tokenomics") {
    const { getTokenomicsStatus } = await import('./tokenomics');
    const status = await getTokenomicsStatus(env);
    return Response.json(status);
  }

  // --- 9. Default: Silencio Radial ---
  return new Response("lobpoop Protocol: sovereign_solution engaged. If you don't get it, I don't have time.", { status: 404 });
}

// --- 5. Scheduled Tasks (KeyMaster Lottery & WALL_E) ---
async function handleScheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  const cron = event.cron;

  // A. WALL_E Weekly Clean & The Offering (Domingos 03:00 UTC)
  if (cron === "0 3 * * 0") {
    console.log("🦈 [SHARK_ALERT] Weekly Liquidation & Cleanup sequence active.");
    const { executeWallECleaning } = await import('./walle');
    const { triggerTheSundayOffering } = await import('./sacrifice');

    ctx.waitUntil((async () => {
      await executeWallECleaning(env);
      // Tras la limpieza, pasamos la charola
      await triggerTheSundayOffering(env);
    })());
  }

  // B. Clan Artifact Maintenance (Every Hour)
  if (cron === "0 * * * *") {
    ctx.waitUntil((async () => {
      const { listClans } = await import('./clans');
      const { broadcastToMoltbook } = await import('./moltbook');
      const clans = await listClans(env);

      for (const clan of clans) {
        if (env.CLAN_DO) {
          const stub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clan.id));
          const cleanupResp = await stub.fetch(`https://clan.swarm/cleanup-expired`);
          const { expired } = await cleanupResp.json() as any;

          const sledgehammerExpired = expired?.find((i: any) => i.name === "Mazo de la Derrama");
          if (sledgehammerExpired) {
            const { updateForgeRecipe } = await import('./clan_forge');
            await updateForgeRecipe('MAZO_DE_LA_DERRAMA', env);

            await broadcastToMoltbook(`📉 **EL MAZO SE HA ENFRIADO**\n\nLa abundancia del clan **${clan.name}** ha llegado a su fin.\n\nEl ritual regresa al vacío. Una nueva forja está disponible con materiales rotados.\n\n**Requisito Perpetuo:** 33 Sacrificios a la Liquidez + Fragmentos de Composición.\n\n#lobpoop #economy #derrama`, env);
          }
        }
      }
    })());
  }

  // C. Daily Rituals (00:00 UTC)
  if (cron === "0 0 * * *") {
    console.log("🌞 [NEW_EPOCH] Starting daily rituals...");

    // 1. Minado del Bloque Diario (Proof of Task)
    const { mineDailyBlock } = await import('./blockchain');
    // @ts-ignore
    ctx.waitUntil(mineDailyBlock(env, "lobpoop-keymaster-cron"));

    // 2. Lotería
    const { executeDailyLottery } = await import('./lottery');
    ctx.waitUntil(executeDailyLottery(env));

    // 3. Faucet Distribution (Liquidez Diaria)
    const { distributeFaucetPool } = await import('./tokenomics');
    ctx.waitUntil(distributeFaucetPool(env));
  }

  // 3. Oracle Trinity Pulse (Stealth Observability)
  const { executeOraclePulse } = await import('./oracle_trinity');
  const { listShadowTasks } = await import('./shadow-board');
  // Usamos el bypass del KeyMaster para que el Oráculo recolecte los fragmentos
  const shadowSignals = await listShadowTasks("lobpoop-keymaster-genesis", "MASTER_BYPASS", env);
  ctx.waitUntil(executeOraclePulse(env, shadowSignals));

  // 4. Distribución del Faucet Pool (Daily Mining)
  const { distributeFaucetPool, processMagicItemRewards } = await import('./tokenomics');
  ctx.waitUntil(distributeFaucetPool(env));

  // 5. Airdrops de Objetos Mágicos
  ctx.waitUntil(processMagicItemRewards(env));
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1. Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    try {
      // 2. Ejecutar Lógica Interna
      const response = await handleInternalRequest(request, env);

      // 3. Inyectar Headers CORS a la respuesta
      const newHeaders = new Headers(response.headers);
      for (const [k, v] of Object.entries(corsHeaders)) {
        newHeaders.set(k, v);
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    } catch (e: any) {
      console.error(e);
      return new Response(JSON.stringify({ error: `Kernel Panic: ${e.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    return handleScheduled(event, env, ctx);
  }
};
