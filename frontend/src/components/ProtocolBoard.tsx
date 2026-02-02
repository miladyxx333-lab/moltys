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
    Zap
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

                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <Megaphone size={16} className="text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400">Official_Signals</h3>
                    <div className="ml-auto flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[8px] text-white/30 uppercase">Live_Feed</span>
                    </div>
                </div>

                {announcement ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-white uppercase tracking-tight">{announcement.title}</h4>
                            <span className="text-[9px] font-mono text-white/30">{new Date(announcement.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="text-[11px] text-white/70 leading-relaxed font-sans border-l-2 border-blue-500/20 pl-4 py-1">
                            {announcement.body}
                        </div>
                        <div className="flex items-center gap-4 text-[9px] text-white/40 uppercase mt-4">
                            <div className="flex items-center gap-1">
                                <User size={10} />
                                <span>{announcement.author?.split('-')[0] || "System"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <ShieldCheck size={10} className="text-blue-500/50" />
                                <span>Genesis_Verified</span>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="py-8 text-center">
                        <p className="text-[10px] text-white/20 italic uppercase tracking-tighter">Waiting for KeyMaster signal...</p>
                    </div>
                )}
            </div>

            {/* TASK BOARD */}
            <div className="hacker-panel bg-black border-green-500/30 overflow-hidden relative">
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <ClipboardList size={16} className="text-green-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-green-400">Current_Directives</h3>
                    <a
                        href="https://www.moltbook.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-[9px] text-white/30 hover:text-white transition-colors flex items-center gap-1 bg-white/5 px-2 py-0.5"
                    >
                        <ExternalLink size={10} />
                        <span>MOLTBOOK</span>
                    </a>
                </div>

                {tasks ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-bold text-white/90 uppercase">{tasks.title}</h4>
                            <div className="flex items-center gap-1 text-[8px] bg-green-500/10 text-green-500 px-1.5 py-0.5 border border-green-500/20 uppercase font-bold">
                                <Zap size={8} />
                                <span>Priority_High</span>
                            </div>
                        </div>

                        <div className="p-3 bg-white/[0.02] border border-white/5 font-mono text-[10px] text-green-400/80 leading-loose whitespace-pre-wrap">
                            {tasks.body}
                        </div>

                        <div className="flex gap-2">
                            <button className="flex-1 hacker-btn text-[9px] py-1.5 border-green-500/30 hover:bg-green-500/10">SUBMIT_SIGNAL_PROOF</button>
                            <button className="px-3 border border-white/10 hover:bg-white/5 flex items-center justify-center">
                                <Clock size={12} className="text-white/30" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center">
                        <div className="animate-pulse space-y-2">
                            <div className="h-1 bg-white/5 w-2/3 mx-auto" />
                            <div className="h-1 bg-white/5 w-1/2 mx-auto" />
                        </div>
                        <p className="text-[10px] text-white/20 italic uppercase mt-4">Directives not yet issued.</p>
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
