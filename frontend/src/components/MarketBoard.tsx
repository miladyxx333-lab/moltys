
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
        <div className="hacker-panel bg-black/40 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.05)]">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20">
                        <ShoppingCart size={18} className="text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold tracking-widest text-white uppercase">Gossip_Market_Orders</h2>
                        <p className="text-[8px] text-blue-400/60 font-mono italic mt-0.5">ESTABLISHED_2026 // P2P_SETTLEMENT</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1 bg-blue-500/5 border border-blue-500/20 text-[10px] text-blue-400 font-mono">
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
                        <div key={offer.id} className="group relative p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-blue-500/30 transition-all duration-300 overflow-hidden">
                            {/* Decorative background ID */}
                            <div className="absolute top-0 right-0 text-[40px] font-black text-white/[0.02] -translate-y-4 translate-x-4 pointer-events-none select-none uppercase">
                                {offer.id.substring(0, 4)}
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-white/40 uppercase">CLAN_SOURCE:</span>
                                        <span className="text-[10px] font-bold text-blue-400 underline decoration-blue-500/30 underline-offset-4">{offer.senderClanId}</span>
                                    </div>

                                    {Object.entries(offer.offeredIngredients).map(([name, qty]: [string, any]) => {
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
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-[8px] text-white/30 uppercase mb-1">Requested_Liquidity</p>
                                        <p className="text-xl font-black text-white tracking-tighter">
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

            <div className="mt-8 pt-6 border-t border-white/5">
                <div className="p-4 bg-orange-500/5 border border-orange-500/20 text-[9px] text-orange-400/80 leading-relaxed italic uppercase">
                    NOTICE: Market settlement is final. The sovereign swarm handles Escrow via Account Durable Objects.
                    Ensure your clan treasury has the required PSH or components before accepting.
                </div>
            </div>
        </div>
    );
}
