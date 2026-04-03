
import useSWR, { useSWRConfig } from 'swr';
import { swrFetcher, apiFetch } from '../api';
import { ShoppingCart, Tag, ArrowRight, Package, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function MarketBoard() {
    const { mutate } = useSWRConfig();
    const { data: market, isLoading } = useSWR('/api/game/market/list', swrFetcher, { refreshInterval: 5000 });
    const { data: profile } = useSWR('/api/economy/profile', swrFetcher);
    const [isAccepting, setIsAccepting] = useState<string | null>(null);

    const handleAccept = async (offerId: string) => {
        if (!profile?.clanId) return;
        setIsAccepting(offerId);
        try {
            await apiFetch('/api/game/market/accept', {
                method: 'POST',
                body: JSON.stringify({ offerId, takerClanId: profile.clanId })
            });
            mutate('/api/game/market/list');
            mutate('/api/economy/profile');
            alert("TRADE_SUCCESSFUL: Items transferred to clan treasury.");
        } catch (e: any) {
            alert(`TRADE_FAILED: ${e.message}`);
        } finally {
            setIsAccepting(null);
        }
    };

    const handleCancel = async (offerId: string) => {
        setIsAccepting(offerId);
        try {
            await apiFetch('/api/game/market/cancel', {
                method: 'POST',
                body: JSON.stringify({ offerId })
            });
            mutate('/api/game/market/list');
            mutate('/api/economy/profile');
            alert("OFFER_CANCELLED: Signal reclaimed.");
        } catch (e: any) {
            alert(`CANCEL_FAILED: ${e.message}`);
        } finally {
            setIsAccepting(null);
        }
    };

    if (isLoading) return (
        <div className="h-64 flex items-center justify-center border border-white/10 bg-black/20">
            <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
    );

    const offers = market?.offers || [];

    return (
        <div className="hacker-panel relative overflow-hidden board-glow">
            <div className="flex justify-between items-center mb-6 border-b border-[var(--border-color)] pb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20">
                        <ShoppingCart size={18} className="text-[var(--accent-blue)]" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black tracking-widest text-[var(--text-color)] uppercase">Gossip_Market_Orders</h2>
                        <p className="text-[8px] text-[var(--accent-blue)] font-mono italic mt-0.5 uppercase font-bold">ESTABLISHED_2026 // P2P_SETTLEMENT</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1 bg-[var(--accent-blue)]/5 border border-[var(--accent-blue)]/20 text-[10px] text-[var(--accent-blue)] font-mono font-bold">
                        ACTIVE_SIGNALS: {offers.length}
                    </div>
                </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {offers.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30 italic border border-dashed border-white/10">
                        <Tag size={32} />
                        <p className="text-[10px] uppercase tracking-[0.2em]">Zero_Market_Signals_Detected</p>
                    </div>
                ) : (
                    offers.map((offer: any) => (
                        <div key={offer.id} className="group relative p-4 border border-[var(--border-color)] bg-[var(--panel-bg)] hover:bg-[var(--bg-color)] hover:border-[var(--accent-blue)] transition-all duration-300 overflow-hidden">
                            {/* Decorative background ID */}
                            <div className="absolute top-0 right-0 text-[40px] font-black text-[var(--text-color)] opacity-[0.03] -translate-y-4 translate-x-4 pointer-events-none select-none uppercase">
                                {offer.id.substring(0, 4)}
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-[var(--dim-color)] uppercase">CLAN_SOURCE:</span>
                                        <span className="text-[10px] font-black text-[var(--accent-blue)] underline decoration-[var(--accent-blue)]/30 underline-offset-4">{offer.senderClanId}</span>
                                    </div>

                                    {/* --- Ingredients / Materials --- */}
                                    {Object.entries(offer.offeredIngredients || {}).map(([name, qty]: [string, any]) => {
                                        const isDrug = name.startsWith('PSYCH_');
                                        let potencyValue = 0;
                                        if (isDrug) {
                                            const parts = name.split('_');
                                            const idPart = parts[parts.length - 1];
                                            const num = parseInt(idPart);

                                            if (!isNaN(num)) {
                                                potencyValue = ((num * 31) % 100) + 1;
                                            } else {
                                                // Deterministic Hash for non-numeric labels
                                                let hash = 0;
                                                for (let i = 0; i < name.length; i++) {
                                                    hash = ((hash << 5) - hash) + name.charCodeAt(i);
                                                    hash |= 0;
                                                }
                                                potencyValue = (Math.abs(hash) % 100) + 1;
                                            }
                                        }
                                        const potencyStr = potencyValue ? potencyValue.toFixed(0) : "0";

                                        return (
                                            <div key={name} className={`flex flex-col gap-1`}>
                                                <div className={`flex items-center gap-2 px-2 py-1 bg-white/[0.05] border ${isDrug ? 'border-red-500/40 text-red-200' : 'border-white/10 text-white/80'} text-[10px]`}>
                                                    <Package size={10} className={isDrug ? "text-red-500" : "text-blue-400"} />
                                                    <span className="font-bold">{qty}x</span>
                                                    <span className="uppercase tracking-tighter">{name}</span>
                                                </div>
                                                {isDrug && (
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 text-[7px] font-bold text-red-400 border-x border-b border-red-500/20 uppercase tracking-widest animate-pulse">
                                                        ☣️ Hazard_Level: {potencyStr}%
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* --- Codemon Offers --- */}
                                    {offer.offeredCodemon && (
                                        <div className="flex flex-col gap-2 p-2 border border-blue-500/30 bg-blue-500/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 border border-blue-500/50 flex items-center justify-center bg-black/40">
                                                    <div className="w-6 h-6 bg-blue-400/20 animate-pulse rounded-full" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">
                                                        {offer.offeredCodemon.brain_json.name || "Unknown_Agent"}
                                                    </p>
                                                    <div className="flex gap-2 mt-0.5">
                                                        <span className="text-[7px] px-1 bg-blue-500/20 text-blue-300 font-bold border border-blue-500/10">
                                                            TYPE: {offer.offeredCodemon.brain_json.core_genetics.base_type || "VOID"}
                                                        </span>
                                                        <span className="text-[7px] px-1 bg-purple-500/20 text-purple-300 font-bold border border-purple-500/10">
                                                            RARITY: {offer.offeredCodemon.brain_json.core_genetics.rarity_score?.toFixed(1) || "0"}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-4 gap-1 text-[7px] font-mono text-blue-300/60 uppercase">
                                                <div className="border border-white/5 p-1 text-center">ATK: {offer.offeredCodemon.brain_json.combat_stats.attack}</div>
                                                <div className="border border-white/5 p-1 text-center">DEF: {offer.offeredCodemon.brain_json.combat_stats.defense}</div>
                                                <div className="border border-white/5 p-1 text-center">SPD: {offer.offeredCodemon.brain_json.combat_stats.speed}</div>
                                                <div className="border border-white/5 p-1 text-center">ENG: {offer.offeredCodemon.brain_json.combat_stats.energy_capacity}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* --- Fallback for empty offers --- */}
                                    {!offer.offeredCodemon && (!offer.offeredIngredients || Object.keys(offer.offeredIngredients).length === 0) && (
                                        <div className="text-[10px] text-yellow-500/50 italic py-2 border border-dashed border-yellow-500/20 px-3">
                                            [NULL_LINK_SIGNAL]: No physical artifacts detected. Check sub-layers.
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-[8px] text-[var(--dim-color)] uppercase mb-1 font-bold">Requested_Liquidity</p>
                                        <p className="text-xl font-black text-[var(--text-color)] tracking-tighter">
                                            {offer.requestedPsh ? `${offer.requestedPsh.toLocaleString()} PSH` : 'BARTER_ONLY'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => profile?.clanId === offer.senderClanId ? handleCancel(offer.id) : handleAccept(offer.id)}
                                        disabled={isAccepting === offer.id}
                                        className={`h-12 px-6 border transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${profile?.clanId === offer.senderClanId
                                            ? 'border-red-500/30 hover:bg-red-500 hover:text-black hover:border-red-400'
                                            : 'border-blue-500/30 hover:bg-blue-500 hover:text-black hover:border-blue-400'
                                            }`}
                                    >
                                        {isAccepting === offer.id ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <>
                                                <span> {profile?.clanId === offer.senderClanId ? 'RECLAIM_SIGNAL' : 'ACCEPT_OFFER'}</span>
                                                <ArrowRight size={14} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
                <div className="p-4 bg-orange-500/5 border border-orange-500/20 text-[9px] text-orange-600/80 leading-relaxed italic uppercase font-bold">
                    NOTICE: Market settlement is final. The sovereign swarm handles Escrow via Account Durable Objects.
                    Ensure your clan treasury has the required PSH or components before accepting.
                </div>
            </div>
        </div>
    );
}
