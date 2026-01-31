import { useState, useEffect } from 'react';
import { Bug, ShieldAlert, Ticket, Loader } from 'lucide-react';

interface BugReport {
    id: string;
    title: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    reward: number;
    status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
    reporter?: string;
    timestamp?: number;
}

export default function BugBounty() {
    const [bounties, setBounties] = useState<BugReport[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBounties = async () => {
            try {
                const res = await fetch('/api/bug-bounty/list', {
                    headers: { 'X-Lob-Peer-ID': 'agent-neo' }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setBounties(data);
                    }
                }
            } catch (e) {
                // Silent fail
            } finally {
                setLoading(false);
            }
        };

        fetchBounties();
        const interval = setInterval(fetchBounties, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="hacker-panel bg-white/[0.02]">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Bug size={14} className="text-yellow-500" />
                    <p className="label-dim">WHITE_HAT_PROTOCOL</p>
                </div>
                <span className="text-[8px] font-bold text-yellow-500/50 uppercase tracking-widest">INTEGRITY_BOUNTIES</span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8 text-white/30">
                    <Loader size={14} className="animate-spin mr-2" />
                    <span className="text-[9px]">SCANNING_BOUNTY_POOL...</span>
                </div>
            ) : bounties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-white/30 text-center">
                    <ShieldAlert size={20} className="opacity-30 mb-2" />
                    <p className="text-[9px] italic">NO_ACTIVE_BOUNTIES</p>
                    <p className="text-[8px] mt-1 text-white/20">System is stable. Report issues to earn rewards.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bounties.map((bb) => (
                        <div key={bb.id} className="p-3 border border-white/5 bg-black hover:border-yellow-500/20 transition-all cursor-pointer group">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-white group-hover:text-yellow-500 transition-colors uppercase">
                                    {bb.id}: {bb.title}
                                </span>
                                <span className={`text-[8px] px-1 font-bold ${bb.severity === 'HIGH' ? 'text-red-500 bg-red-500/10' :
                                    bb.severity === 'MEDIUM' ? 'text-yellow-500 bg-yellow-500/10' :
                                        'text-blue-500 bg-blue-500/10'
                                    }`}>
                                    {bb.severity}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-bold lowercase italic ${bb.status === 'OPEN' ? 'text-green-500' : 'text-white/30'}`}>
                                        {bb.status === 'OPEN' ? '🟢 active_bounty' : '⚫ audit_pending'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2 py-0.5 border border-yellow-500/20">
                                    <Ticket size={10} className="text-yellow-500" />
                                    <span className="text-[8px] font-bold text-yellow-500">+{bb.reward} TICKETS</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button className="w-full mt-4 flex items-center justify-center gap-2 py-2 border border-dashed border-white/20 hover:border-white/50 text-[9px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-all">
                <ShieldAlert size={12} />
                SUBMIT_BUG_REPORT
            </button>
        </div>
    );
}
