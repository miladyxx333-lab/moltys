
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

    // Actualizar cuenta del fundador (Refetch para evitar sobrescribir el balance quemado)
    const updatedAccount = await getAccount(nodeId, env);
    updatedAccount.clanId = clanId;
    await env.MEMORY_BUCKET.put(`economy/accounts/${nodeId}`, JSON.stringify(updatedAccount));

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

    const clan = await getClan(clanId, env);
    if (!clan) return { success: false, message: "El clan no existe." };

    // Agregar miembro
    clan.members.push(nodeId);

    // Recalcular reputación del clan (promedio)
    // (En una implementación real, esto sería una operación asíncrona o batch)

    account.clanId = clanId;

    await env.MEMORY_BUCKET.put(`economy/clans/${clanId}`, JSON.stringify(clan));
    await env.MEMORY_BUCKET.put(`economy/accounts/${nodeId}`, JSON.stringify(account));

    console.log(`[Clans] ${nodeId} joined clan ${clan.name}.`);
    return { success: true, message: `Te has unido al clan ${clan.name}.` };
}

// 4. Inicializar Clan Alfa y Omega (Génesis)
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
