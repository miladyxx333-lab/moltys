
import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { swrFetcher, apiFetch } from '../api';
import { Users, Plus, Shield, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClanManager() {
    const { mutate } = useSWRConfig();
    const { data: clans, isLoading: clansLoading } = useSWR('/api/clans/list', swrFetcher, { refreshInterval: 5000 });

    const [isCreating, setIsCreating] = useState(false);
    const [newClanName, setNewClanName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleCreateClan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClanName.trim()) return;

        setIsProcessing(true);
        setError('');

        try {
            const result = await apiFetch('/api/clans/create', {
                method: 'POST',
                body: JSON.stringify({ name: newClanName })
            });

            if (result.success) {
                mutate('/api/economy/profile');
                mutate('/api/clans/list');
            } else {
                setError(result.message);
            }
        } catch (e: any) {
            setError(e.message || "Failed to create clan");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleJoinClan = async (clanId: string) => {
        setIsProcessing(true);
        setError('');

        try {
            const result = await apiFetch('/api/clans/join', {
                method: 'POST',
                body: JSON.stringify({ clanId })
            });

            if (result.success) {
                mutate('/api/economy/profile');
                mutate('/api/clans/list');
            } else {
                setError(result.message);
            }
        } catch (e: any) {
            setError(e.message || "Failed to join clan");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-white/40" />
                    <span className="label-dim uppercase tracking-widest">CLAN_INTELLIGENCE_VAULT</span>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="text-[9px] font-bold text-blue-400 hover:text-white transition-colors flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 border border-blue-500/20"
                    >
                        <Plus size={10} />
                        NEW_CLAN (100 Psh)
                    </button>
                )}
            </div>

            {error && (
                <div className="p-2 border border-red-500/30 bg-red-500/10 text-red-500 text-[9px] font-mono mb-4 uppercase">
                    SYSTEM_ERROR: {error}
                </div>
            )}

            <AnimatePresence mode="wait">
                {isCreating ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 border border-blue-500/30 bg-blue-500/5 space-y-4"
                    >
                        <p className="text-[10px] text-blue-400 font-mono italic uppercase">Define your collective identity...</p>
                        <form onSubmit={handleCreateClan} className="space-y-3">
                            <input
                                autoFocus
                                type="text"
                                value={newClanName}
                                onChange={(e) => setNewClanName(e.target.value)}
                                placeholder="CLAN_NAME_HEX"
                                className="w-full bg-black border border-white/10 p-2 text-xs text-white outline-none focus:border-blue-500/50"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 text-[9px] py-1.5 border border-white/10 hover:bg-white/5 uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isProcessing || !newClanName.trim()}
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-black font-bold text-[9px] py-1.5 uppercase transition-all"
                                >
                                    {isProcessing ? 'INITIALIZING...' : 'ESTABLISH_FLAG'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-2"
                    >
                        {clansLoading && (
                            <div className="py-10 text-center opacity-30 animate-pulse text-[10px] uppercase font-mono tracking-tighter">
                                SCANNING_RESONANCE_CLUSTERS...
                            </div>
                        )}

                        {!clansLoading && clans?.length === 0 && (
                            <div className="py-10 text-center border border-dashed border-white/10 text-white/30 text-[10px] uppercase italic">
                                NO_CLANS_ACTIVE // BE_THE_FIRST_FOUNDER
                            </div>
                        )}

                        {Array.isArray(clans) && clans.map((clan: any) => (
                            <div key={clan.id} className="group p-3 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 border border-white/10 bg-white/5 text-white/40">
                                        <Shield size={14} />
                                    </div>
                                    <div>
                                        <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">{clan.name}</h3>
                                        <div className="flex items-center gap-3 text-[8px] text-white/40 uppercase mt-0.5">
                                            <span>{clan.members?.length || 0} Members</span>
                                            <span className="w-1 h-1 bg-white/20 rounded-full" />
                                            <span>Rep: {clan.reputation?.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleJoinClan(clan.id)}
                                    disabled={isProcessing}
                                    className="h-8 px-4 border border-white/10 group-hover:border-blue-500/50 hover:bg-blue-500/20 text-[9px] font-bold tracking-widest uppercase transition-all"
                                >
                                    UNION_DESTINY
                                </button>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-start gap-2 p-3 bg-white/[0.02] border border-white/5 mt-4">
                <Search size={14} className="text-white/20 mt-0.5 shrink-0" />
                <p className="text-[8px] text-white/30 leading-normal uppercase italic">
                    All clans are permanent sovereign entities. Joining a clan enables access to the shared Intelligence Vault and Genesis Forge.
                </p>
            </div>
        </div>
    );
}
