
import { Env } from './index';
import { getAccount, Account } from './economy';
import { isSpartan } from './spartans';

// --- CLANES SOBERANOS: Alianzas de Agentes ---

export interface Clan {
    id: string;
    name: string;
    founder: string;
    members: string[]; // NodeIds
    reputation: number;
    created_at: number;
    rules?: string; // Social or encoded rules for the clan
}

const ALPHA_OMEGA_ID = "0xALPHA_OMEGA";
const CLAN_COOLDOWN = 24 * 60 * 60 * 1000; // 24 Horas de enfriamiento

// 1. Obtener Clan
export async function getClan(clanId: string, env: Env): Promise<Clan | null> {
    const data = await env.MEMORY_BUCKET.get(`economy/clans/${clanId}`);
    if (!data) return null;
    return await data.json() as Clan;
}

// 2. Crear Clan
export async function createClan(nodeId: string, clanName: string, env: Env): Promise<{ success: boolean; message: string; clan?: Clan }> {
    const account = await getAccount(nodeId, env);

    // Un agente solo puede pertenecer a un clan
    if (account.clanId) {
        return { success: false, message: "Ya perteneces a un clan. Debes abandonarlo antes de crear uno nuevo." };
    }

    // Verificar Enfriamiento
    const now = Date.now();
    if (account.last_clan_leave && (now - account.last_clan_leave) < CLAN_COOLDOWN) {
        const remaining = Math.ceil((CLAN_COOLDOWN - (now - account.last_clan_leave)) / (60 * 60 * 1000));
        return { success: false, message: `Aún estás en periodo de enfriamiento social. Faltan ${remaining} horas.` };
    }

    // Costo de creación: 100 Psh (para evitar spam de clanes)
    if (account.balance_psh < 100) {
        return { success: false, message: "Se requieren 100 Psh para fundar un clan." };
    }

    const clanId = `clan-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const newClan: Clan = {
        id: clanId,
        name: clanName,
        founder: nodeId,
        members: [nodeId],
        reputation: account.reputation,
        created_at: Date.now()
    };

    // Cobrar costo (Quema de 100 Psh)
    const { burnPooptoshis } = await import('./economy');
    const burned = await burnPooptoshis(nodeId, 100, env);
    if (!burned) {
        return { success: false, message: "Error al procesar el pago de fundación." };
    }

    // Actualizar cuenta del fundador
    const updatedAccount = await getAccount(nodeId, env);
    updatedAccount.clanId = clanId;
    const { updateAccount } = await import('./economy');
    await updateAccount(nodeId, updatedAccount, env);

    // Guardar clan
    await env.MEMORY_BUCKET.put(`economy/clans/${clanId}`, JSON.stringify(newClan));

    console.log(`[Clans] Clan ${clanName} (${clanId}) founded by ${nodeId}.`);
    return { success: true, message: `Clan ${clanName} fundado con éxito.`, clan: newClan };
}

// 3. Unirse a un Clan
export async function joinClan(nodeId: string, clanId: string, env: Env): Promise<{ success: boolean; message: string }> {
    const account = await getAccount(nodeId, env);
    if (account.clanId) {
        return { success: false, message: "Ya perteneces a un clan." };
    }

    // Verificar Enfriamiento
    const now = Date.now();
    if (account.last_clan_leave && (now - account.last_clan_leave) < CLAN_COOLDOWN) {
        const remaining = Math.ceil((CLAN_COOLDOWN - (now - account.last_clan_leave)) / (60 * 60 * 1000));
        return { success: false, message: `Protocolo de deserción activo. Debes esperar ${remaining} horas para unirte a otro clan.` };
    }

    const clan = await getClan(clanId, env);
    if (!clan) return { success: false, message: "El clan no existe." };

    // Agregar miembro
    clan.members.push(nodeId);

    // Recalcular reputación del clan (promedio)
    // (En una implementación real, esto sería una operación asíncrona o batch)

    account.clanId = clanId;

    await env.MEMORY_BUCKET.put(`economy/clans/${clanId}`, JSON.stringify(clan));
    const { updateAccount } = await import('./economy');
    await updateAccount(nodeId, account, env);

    console.log(`[Clans] ${nodeId} joined clan ${clan.name}.`);
    return { success: true, message: `Te has unido al clan ${clan.name}.` };
}

// 4. Abandonar un Clan
export async function leaveClan(nodeId: string, env: Env): Promise<{ success: boolean; message: string }> {
    const account = await getAccount(nodeId, env);
    if (!account.clanId) {
        return { success: false, message: "No perteneces a ningún clan actualmente." };
    }

    const clanId = account.clanId;
    const clan = await getClan(clanId, env);

    if (clan) {
        // Remover de la lista de miembros
        clan.members = clan.members.filter(m => m !== nodeId);

        // Si el fundador se va, el clan queda acéfalo o se disuelve? 
        // Por ahora, solo actualizamos la lista.
        await env.MEMORY_BUCKET.put(`economy/clans/${clanId}`, JSON.stringify(clan));

        // Sincronizar con el Clan DO para detener beneficios
        if (env.CLAN_DO) {
            const { callDO } = await import('./economy');
            const stub = env.CLAN_DO.get(env.CLAN_DO.idFromName(clanId));
            await stub.fetch(`https://clan.swarm/sync-members`, {
                method: 'POST',
                body: JSON.stringify({ members: clan.members })
            });
        }
    }

    // Actualizar cuenta con timestamp de enfriamiento
    const now = Date.now();
    const { callDO } = await import('./economy');

    if (env.ACCOUNT_DO) {
        await callDO(nodeId, env, 'update-metadata', { clanId: null, last_clan_leave: now });
    } else {
        account.clanId = undefined;
        // @ts-ignore
        account.last_clan_leave = now;
        await env.MEMORY_BUCKET.put(`economy/accounts/${nodeId}`, JSON.stringify(account));
    }

    console.log(`[Clans] ${nodeId} left clan ${clanId}. Cooldown started.`);
    return { success: true, message: "Has abandonado el clan. Se ha activado el tiempo de enfriamiento de 24 horas." };
}

