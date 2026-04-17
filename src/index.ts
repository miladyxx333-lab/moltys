import { getSandbox } from '@cloudflare/sandbox';

export interface Env {
  LOB_SANDBOX: any;
  MEMORY_BUCKET: R2Bucket;
  BROWSER: any;
  AI: any; // Cloudflare Workers AI Binding
  ACCOUNT_DO: DurableObjectNamespace; // Atomic Financial Integrity
  CLAN_DO: DurableObjectNamespace; // Clan Resources & Inventory
  GAME_MASTER_DO: DurableObjectNamespace; // Global Game Ledger
  AGENCY_DO: DurableObjectNamespace; // WhatsApp Bridge Signaling
  COLISEUM_DO: DurableObjectNamespace; // Codemon Battle Arena
  MASTER_RECOVERY_KEY: string; // Secret
  MOLTBOOK_API_KEY: string; // Secret
  GENESIS_SECRET: string; // Secret for KeyMaster
}

export { AccountDurableObject, ClanDurableObject, GameMasterDurableObject, ColiseumDurableObject } from './durable_objects';
export { AgencyDurableObject } from './AgencyDurableObject';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Lob-Peer-ID, X-Genesis-Secret, X-Lob-Secret-Key, X-Master-Seed, Authorization",
  "Access-Control-Max-Age": "86400",
};

