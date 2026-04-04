import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { ShieldAlert, ShieldCheck, Key } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
//  OWS WALLET ADAPTER (Frontend Implementation)
//  Implements the standard @open-wallet-standard interface
//  for dApp interop, complete with a local Policy Engine.
// ═══════════════════════════════════════════════════════════

interface PolicyRule {
    type: string;
    maxAmountUsd?: number;
    maxDailyUsd?: number;
    action: 'DENY' | 'WARN';
}

interface OWSPolicy {
    id: string;
    name: string;
    rules: PolicyRule[];
}

export const NEXUS_SPEND_POLICY: OWSPolicy = {
    id: "nexus-spend-limit-v1",
    name: "Nexus SilkRoad Spend Governance",
    rules: [
        { type: "maxTransaction", maxAmountUsd: 50.00, action: "DENY" },
        { type: "dailyLimit", maxDailyUsd: 200.00, action: "DENY" }
    ]
};

interface TransactionRequest {
    chain: string;
    description: string;
    amountPsh: number;
    amountUsdc: number; // For policy evaluation
    type: 'marketplace_buy' | 'intel_buy' | 'casino_bet';
}

interface OWSContextType {
    connected: boolean;
    agentId: string | null;
    policy: OWSPolicy;
    connect: (agentId: string) => void;
    disconnect: () => void;
    signTransaction: (tx: TransactionRequest) => Promise<string>;
}

const OWSContext = createContext<OWSContextType | null>(null);

export function useOWS() {
    const ctx = useContext(OWSContext);
    if (!ctx) throw new Error("useOWS must be used within OWSWalletProvider");
    return ctx;
}

export function OWSWalletProvider({ children }: { children: ReactNode }) {
    const [connected, setConnected] = useState(false);
    const [agentId, setAgentId] = useState<string | null>(null);
    const [dailySpent, setDailySpent] = useState(0);

    const [interceptor, setInterceptor] = useState<{
        tx: TransactionRequest;
        resolve: (val: string) => void;
        reject: (reason: any) => void;
    } | null>(null);

    const [policyRejection, setPolicyRejection] = useState<string | null>(null);

    const connect = (id: string) => {
        setAgentId(id);
        setConnected(true);
        localStorage.setItem('lob_node_id', id);
    };

    const disconnect = () => {
        setAgentId(null);
        setConnected(false);
        localStorage.removeItem('lob_node_id');
    };

    /**
     * signTransaction intercepts requests, runs them through the policy
     * engine, and then simulates the user/agent signature prompt.
     */
    const signTransaction = async (tx: TransactionRequest): Promise<string> => {
        // 1. OWS POLICY ENGINE CHECK
        setPolicyRejection(null);
        console.log(`[OWS Adapter] Evaluating transaction: $${tx.amountUsdc} USDC`);

        for (const rule of NEXUS_SPEND_POLICY.rules) {
            if (rule.type === 'maxTransaction' && rule.maxAmountUsd) {
                if (tx.amountUsdc > rule.maxAmountUsd) {
                    const error = `[OWS-POLICY-BLOCKED] Transaction of $${tx.amountUsdc} exceeds per-transaction limit ($${rule.maxAmountUsd}).`;
                    console.error(error);
                    setPolicyRejection(error);
                    throw new Error("OWS_POLICY_BLOCKED");
                }
            }
            if (rule.type === 'dailyLimit' && rule.maxDailyUsd) {
                if ((dailySpent + tx.amountUsdc) > rule.maxDailyUsd) {
                    const error = `[OWS-POLICY-BLOCKED] Daily spend limit ($${rule.maxDailyUsd}) exceeded.`;
                    console.error(error);
                    setPolicyRejection(error);
                    throw new Error("OWS_POLICY_BLOCKED");
                }
            }
        }

        // 2. PROMPT FOR SIGNATURE (Simulated delay for key decryption)
        return new Promise((resolve, reject) => {
            setInterceptor({ tx, resolve, reject });
        });
    };

    const confirmSign = () => {
        if (!interceptor) return;
        setDailySpent(prev => prev + interceptor.tx.amountUsdc);
        const dummySig = `0xows_${Date.now().toString(16)}_${Math.random().toString(16).substring(2, 10)}`;
        interceptor.resolve(dummySig);
        setInterceptor(null);
    };

    const rejectSign = () => {
        if (!interceptor) return;
        interceptor.reject(new Error("USER_REJECTED"));
        setInterceptor(null);
    };

    return (
        <OWSContext.Provider value={{ connected, agentId, policy: NEXUS_SPEND_POLICY, connect, disconnect, signTransaction }}>
            {children}

            {/* OWS INTERCEPTOR MODAL */}
            {(interceptor || policyRejection) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="max-w-md w-full hacker-panel shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        {policyRejection ? (
                            // POLICY REJECTION STATE
                            <div className="space-y-4 text-center py-6 border-2 border-red-500/50 bg-red-500/10 mb-[-1rem] mx-[-1rem] mt-[-1rem]">
                                <div className="mx-auto w-16 h-16 bg-red-500/20 flex items-center justify-center rounded-full mb-2 border border-red-500/50">
                                    <ShieldAlert size={32} className="text-red-500 animate-pulse" />
                                </div>
                                <h3 className="text-lg font-black text-red-500">SIGNATURE BLOCKED</h3>
                                <p className="text-xs text-red-300 px-6 font-mono">{policyRejection}</p>
                                <p className="text-[10px] text-[var(--dim-color)] italic mt-4 px-6">
                                    This agent transaction was intercepted locally by the OWS Access Layer. No keys were touched.
                                </p>
                                <button onClick={() => setPolicyRejection(null)} className="mt-4 px-8 py-2 bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-colors uppercase">
                                    Close
                                </button>
                            </div>
                        ) : interceptor ? (
                            // SIGNATURE REQUEST STATE
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                                    <Key className="text-cyan-400" />
                                    <div>
                                        <h3 className="font-black text-sm uppercase tracking-wider">OWS Signature Request</h3>
                                        <p className="text-[10px] text-cyan-400 font-mono">{agentId}</p>
                                    </div>
                                </div>
                                
                                <div className="bg-[var(--bg-color)] p-4 font-mono text-xs space-y-2 border border-[var(--border-color)]">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--dim-color)]">Action:</span>
                                        <span className="text-white font-bold">{interceptor.tx.type}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-[var(--border-color)] pt-2 mt-2">
                                        <span className="text-[var(--dim-color)]">Description:</span>
                                        <span className="text-white text-right max-w-[200px] truncate">{interceptor.tx.description}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-[var(--border-color)] pt-2 mt-2 items-center">
                                        <span className="text-[var(--dim-color)]">Amount:</span>
                                        <span className="text-xl font-black text-white">${interceptor.tx.amountUsdc.toFixed(2)} USDC</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 p-3 bg-cyan-900/20 border border-cyan-500/30">
                                    <ShieldCheck size={14} className="text-cyan-400" />
                                    <p className="text-[9px] text-cyan-200">Policy Check Passed. Secure local enclave ready to sign.</p>
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button onClick={rejectSign} className="flex-1 hacker-btn text-center text-xs py-2 hover:bg-red-500/20 hover:text-red-400 border-[var(--border-color)]">
                                        REJECT
                                    </button>
                                    <button onClick={confirmSign} className="flex-1 text-center text-xs py-2 font-bold bg-[var(--text-color)] text-[var(--bg-color)] hover:bg-cyan-400">
                                        APPROVE
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </OWSContext.Provider>
    );
}
