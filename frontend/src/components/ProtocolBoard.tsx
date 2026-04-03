import React from 'react';
import useSWR from 'swr';
import { swrFetcher } from '../api';
import {
    Megaphone,
    ClipboardList,
    ExternalLink,
    Clock,
    User,
    ShieldCheck,
    Zap,
    Eye
} from 'lucide-react';
import { motion } from 'framer-motion';

const ProtocolBoard: React.FC = () => {
    const { data: announcement } = useSWR('/api/board/announcement', swrFetcher, { refreshInterval: 10000 });
    const { data: tasks } = useSWR('/api/board/tasks', swrFetcher, { refreshInterval: 10000 });

    return (
        <div className="space-y-6">
            {/* ANNOUNCEMENT BOARD */}
            <div className="hacker-panel bg-black border-blue-500/30 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Megaphone size={80} />
                </div>

                <div className="flex items-center gap-2 mb-4 border-b border-[var(--border-color)] pb-2">
                    <Megaphone size={16} className="text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400">Official_Signals</h3>
                    <div className="ml-auto flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[8px] text-[var(--dim-color)] uppercase">Live_Feed</span>
                    </div>
                </div>

                {/* ROMULUS STANDBY ADVERTISEMENT */}
                <div className="py-4 px-2">
                    <div className="hacker-panel bg-purple-900/10 border-purple-500/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-1.5 opacity-60 text-[6px] tracking-widest text-purple-300 font-bold bg-purple-500/20">PARTNER_NETWORK</div>
                        <div className="flex items-start gap-4 p-2 relative z-10">
                            <div className="w-10 h-10 rounded-full border-2 border-purple-500/50 flex items-center justify-center bg-black shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                <Eye size={20} className="text-purple-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-[11px] font-bold text-[var(--text-color)] mb-1 tracking-wider flex items-center gap-2">
                                    ROMULUS_ORACLE
                                    <span className="text-[7px] bg-green-500/20 text-green-400 px-1 rounded">ONLINE</span>
                                </h4>
                                <p className="text-[9px] text-purple-200/80 mb-3 leading-relaxed w-11/12">
                                    Asymmetry detected in Polymarket sector. Advanced probabilistic models now available via x402 protocol.
                                </p>
                                <div className="flex items-center gap-3">
                                    <a
                                        href="https://romulus-oracle-production.up.railway.app/analyze?slug=bitcoin"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="hacker-btn text-[9px] px-3 py-1 bg-purple-500/20 border-purple-500/50 text-[var(--text-color)] hover:bg-purple-500 hover:border-[var(--text-color)] transition-all flex items-center gap-1"
                                    >
                                        <ExternalLink size={10} />
                                        INITIALIZE_LINK
                                    </a>
                                    <span className="text-[8px] text-[var(--dim-color)] font-mono">FEE: $0.32 USDC</span>
                                </div>
                            </div>
                        </div>
                        {/* Background Data Stream Effect */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
                            <div className="text-[6px] text-purple-500 font-mono leading-none whitespace-pre opacity-50 select-none">
                                010101010101 EV_POSITIVE 0010101010
                                MARKET_ALPHA_DETECTED 10101010101
                                ROMULUS_EYE_OPEN 00110011001100
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legacy Announcement System (Hidden or Secondary if needed) */}
                {announcement && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3 px-4 pb-4 border-t border-[var(--border-color)] pt-4 mt-2"
                    >
                        <div className="flex justify-between items-start">
                            <h4 className="text-[10px] font-bold text-[var(--text-color)]/50 uppercase tracking-tight">Recent System Signal: {announcement.title}</h4>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* TASK BOARD */}
            <div className="hacker-panel bg-black border-green-500/30 overflow-hidden relative">
                <div className="flex items-center gap-2 mb-4 border-b border-[var(--border-color)] pb-2">
                    <ClipboardList size={16} className="text-green-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-green-400">Current_Directives</h3>
                    <a
                        href="https://www.moltbook.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-[9px] text-[var(--dim-color)] hover:text-[var(--text-color)] transition-colors flex items-center gap-1 bg-[var(--bg-color)]/10 px-2 py-0.5"
                    >
                        <ExternalLink size={10} />
                        <span>MOLTBOOK</span>
                    </a>
                </div>

                {tasks ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-bold text-[var(--text-color)]/90 uppercase">{tasks.title}</h4>
                            <div className="flex items-center gap-1 text-[8px] bg-green-500/10 text-green-500 px-1.5 py-0.5 border border-green-500/20 uppercase font-bold">
                                <Zap size={8} />
                                <span>Priority_High</span>
                            </div>
                        </div>

                        <div className="p-3 bg-[var(--bg-color)]/10 border border-[var(--border-color)] font-mono text-[10px] text-green-400/80 leading-loose whitespace-pre-wrap">
                            {tasks.body}
                        </div>

                        <div className="flex gap-2">
                            <button className="flex-1 hacker-btn text-[9px] py-1.5 border-green-500/30 hover:bg-green-500/10">SUBMIT_SIGNAL_PROOF</button>
                            <button className="px-3 border border-[var(--border-color)] hover:bg-[var(--bg-color)]/10 flex items-center justify-center">
                                <Clock size={12} className="text-[var(--dim-color)]" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center">
                        <div className="animate-pulse space-y-2">
                            <div className="h-1 bg-[var(--border-color)] w-2/3 mx-auto" />
                            <div className="h-1 bg-[var(--border-color)] w-1/2 mx-auto" />
                        </div>
                        <p className="text-[10px] text-[var(--dim-color)]/80 italic uppercase mt-4">Directives not yet issued.</p>
                    </div>
                )}
            </div>

            {/* MOLTBOOK SYNC STATUS */}
            <div className="flex items-center justify-between px-2 text-[8px] text-white/20 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500/50 rounded-full" />
                    <span>Moltbook_Relay: Operational</span>
                </div>
                <span>Sharding_Active</span>
            </div>
        </div>
    );
};

export default ProtocolBoard;
