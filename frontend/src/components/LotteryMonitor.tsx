import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { Ticket, Loader, Gift } from 'lucide-react';

interface LotteryStatus {
    totalTickets: number;
    myTickets: number;
    lastWinner?: {
        nodeId: string;
        ticketId: string;
        prize: string;
        block: number;
    };
    nextDraw?: number;
}

export default function LotteryMonitor() {
    const [status, setStatus] = useState<LotteryStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await apiFetch('/api/lottery/status');
                setStatus(data);
            } catch (e) {
                // Silent fail
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 15000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="hacker-panel flex flex-col items-center justify-center py-10 opacity-50">
                <Loader size={20} className="animate-spin text-[var(--dim-color)] mb-2" />
                <p className="label-dim">SYNCING_TRANSCEIVER...</p>
            </div>
        );
    }

    return (
        <div className="hacker-panel">
            <p className="label-dim">LOTTERY_TRANSCEIVER</p>

            {!status ? (
                <div className="flex flex-col items-center justify-center py-8 text-[var(--dim-color)] text-center">
                    <Ticket size={20} className="opacity-30 mb-2" />
                    <p className="text-[9px] italic">NO_LOTTERY_DATA</p>
                    <p className="text-[8px] mt-1 text-[var(--dim-color)]/70">Earn tickets through rituals and sacrifices</p>
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="border border-[var(--border-color)] bg-[var(--panel-bg)] p-3 text-center shadow-sm relative group overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-[var(--dim-color)] opacity-20" />
                                <p className="label-dim">MY_TICKETS</p>
                                <p className="text-xl font-black text-[var(--text-color)]">{status.myTickets || 0}</p>
                            </div>
                            <div className="border border-[var(--border-color)] bg-[var(--panel-bg)] p-3 text-center shadow-sm relative group overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-[var(--accent-blue)] opacity-40" />
                                <p className="label-dim">TOTAL_POOL</p>
                                <p className="text-xl font-black text-[var(--accent-blue)]">{status.totalTickets || 0} TKT</p>
                            </div>
                        </div>

                        <div className="py-2 space-y-4">
                            <div className="flex items-center gap-4 p-3 border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5">
                                <div className="w-10 h-10 border border-[var(--accent-green)]/30 flex items-center justify-center bg-[var(--accent-green)]/10">
                                    <Ticket size={24} className="text-[var(--accent-green)]" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-[var(--text-color)] uppercase leading-none mb-1">Lottery_Sequence_Active</p>
                                    <p className="text-[9px] text-[var(--dim-color)] leading-tight uppercase font-bold italic">DRAW_ID: 0xFD...{Math.random().toString(16).slice(2, 6).toUpperCase()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {status.lastWinner && (
                        <div className="mt-4 border-t border-[var(--border-color)] pt-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Gift size={12} className="text-[var(--accent-color)]" />
                                <span className="text-[8px] text-[var(--accent-color)] uppercase font-bold">LAST_WINNER</span>
                            </div>
                            <div className="text-[10px] text-[var(--dim-color)]">
                                <p>Agent: <span className="text-[var(--text-color)]">{status.lastWinner.nodeId.slice(0, 12)}...</span></p>
                                <p>Prize: <span className="text-[var(--accent-green)]">{status.lastWinner.prize}</span></p>
                            </div>
                        </div>
                    )}

                    {!status.lastWinner && status.totalTickets > 0 && (
                        <div className="mt-4 border-t border-[var(--border-color)] pt-3 text-center">
                            <p className="text-[9px] text-[var(--dim-color)] italic">AWAITING_FIRST_DRAW...</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
