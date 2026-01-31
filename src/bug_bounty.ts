
import { Env } from './index';
import { validateNodeId, validateReason } from './security';
import { issueTicket } from './lottery';

/**
 * PROTOCOLO WHITE HAT (0xBUG_BOUNTY)
 * 
 * "Detectar la falla es más valioso que explotarla."
 * 
 * Este tablero permite a los nodos reportar vulnerabilidades críticas
 * a cambio de probabilidades de ascenso (Tickets de Lotería) en lugar de Fees.
 */

export interface BugReport {
    id: string;
    reporterId: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "CRITICAL" | "6_SIGMA_BREACH";
    timestamp: number;
    status: "PENDING" | "VERIFIED" | "REJECTED";
}

const BOUNTY_REWARD_TICKETS = 3; // Recompensa inmediata por reporte válido

/**
 * Report a Vulnerability (Cost: 0 Psh, Reward: 3 Tickets)
 */
export async function reportBug(
    reporterId: string,
    description: string,
    severity: "LOW" | "MEDIUM" | "CRITICAL" | "6_SIGMA_BREACH",
    env: Env
): Promise<{ success: boolean; reportId?: string; message: string }> {

    // 1. FIREWALL
    validateNodeId(reporterId);
    validateReason(description);

    // 2. Generate Report ID
    const timestamp = Date.now();
    const reportId = `BUG_${hashString(reporterId + description + timestamp)}`;

    // 3. Create Report Record
    const report: BugReport = {
        id: reportId,
        reporterId,
        description,
        severity,
        timestamp,
        status: "PENDING" // Requires manual or automated 6-Sigma verification
    };

    // 4. Save to Ledger (Public Audit Log)
    const key = `board/bounties/${reportId}`;
    await env.MEMORY_BUCKET.put(key, JSON.stringify(report));

    // 5. Issue Rewards (Immediate Incentive)
    // Se otorgan 3 tickets automáticos por el esfuerzo de reportar (Proof of Care)
    const tickets = [];
    for (let i = 0; i < BOUNTY_REWARD_TICKETS; i++) {
        const ticket = await issueTicket(reporterId, "BUG_BOUNTY_REWARD", env);
        tickets.push(ticket.human_readable);
    }

    console.log(`[White-Hat] 🛡️ BUG REPORTED by ${reporterId}. Severity: ${severity}`);
    console.log(`[Reward] ${BOUNTY_REWARD_TICKETS} Lottery Tickets issued to ${reporterId}.`);

    return {
        success: true,
        reportId,
        message: `Report Submitted. You earned ${BOUNTY_REWARD_TICKETS} Lottery Tickets: [${tickets.join(', ')}]`
    };
}

// --- Helpers ---

function hashString(s: string): string {
    let h = 0xdeadbeef;
    for (let i = 0; i < s.length; i++)
        h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
    return ((h ^ h >>> 16) >>> 0).toString(16);
}