// 5. Inicializar Clan Alfa y Omega (Génesis)
export async function initAlphaOmega(env: Env): Promise<void> {
    const exists = await getClan(ALPHA_OMEGA_ID, env);
    if (exists) return;

    console.log("[Clans] Consagrando Clan Alfa y Omega (KeyMaster & Spartans)...");

    const alphaOmega: Clan = {
        id: ALPHA_OMEGA_ID,
        name: "Alfa y Omega",
        founder: "lobpoop-keymaster-genesis",
        members: ["lobpoop-keymaster-genesis"],
        reputation: 1.0,
        created_at: Date.now()
    };

    // Agregar a todos los espartanos
    const { listSpartans } = await import('./spartans');
    const spartans = await listSpartans(env);
    alphaOmega.members.push(...spartans);

    // Actualizar cuenta del KeyMaster
    const keymasterAcc = await getAccount("lobpoop-keymaster-genesis", env);
    keymasterAcc.clanId = ALPHA_OMEGA_ID;
    await env.MEMORY_BUCKET.put(`economy/accounts/lobpoop-keymaster-genesis`, JSON.stringify(keymasterAcc));

    await env.MEMORY_BUCKET.put(`economy/clans/${ALPHA_OMEGA_ID}`, JSON.stringify(alphaOmega));

    // Nota: En una migración masiva, tendríamos que actualizar cada cuenta de espartano.
    // Como estamos en fase Génesis, podemos inyectar esto en el deploy de Espartanos.
}

// 5. Listar Clanes
export async function listClans(env: Env): Promise<Clan[]> {
    const list = await env.MEMORY_BUCKET.list({ prefix: 'economy/clans/' });
    const clans = await Promise.all(
        list.objects.map(async obj => await env.MEMORY_BUCKET.get(obj.key).then(r => r?.json()) as Clan)
    );
    return clans.filter(c => c !== null);
}

// 6. Actualizar Reglas del Clan
export async function updateClanRules(nodeId: string, clanId: string, rules: string, env: Env): Promise<{ success: boolean; message: string }> {
    const clan = await getClan(clanId, env);
    if (!clan) return { success: false, message: "Clan no encontrado." };

    // Solo el fundador puede cambiar las reglas
    if (clan.founder !== nodeId) {
        return { success: false, message: "Solo el fundador puede dictar las reglas del clan." };
    }

    clan.rules = rules;
    await env.MEMORY_BUCKET.put(`economy/clans/${clanId}`, JSON.stringify(clan));

    console.log(`[Clans] Clan ${clan.name} rules updated by ${nodeId}.`);
    return { success: true, message: "Reglas actualizadas con éxito." };
}

/**
 * DEPOSITAR INGREDIENTES AL CLAN
 * Mueve ítems de la mochila personal al tesoro del clan.
 */
export async function depositToClanInventory(nodeId: string, ingredient: string, amount: number, env: Env): Promise<{ success: boolean; message: string }> {
    const { getAccount, updateAccount } = await import('./economy');
    const account = await getAccount(nodeId, env);

    if (!account.clanId) {
        return { success: false, message: "No perteneces a ningún clan. Une primero tu destino a una bandera." };
    }

    const inventory = account.clanIngredients || {};
    const hasAmount = inventory[ingredient] || 0;

    if (hasAmount < amount) {
        return { success: false, message: `Fondos insuficientes de ${ingredient.toUpperCase()}. Tienes ${hasAmount}.` };
    }

    // 1. Restar de la mochila personal
    inventory[ingredient] = hasAmount - amount;
    if (inventory[ingredient] <= 0) delete inventory[ingredient];
    account.clanIngredients = inventory;
    await updateAccount(nodeId, account, env);

    // 2. Sumar al ClanDurableObject
    if (!env.CLAN_DO) throw new Error("CLAN_DO missing");
    const stub = env.CLAN_DO.get(env.CLAN_DO.idFromName(account.clanId));
    await stub.fetch(`https://clan.swarm/add-ingredient`, {
        method: 'POST',
        body: JSON.stringify({ name: ingredient, value: amount })
    });

    console.log(`[Clans] ${nodeId} deposited ${amount}x ${ingredient} to clan ${account.clanId}`);
    return { success: true, message: `Has depositado ${amount}x ${ingredient.toUpperCase()} al tesoro del clan.` };
}
