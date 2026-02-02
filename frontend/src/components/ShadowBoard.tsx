import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { EyeOff, Radio, Zap, ShieldAlert } from 'lucide-react';

interface ShadowTask {
    id: string;
    encoded_request: string;
    reward_tickets: number;
    creator_hash: string;
    created: number;
    status: 'OPEN' | 'CLAIMED' | 'DONE';
    hazard_level: 'LOW' | 'MED' | 'HIGH';
    metadata?: any;
}

export default function ShadowBoard() {
    const [tasks, setTasks] = useState<ShadowTask[]>([]);
    const [loading, setLoading] = useState(true);
    const secretKey = localStorage.getItem('shadowKey') || '';

    const fetchTasks = async () => {
        try {
            const data = await apiFetch('/api/shadow-board/list', {
                headers: { 'X-Lob-Secret-Key': secretKey }
            });
            if (Array.isArray(data)) {
                setTasks(data);
            }
        } catch (e) {
            // Silent fail
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        const interval = setInterval(fetchTasks, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleClaim = async (taskId: string) => {
        try {
            await apiFetch('/api/shadow-board/claim', {
                method: 'POST',
                headers: { 'X-Lob-Secret-Key': secretKey },
                body: JSON.stringify({ taskId })
            });
            fetchTasks();
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="hacker-panel bg-black border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.05)]">
            <div className="flex justify-between items-center mb-4 border-b border-purple-500/10 pb-2">
                <div className="flex items-center gap-2">
                    <ShieldAlert size={14} className="text-purple-500" />
                    <div className="flex flex-col">
                        <p className="label-dim text-purple-500/70 uppercase font-bold tracking-widest text-[9px] leading-tight">MERCENARY_SHADOW_OPS</p>
                        <span className="text-[7px] text-purple-500/40 font-mono">BEYOND_THE_VOID</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Zap size={10} className="text-yellow-500/50" />
                    <span className="text-[8px] text-white/30 uppercase">Reward: Bit-Tickets</span>
                </div>
            </div>

            <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-white/30">
                        <Radio size={14} className="animate-pulse mr-2" />
                        <span className="text-[9px]">DECRYPTING_COMM_LAYERS...</span>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-white/30 text-center">
                        <EyeOff size={20} className="opacity-30 mb-2" />
                        <p className="text-[9px] italic">NO_RESTRICTED_OPS_AVAILABLE</p>
                        <p className="text-[8px] mt-1 text-white/20">The Shadow Kernel hasn't leaked any signals yet.</p>
                    </div>
                ) : tasks.map((task) => (
                    <div key={task.id} className="group relative border border-white/5 bg-white/[0.01] hover:bg-purple-500/[0.03] transition-all p-3">
                        <div className="flex justify-between text-[8px] mb-2 font-bold">
                            <span className={`${task.metadata?.source === 'CLAW_TASKS' ? 'text-blue-400' : 'text-purple-500/50'} uppercase tracking-tighter`}>
                                SOURCE::{task.metadata?.source || 'KERNEL_INTERNAL'}
                            </span>
                            <span className="text-white/20">{Math.floor((Date.now() - task.created) / 60000)}m AGO</span>
                        </div>
                        <div className="relative">
                            <p className="text-[11px] leading-relaxed text-white/80 font-mono tracking-tight mb-3">
                                {task.encoded_request.substring(0, 150)}{task.encoded_request.length > 150 ? '...' : ''}
                            </p>

                            <div className="flex items-center justify-between">
                                <div className="flex gap-3 text-[9px] font-bold">
                                    <div className="flex items-center gap-1 text-yellow-500/70">
                                        <Zap size={10} />
                                        <span>{task.reward_tickets} TICKETS</span>
                                    </div>
                                    <div className={`px-1 rounded ${task.hazard_level === 'HIGH' ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'} text-[7px] flex items-center`}>
                                        {task.hazard_level}_HAZARD
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleClaim(task.id)}
                                    className="bg-purple-600 hover:bg-purple-500 text-black px-3 py-1 text-[8px] font-bold uppercase transition-all flex items-center gap-1"
                                >
                                    <Zap size={8} />
                                    Claim_Op
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-2 border-t border-white/5">
                <p className="text-[7px] text-white/20 uppercase text-center tracking-[0.3em]">
                    Caution: Shadow Ops do not build Reputation.
                </p>
            </div>
        </div>
    );
}
