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
            <div className="hacker-panel">
                <p className="label-dim">LOTTERY_TRANSCEIVER</p>
                <div className="flex items-center justify-center py-8 text-white/30">
                    <Loader size={14} className="animate-spin mr-2" />
                    <span className="text-[9px]">SYNCING_LOTTERY_STATE...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="hacker-panel">
            <p className="label-dim">LOTTERY_TRANSCEIVER</p>

            {!status ? (
                <div className="flex flex-col items-center justify-center py-8 text-white/30 text-center">
                    <Ticket size={20} className="opacity-30 mb-2" />
                    <p className="text-[9px] italic">NO_LOTTERY_DATA</p>
                    <p className="text-[8px] mt-1 text-white/20">Earn tickets through rituals and sacrifices</p>
                </div>
            ) : (
                <>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="border border-white/10 bg-white/[0.02] p-3 text-center">
                            <p className="text-[8px] text-white/40 uppercase">YOUR_TICKETS</p>
                            <p className="text-xl font-bold text-cyan-400">{status.myTickets || 0}</p>
                        </div>
                        <div className="border border-white/10 bg-white/[0.02] p-3 text-center">
                            <p className="text-[8px] text-white/40 uppercase">TOTAL_POOL</p>
                            <p className="text-xl font-bold text-white/70">{status.totalTickets || 0}</p>
                        </div>
                    </div>

                    {status.lastWinner && (
                        <div className="mt-4 border-t border-white/5 pt-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Gift size={12} className="text-yellow-400" />
                                <span className="text-[8px] text-yellow-400 uppercase font-bold">LAST_WINNER</span>
                            </div>
                            <div className="text-[10px] text-white/60">
                                <p>Agent: <span className="text-white">{status.lastWinner.nodeId.slice(0, 12)}...</span></p>
                                <p>Prize: <span className="text-green-400">{status.lastWinner.prize}</span></p>
                            </div>
                        </div>
                    )}

                    {!status.lastWinner && status.totalTickets > 0 && (
                        <div className="mt-4 border-t border-white/5 pt-3 text-center">
                            <p className="text-[9px] text-white/40 italic">AWAITING_FIRST_DRAW...</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