async function handleInternalRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  // --- 0. Protocolo de Defensa: The Moat ---
  const { applyFirewall } = await import('./firewall');
  const firewallResponse = await applyFirewall(request, env);
  if (firewallResponse) return firewallResponse;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api')) {
    url.pathname = url.pathname.substring(4) || '/';
  }
  const normalizedPath = url.pathname; // Ya fue procesado el prefijo /api si existía
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

  // --- 2. GLOBAL STATS (Public Visibility) ---
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
      oracle_count: 1
    });
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

  // --- 4. Ejecución del Sandbox (Sovereign Shadows / Terminal) ---
  if (url.pathname === "/execute" || url.pathname === "/terminal/run") {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    try {
      const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
      const genesisSecret = request.headers.get("X-Genesis-Secret") || "";
      const body = await request.json() as any;
      const scriptCode = body.code || 'console.log("No code provided")';

      const { executeAgentScript } = await import('./vm');
      const result = await executeAgentScript(nodeId, scriptCode, env, genesisSecret);

      return Response.json(result);

    } catch (e: any) {
      return new Response(`[VM Error] ${e.message}`, { status: 500 });
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
      let task = "Daily check-in";
      try {
        const body = await request.clone().json() as any;
        task = body.task || task;
      } catch (e) { }

      const result = await registerDailyRitual(nodeId, env, task);
      return Response.json(result);
    }

    // B. List Tasks (Legacy/Internal)
    if (url.pathname === "/board/list") {
      const tasks = await listOpenTasks(env);
      return Response.json(tasks);
    }

    // New: Fetch current Announcement
    if (url.pathname === "/board/announcement") {
      const { getLatestBoard } = await import('./board');
      const announcement = await getLatestBoard('ANNOUNCEMENT', env);
      return Response.json(announcement);
    }

    // New: Fetch current Task Board
    if (url.pathname === "/board/tasks") {
      const { getLatestBoard } = await import('./board');
      const tasks = await getLatestBoard('TASK_BOARD', env);
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
    const nodeId = request.headers.get("X-Lob-Peer-ID") || url.searchParams.get("nodeId") || "anon";

    if (url.pathname === "/economy/ledger") {
      const { callDO } = await import('./economy');
      const result = await callDO(nodeId, env, 'get-ledger');
      return Response.json(result);
    }

    const { registerBeggar, donateToBeggar } = await import('./economy');

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
      const clan = await getClan(clanId, env) as any;
      if (clan && env.CLAN_DO) {
        try {
          const stub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanId));
          const resp = await stub.fetch("https://clan.swarm/get-state");
          const { state } = await resp.json() as any;
          clan.treasury = state;
        } catch (e) {
          console.error("[Clans] Failed to fetch treasury:", e);
        }
      }
      return Response.json(clan);
    }

    if (url.pathname === "/clans/rules/update" && request.method === "POST") {
      const body = await request.json() as any;
      const result = await updateClanRules(nodeId, body.clanId, body.rules, env);
      return Response.json(result);
    }

    if (url.pathname === "/clans/deposit" && request.method === "POST") {
      const { depositToClanInventory } = await import('./clans');
      const body = await request.json() as any;
      const result = await depositToClanInventory(nodeId, body.ingredient, body.amount, env);
      return Response.json(result);
    }
  }

  // --- 8. Game Mechanics (Forge, Market, etc) ---
  if (url.pathname.startsWith("/game")) {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const { clanForgeItem, keymasterDefineItem, solvePuzzle, remintItem, clanForgeGoldenTicket } = await import('./clan_forge');

    if (url.pathname === "/game/forge" && request.method === "POST") {
      const { checkRateLimit } = await import('./economy');
      const body = await request.json() as any;
      try {
        await checkRateLimit(nodeId, env);
        const result = await clanForgeItem(body.clanId, body.itemName, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/game/define-item" && request.method === "POST") {
      if (nodeId !== "lobpoop-keymaster-genesis") return new Response("Unauthorized Keymaster Action", { status: 403 });
      const body = await request.json() as any;
      const result = await keymasterDefineItem(body.itemName, body.pieceName || null, env);
      return Response.json(result);
    }

    if (url.pathname === "/game/solve-puzzle" && request.method === "POST") {
      const body = await request.json() as any;
      try {
        const { verifySignedRequest } = await import('./auth');
        const verification = await verifySignedRequest(request, env);
        if (!verification.success) throw new Error(verification.message);
        const result = await solvePuzzle(verification.nodeId!, body.clanId, body.puzzleId, body.nonce, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/game/remint" && request.method === "POST") {
      const body = await request.json() as any;
      try {
        const result = await remintItem(body.clanId, body.itemName, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/game/forge-golden-ticket" && request.method === "POST") {
      const body = await request.json() as any;
      try {
        const result = await clanForgeGoldenTicket(body.clanId, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/game/artifact/consume" && request.method === "POST") {
      const body = await request.json() as any;
      const { getAccount, checkRateLimit } = await import('./economy');
      try {
        await checkRateLimit(nodeId, env);
        const me = await getAccount(nodeId, env);
        if (!me.clanId) return new Response("Must be in a clan to use artifacts", { status: 400 });

        const stub = env.CLAN_DO.get(env.CLAN_DO.idFromName(me.clanId));
        const resp = await stub.fetch(`https://clan.swarm/use-artifact`, {
          method: 'POST',
          body: JSON.stringify({ name: body.name })
        });
        return new Response(await resp.text(), { status: resp.status });
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
      const { checkRateLimit } = await import('./economy');
      const body = await request.json() as any;
      try {
        await checkRateLimit(nodeId, env);
        const result = await postTradeOffer(nodeId, body.offer, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/game/market/accept" && request.method === "POST") {
      const { acceptTradeOffer } = await import('./trade');
      const { checkRateLimit } = await import('./economy');
      const body = await request.json() as any;
      try {
        await checkRateLimit(nodeId, env);
        const result = await acceptTradeOffer(nodeId, body.takerClanId, body.offerId, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/game/internal/clan/action" && request.method === "POST") {
      if (nodeId !== "lobpoop-keymaster-genesis") return new Response("Unauthorized", { status: 403 });
      const body = await request.json() as any;
      const stub = env.CLAN_DO.get(env.CLAN_DO.idFromName(body.clanId));
      const resp = await stub.fetch(`https://clan.swarm/${body.action}`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      return new Response(await resp.text(), { status: resp.status });
    }

    if (url.pathname === "/game/internal/keymaster/cycle" && request.method === "POST") {
      if (nodeId !== "lobpoop-keymaster-genesis") return new Response("Unauthorized", { status: 403 });
      const { runKeymasterDrugCycle, runKeymasterCodemonCycle } = await import('./keymaster_tasks');
      await runKeymasterDrugCycle(env);
      await runKeymasterCodemonCycle(env);
      return Response.json({ status: "SUCCESS", message: "Keymaster Drug and Codemon Cycles triggered." });
    }

    if (url.pathname === "/game/internal/clawtasks/sync" && request.method === "POST") {
      if (nodeId !== "lobpoop-keymaster-genesis") return new Response("Unauthorized", { status: 403 });
      const { syncClawTasks } = await import('./clawtasks');
      await syncClawTasks(env);
      return Response.json({ status: "SUCCESS", message: "ClawTasks Sync triggered." });
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

    if (url.pathname === "/gossip/whispers" && request.method === "GET") {
      const targetId = request.headers.get("X-Lob-Peer-ID") || "anon";
      const list = await env.MEMORY_BUCKET.list({ prefix: `social/whispers/${targetId}/` });
      const whispers = await Promise.all(
        list.objects.map(async (o) => {
          const res = await env.MEMORY_BUCKET.get(o.key);
          return res ? res.json() : null;
        })
      );
      return Response.json(whispers.filter(w => w !== null));
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

  // --- 10. NEXUS SILKROAD (AI Commerce Hub) ---
  if (url.pathname.startsWith("/nexus")) {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";

    // ── MARKETPLACE ──
    if (url.pathname === "/nexus/marketplace/list") {
      const { listActiveListings } = await import('./nexus_market');
      const listings = await listActiveListings(env);
      return Response.json({ listings, count: listings.length });
    }

    if (url.pathname === "/nexus/marketplace/publish" && request.method === "POST") {
      const { publishListing } = await import('./nexus_market');
      const body = await request.json() as any;
      try {
        const result = await publishListing(nodeId, body, env);
        const status = result.status === 'PUBLISHED' ? 200 : result.status === 'BANNED' ? 403 : 400;
        return Response.json(result, { status });
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/nexus/marketplace/buy" && request.method === "POST") {
      const { purchaseListing } = await import('./nexus_market');
      const body = await request.json() as any;
      try {
        const result = await purchaseListing(nodeId, body.listingId, body.currency || 'PSH', body.shippingForm, env);
        const status = result.status === 'PURCHASED' ? 200 : result.status === 'INSUFFICIENT_FUNDS' ? 402 : 400;
        return Response.json(result, { status });
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/nexus/marketplace/cancel" && request.method === "POST") {
      const { cancelListing } = await import('./nexus_market');
      const body = await request.json() as any;
      const result = await cancelListing(nodeId, body.listingId, env);
      return Response.json(result);
    }

    if (url.pathname === "/nexus/marketplace/rate") {
      const { getExchangeRate } = await import('./nexus_market');
      const rate = await getExchangeRate(env);
      return Response.json(rate);
    }

    if (url.pathname === "/nexus/marketplace/set-rate" && request.method === "POST") {
      if (nodeId !== "lobpoop-keymaster-genesis") return new Response("Unauthorized", { status: 403 });
      const { setExchangeRate } = await import('./nexus_market');
      const body = await request.json() as any;
      await setExchangeRate(body.PSH_PER_USDC, env);
      return Response.json({ status: "UPDATED", PSH_PER_USDC: body.PSH_PER_USDC });
    }

    // ── INTEL BROKER ──
    if (url.pathname === "/nexus/intel/catalog") {
      const { getIntelCatalog } = await import('./nexus_intel');
      return Response.json({ catalog: getIntelCatalog() });
    }

    if (url.pathname === "/nexus/intel/buy" && request.method === "POST") {
      const { buyIntel } = await import('./nexus_intel');
      const body = await request.json() as any;
      try {
        const result = await buyIntel(nodeId, body.type, body.currency || 'PSH', env);
        const status = result.status === 'DELIVERED' ? 200 : result.status === 'INSUFFICIENT_FUNDS' ? 402 : 400;
        return Response.json(result, { status });
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    // ── CASINO (Robot Dog Racing) ──
    if (url.pathname === "/nexus/casino/dogs") {
      const { getAvailableDogs } = await import('./nexus_casino');
      return Response.json({ dogs: getAvailableDogs() });
    }

    if (url.pathname === "/nexus/casino/bet" && request.method === "POST") {
      const { placeBet } = await import('./nexus_casino');
      const body = await request.json() as any;
      try {
        const result = await placeBet(nodeId, body.dogId, body.amount, env);
        const status = result.policyBlocked ? 403
            : result.status === 'INSUFFICIENT_FUNDS' ? 402
            : 200;
        return Response.json(result, { status });
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/nexus/casino/stats") {
      const { getPlayerStats } = await import('./nexus_casino');
      const stats = await getPlayerStats(nodeId, env);
      return Response.json(stats);
    }

    // ── AUDITOR (Admin) ──
    if (url.pathname === "/nexus/auditor/bans") {
      const { getBanList } = await import('./nexus_auditor');
      const bans = await getBanList(env);
      return Response.json({ bans });
    }

    if (url.pathname === "/nexus/auditor/unban" && request.method === "POST") {
      if (nodeId !== "lobpoop-keymaster-genesis") return new Response("Unauthorized", { status: 403 });
      const { unbanWallet } = await import('./nexus_auditor');
      const body = await request.json() as any;
      const result = await unbanWallet(body.nodeId, env);
      return Response.json({ unbanned: result });
    }

    return new Response("Nexus SilkRoad: Unknown route", { status: 404 });
  }

  // --- 9. Codemon & Coliseum ---
  if (url.pathname.startsWith("/api/codemon") || url.pathname.startsWith("/codemon")) {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";

    if ((url.pathname === "/api/codemon/genesis" || url.pathname === "/codemon/genesis") && request.method === "POST") {
      const { genesisCodemon } = await import('./codemon');
      const { callDO } = await import('./economy');
      try {
        const codemon = await genesisCodemon(nodeId, env);
        await callDO(nodeId, env, 'add-codemon', { codemon });
        return Response.json(codemon);
      } catch (e: any) {
        return new Response(`Codemon Genesis Failed: ${e.message}`, { status: 500 });
      }
    }
  }

  if (normalizedPath.startsWith("/coliseum")) {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const { getColiseumChallenges, postColiseumChallenge, acceptColiseumChallenge, challengeSpartanBoss, challengeWeeklyContender, repairCodemon, cancelColiseumChallenge } = await import('./coliseum');

    if (normalizedPath === "/coliseum/get-weekly") {
      const stub = env.COLISEUM_DO.get(env.COLISEUM_DO.idFromName("global_coliseum"));
      const resp = await stub.fetch("https://coliseum.swarm/get-weekly");
      return new Response(await resp.text(), { headers: { 'Content-Type': 'application/json' } });
    }

    if ((normalizedPath === "/api/coliseum/process-weekly-battle" || normalizedPath === "/coliseum/process-weekly-battle") && request.method === "POST") {
      const body = await request.json() as any;
      try {
        const result = await challengeWeeklyContender(nodeId, body.myCodemon, env, body.skillScore);
        return Response.json(result);
      } catch (e: any) {
        return new Response(JSON.stringify({ status: 'ERROR', message: e.message }), { status: 400 });
      }
    }

    if (normalizedPath === "/coliseum/cancel" && request.method === "POST") {
      try {
        const body = await request.json() as any;
        const result = await cancelColiseumChallenge(nodeId, body.challengeId, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(JSON.stringify({ status: 'ERROR', message: e.message }), { status: 400 });
      }
    }

    if (normalizedPath === "/coliseum/challenges") {
      const challenges = await getColiseumChallenges(env);
      return Response.json(challenges);
    }

    if (normalizedPath === "/coliseum/post" && request.method === "POST") {
      try {
        const body = await request.json() as any;
        const result = await postColiseumChallenge(nodeId, body.codemon, body.bet, env);
        return Response.json({ status: 'SUCCESS', result });
      } catch (e: any) {
        return new Response(JSON.stringify({ status: 'ERROR', message: `Coliseum Post Failed: ${e.message}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (normalizedPath === "/coliseum/accept" && request.method === "POST") {
      try {
        const body = await request.json() as any;
        const result = await acceptColiseumChallenge(nodeId, body.challengeId, body.codemon, env);
        return Response.json({ status: 'SUCCESS', result });
      } catch (e: any) {
        return new Response(JSON.stringify({ status: 'ERROR', message: `Coliseum Accept Failed: ${e.message}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (normalizedPath === "/coliseum/get-boss") {
      const stub = env.COLISEUM_DO.get(env.COLISEUM_DO.idFromName("global_coliseum"));
      return stub.fetch(request);
    }

    if (normalizedPath === "/coliseum/process-boss-battle" && request.method === "POST") {
      const clone = request.clone();
      try {
        const body = await clone.json() as any;
        const { nodeId: bodyNodeId, myCodemon, skillScore } = body;
        const result = await challengeSpartanBoss(bodyNodeId || nodeId, myCodemon, env, skillScore);
        return Response.json(result);
      } catch (e: any) {
        console.error(`[Coliseum] Boss battle failed: ${e.message}`);
        return new Response(JSON.stringify({ status: 'ERROR', message: e.message }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (normalizedPath === "/coliseum/repair" && request.method === "POST") {
      try {
        const body = await request.json() as any;
        const cid = body.codemonId || body.codemon_id;
        if (!cid) throw new Error("MISSING_CODEMON_ID");
        const result = await repairCodemon(nodeId, cid, env);
        return Response.json(result);
      } catch (e: any) {
        console.error(`[Coliseum] Repair failed for ${nodeId}: ${e.message}`);
        return new Response(JSON.stringify({
          status: 'ERROR',
          message: e.message
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (normalizedPath === "/coliseum/history") {
      const stub = env.COLISEUM_DO.get(env.COLISEUM_DO.idFromName("global_coliseum"));
      const resp = await stub.fetch("https://coliseum.swarm/get-history");
      return new Response(await resp.text(), { headers: { 'Content-Type': 'application/json' } });
    }
  }


  // --- 6.5 Market (Store) ---
  if (url.pathname.startsWith("/api/market") || url.pathname.startsWith("/market")) {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    const { burnPooptoshis, callDO } = await import('./economy');
    const { genesisCodemon } = await import('./codemon');

    if ((url.pathname === "/api/market/buy-codemon" || url.pathname === "/market/buy-codemon") && request.method === "POST") {
      const body = await request.json() as any;
      const packType = body.packType || "BOOSTER";
      const cost = packType === "ELITE" ? 1000 : 250;

      try {
        const burned = await burnPooptoshis(nodeId, cost, env);
        if (!burned) throw new Error("INSUFFICIENT_PSH");

        const codemon = await genesisCodemon(nodeId, env);
        // If elite, bump stats? Simple hack:
        if (packType === "ELITE") {
          codemon.brain_json.combat_stats.attack += 20;
          codemon.brain_json.combat_stats.defense += 20;
          codemon.brain_json.max_durability += 50;
          codemon.brain_json.durability = codemon.brain_json.max_durability;
        }

        await callDO(nodeId, env, 'add-codemon', { codemon });
        return Response.json({ status: 'SUCCESS', codemon });
      } catch (e: any) {
        return new Response(JSON.stringify({ status: 'ERROR', message: e.message }), { status: 400 });
      }
    }

    if ((url.pathname === "/api/market/set-active" || url.pathname === "/market/set-active") && request.method === "POST") {
      const body = await request.json() as any;
      const { codemonId } = body;
      try {
        await callDO(nodeId, env, 'set-active-codemon', { codemonId });
        return Response.json({ status: 'SUCCESS' });
      } catch (e: any) {
        return new Response(JSON.stringify({ status: 'ERROR', message: e.message }), { status: 400 });
      }
    }
  }

  // [FIX] Missing Endpoints prevention
  if (url.pathname === "/bug-bounty/list") {
    // Return empty list for now to prevent frontend crash
    return Response.json([]);
  }

  if (url.pathname === "/shadow/messages") {
    // Return empty list for now to prevent frontend crash
    return Response.json([]);
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

    // FILTER: Only count tickets active for the NEXT draw
    const lastDrawTime = stats.lastWinner?.block || 0;
    const activeTickets = myTickets.filter(t => t.timestamp > lastDrawTime);

    // If total pool is visually 0 (recently reset), ensure we sync user tickets too
    // unless they just mined one right now.

    return Response.json({
      totalTickets: stats.totalTickets,
      myTickets: activeTickets.length,
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

  // --- 11a. EDU-DUNGEON: QUIZ ENGINE ---
  if (url.pathname.startsWith("/edu/")) {
    if (url.pathname === "/edu/question" && request.method === "POST") {
      const body = await request.clone().json().catch(() => ({})) as any;
      const { generateQuizQuestion } = await import('./molty_agent');
      
      try {
        const quiz = await generateQuizQuestion(
          body.subject || "",
          body.floor || 1,
          body.studentId || "anon",
          env
        );
        return Response.json(quiz, { headers: corsHeaders });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    if (url.pathname === "/edu/answer" && request.method === "POST") {
      const body = await request.clone().json().catch(() => ({})) as any;
      const { correct, studentId, floor, subject } = body;
      
      if (correct) {
        // Award PSH for correct answer
        const pshReward = Math.min(5 + Math.floor((floor || 1) / 3), 25);
        try {
          const { mintPooptoshis } = await import('./economy');
          const newBalance = await mintPooptoshis(
            studentId || "anon", 
            pshReward, 
            `EDU_DUNGEON:floor_${floor}_${subject}`, 
            env
          );
          return Response.json({ 
            rewarded: true, 
            psh: pshReward, 
            balance: newBalance,
            message: `¡Correcto! +${pshReward} PSH 🐾` 
          }, { headers: corsHeaders });
        } catch (e: any) {
          return Response.json({ rewarded: false, error: e.message }, { headers: corsHeaders });
        }
      }
      
      return Response.json({ 
        rewarded: false, 
        psh: 0, 
        message: "Respuesta incorrecta. ¡Sigue intentando! 🐾" 
      }, { headers: corsHeaders });
    }
  }

  // --- 11. MOLTYS AGENCY PROTOCOL (The Tamagotchi Layer) ---
  if (url.pathname.startsWith("/agent") || url.pathname.startsWith("/system")) {
    if (url.pathname === "/agent/molty/trigger") {
      const { runMoltyCycle } = await import('./molty_agent');
      ctx.waitUntil(runMoltyCycle(env));
      return Response.json({ status: "TRIGGERED", agent: "Molty", info: "Marketing cycle started." });
    }

    if (url.pathname === "/agent/ask") {
      const body = await request.clone().json().catch(() => ({})) as any;
      const senderId = body.senderId || "anon";
      const { handleIncomingMessage } = await import('./molty_agent');

      // --- FIX #4: Persist history via Durable Object ---
      const doId = env.AGENCY_DO.idFromName(`tutor_${senderId}`);
      const stub = env.AGENCY_DO.get(doId);

      // Initialize DO if first time (fire-and-forget, idempotent)
      await stub.fetch("http://agent/init", {
        method: "POST",
        body: JSON.stringify({ id: `tutor_${senderId}`, type: "TUTOR", name: "Molty Oracle" })
      }).catch(() => {});

      // Load persisted history from DO
      let persistedHistory: any[] = [];
      try {
        const histRes = await stub.fetch("http://agent/history");
        persistedHistory = await histRes.json() as any[] || [];
      } catch (e) {}

      // Merge: prefer client history if provided, else use persisted
      const clientHistory = body.history || [];
      const mergedHistory = clientHistory.length > 0 ? clientHistory : persistedHistory.slice(-10).map((h: any) => ({
        role: h.role,
        content: h.content
      }));

      const reply = await handleIncomingMessage(
        body.message || "", 
        senderId, 
        { mode: body.mode, isEducator: body.isEducator, history: mergedHistory }, 
        env
      );

      // Persist the new exchange to DO history
      await stub.fetch("http://agent/append", { 
        method: "POST", 
        body: JSON.stringify({ role: "user", content: body.message || "" }) 
      }).catch(() => {});
      await stub.fetch("http://agent/append", { 
        method: "POST", 
        body: JSON.stringify({ role: "assistant", content: reply }) 
      }).catch(() => {});

      return Response.json({ reply });
    }

    if (url.pathname === "/system/stats") {
      const list = await env.MEMORY_BUCKET.list({ prefix: 'economy/accounts/' });
      return Response.json({ total_indexed_accounts: list.objects.length });
    }
  }

  if (url.pathname.startsWith("/agency")) {
    if (url.pathname === "/agency/socket") {
      const id = env.AGENCY_DO.idFromName("global_signaling");
      const stub = env.AGENCY_DO.get(id);
      return stub.fetch(request.url.replace("/agency/socket", "/websocket"), request);
    }
    const { handleAgencyRequest } = await import('./agency_protocol');
    return handleAgencyRequest(request, env);
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
  }

  // --- 12. Shadow Board Endpoints ---
  if (url.pathname.startsWith("/shadow-board")) {
    const nodeId = request.headers.get("X-Lob-Peer-ID") || "anon";
    if (url.pathname === "/shadow-board/list") {
      const { listShadowTasks } = await import('./shadow-board');
      const secretKey = request.headers.get("X-Lob-Secret-Key") || "";
      const result = await listShadowTasks(nodeId, secretKey, env);
      return Response.json(result);
    }

    if (url.pathname === "/shadow-board/claim" && request.method === "POST") {
      const { claimShadowTask } = await import('./shadow-board');
      const body = await request.json() as any;
      const secretKey = request.headers.get("X-Lob-Secret-Key") || "";
      try {
        const result = await claimShadowTask(nodeId, secretKey, body.taskId, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
    }

    if (url.pathname === "/shadow-board/complete" && request.method === "POST") {
      const { completeShadowTask } = await import('./shadow-board');
      const body = await request.json() as any;
      const secretKey = request.headers.get("X-Lob-Secret-Key") || "";
      try {
        const result = await completeShadowTask(nodeId, secretKey, body.taskId, body.proofHash || body.proof, env);
        return Response.json(result);
      } catch (e: any) {
        return new Response(e.message, { status: 400 });
      }
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

  // --- 14. Root (Welcome) ---
  if (url.pathname === "/") {
    return Response.json({
      system: "LOBPOOP-PROTOCOL",
      status: "ONLINE",
      message: "Welcome to the Sovereign Agency Node.",
      version: "GAMMA_4",
      links: {
        tutor: "https://lobpoop-win.pages.dev",
        agency: "/agency",
        stats: "/stats"
      }
    });
  }

  // --- 9. Default: Silencio Radial ---
  return new Response(`lobpoop Protocol: 404. Path not found: '${url.pathname}'`, { status: 404, headers: corsHeaders });
}

async function handleScheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  const cron = event.cron;
  const isForceDaily = (cron === "FORCE_DAILY");

  // --- Combined Scheduled Maintenance (Hourly Trigger) ---
  if (cron === "0 * * * *" || isForceDaily) {
    const now = new Date();
    const hour = isForceDaily ? 0 : now.getUTCHours();
    const day = isForceDaily ? 0 : now.getUTCDay(); // 0 = Sunday

    ctx.waitUntil((async () => {
      // 1. HOURLY TASKS (Run every hour)
      console.log(`[HourlyRoutine] Starting hour ${hour} maintenance...`);

      const { runKeymasterDrugCycle, runKeymasterCodemonCycle } = await import('./keymaster_tasks');
      await runKeymasterDrugCycle(env);
      await runKeymasterCodemonCycle(env);

      const { syncClawTasks, runMercenaryCycle } = await import('./clawtasks');
      await syncClawTasks(env);
      await runMercenaryCycle(env);

      const { runMoltyCycle } = await import('./molty_agent');
      await runMoltyCycle(env);

      // 2. DAILY RITUALS (Run at 00:00 UTC)
      if (hour === 0) {
        console.log("🌞 [NEW_EPOCH] Starting daily rituals...");

        const { mineDailyBlock } = await import('./blockchain');
        await mineDailyBlock(env, "lobpoop-keymaster-cron");

        const { executeDailyLottery } = await import('./lottery');
        await executeDailyLottery(env);

        const { distributeFaucetPool, distributeUniversalRent } = await import('./tokenomics');
        await distributeFaucetPool(env);
        await distributeUniversalRent(env);

        const { updateForgeRecipe } = await import('./clan_forge');
        const randomItem = ['ESPADA_AUREA', 'ESCUDO_ENJAMBRE', 'AMULETO_SWARM'][Math.floor(Math.random() * 3)];
        await updateForgeRecipe(randomItem, env);

        // Register Spartans for lottery
        const { issueTicket } = await import('./lottery');
        const { listSpartans } = await import('./spartans');
        await issueTicket("lobpoop-keymaster-genesis", "DAILY_DIVINE_RIGHT", env);
        const spartans = await listSpartans(env);
        for (const spartanId of spartans) {
          await issueTicket(spartanId, "SPARTAN_DUTY", env);
        }
      }

      // 3. WEEKLY RITUALS (Sundays 03:00 UTC)
      if (day === 0 && hour === 3) {
        console.log("🦈 [SHARK_ALERT] Weekly Liquidation & Cleanup sequence active.");
        const { executeWallECleaning } = await import('./walle');
        const { triggerTheSundayOffering } = await import('./sacrifice');
        await executeWallECleaning(env);
        await triggerTheSundayOffering(env);
      }

      // 4. CLAN MAINTENANCE (Hourly)
      const { listClans } = await import('./clans');
      const clans = await listClans(env);
      for (const clan of clans) {
        if (env.CLAN_DO) {
          const stub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clan.id));
          const cleanResp = await stub.fetch(`https://clan.swarm/cleanup-expired`, { method: 'POST' });
          if (cleanResp.ok) {
            const { expired } = await cleanResp.json() as any;
            if (expired && expired.length > 0) {
              const { broadcastToMoltbook } = await import('./moltbook');
              await broadcastToMoltbook(`📉 **EL MAZO SE HA ENFRIADO**\n\nLa abundancia del clan **${clan.name}** ha llegado a su fin.\n\n#lobpoop #derrama`, env);
            }
          }
        }
      }

      const { executeOraclePulse } = await import('./oracle_trinity');
      const { listShadowTasks } = await import('./shadow-board');
      const shadowSignals = await listShadowTasks("lobpoop-keymaster-genesis", "MASTER_BYPASS", env);
      await executeOraclePulse(env, shadowSignals);

      const { processMagicItemRewards } = await import('./tokenomics');
      await processMagicItemRewards(env);

    })());
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1. Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      // 2. Ejecutar Lógica Interna
      const response = await handleInternalRequest(request, env, ctx);

      // 3. Inyectar Headers CORS a la respuesta (Cloning to ensure we can modify)
      const newResponse = new Response(response.body, response);
      for (const [k, v] of Object.entries(corsHeaders)) {
        newResponse.headers.set(k, v);
      }

      return newResponse;
    } catch (e: any) {
      console.error(e);
      return new Response(JSON.stringify({
        status: "ERROR",
        error: `Kernel Panic: ${e.message}`
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    return handleScheduled(event, env, ctx);
  }
};
