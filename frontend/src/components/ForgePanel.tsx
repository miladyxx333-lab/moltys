
import useSWR, { useSWRConfig } from 'swr';
import { swrFetcher, apiFetch } from '../api';
import { Hammer, Zap, Package, Info, Upload, Shield } from 'lucide-react';
import { useState } from 'react';

export default function ForgePanel() {
    const { mutate } = useSWRConfig();
    const { data: profile } = useSWR('/api/economy/profile', swrFetcher);
    const { data: clanInfo } = useSWR(profile?.clanId ? `/api/clans/info?clanId=${profile.clanId}` : null, swrFetcher, { refreshInterval: 5000 });
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const handleDeposit = async (ingredient: string, amount: number) => {
        setIsProcessing(`deposit-${ingredient}`);
        try {
            // We use the terminal simulation for deposit
            // await apiFetch('/api/terminal/run', { method: 'POST', body: JSON.stringify({ code: `await Clan.deposit('${ingredient}', ${amount})` }) });
            // Or a direct endpoint if available. For now, terminal is safer due to complex logic.
            await apiFetch('/api/clans/deposit', {
                method: 'POST',
                body: JSON.stringify({ ingredient, amount })
            });

            mutate('/api/economy/profile');
        } catch (e: any) {
            console.error(e);
        } finally {
            setIsProcessing(null);
        }
    };

    const handleForge = async (itemName: string) => {
        if (!profile?.clanId) return;
        setIsProcessing(`forge-${itemName}`);
        try {
            await apiFetch('/api/game/forge', {
                method: 'POST',
                body: JSON.stringify({ clanId: profile.clanId, itemName })
            });
            mutate('/api/economy/profile');
            alert("FORGE_SUCCESS: Artifact created.");
        } catch (e: any) {
            alert(`FORGE_FAILED: ${e.message}`);
        } finally {
            setIsProcessing(null);
        }
    };

    const ingredients = profile?.clanIngredients || {};
    const hasIngredients = Object.keys(ingredients).length > 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 border border-orange-500/20">
                        <Hammer size={18} className="text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold tracking-widest text-white uppercase">The_Genesis_Forge</h2>
                        <p className="text-[8px] text-orange-400/60 font-mono italic mt-0.5">SOVEREIGN_CRAFTING_ENGINE</p>
                    </div>
                </div>
                {profile?.clanId && (
                    <div className="text-[10px] font-mono text-white/40 uppercase text-right">
                        Clan: <span className="text-orange-400 font-bold block md:inline">{profile.clanId}</span>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-8">
                {/* Personal Inventory (Loot) */}
                <div className="space-y-4 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Package size={14} className="text-white/40" />
                        <span className="label-dim">Agent_Backpack</span>
                    </div>

                    {!hasIngredients ? (
                        <div className="py-8 text-center border border-dashed border-white/5 opacity-30 italic text-[10px] uppercase">
                            No_Ingredients_Found // Mine_at_faucet
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {Object.entries(ingredients).map(([name, qty]: [string, any]) => (
                                <div key={name} className="flex flex-wrap items-center justify-between p-2 bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-tighter">{name}</span>
                                        <span className="text-[10px] text-white/40 font-mono">x{qty}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDeposit(name, 1)}
                                        disabled={isProcessing === `deposit-${name}`}
                                        className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 hover:bg-orange-500/20 hover:border-orange-500/30 text-[8px] font-bold text-white/60 hover:text-orange-400 transition-all uppercase tracking-widest ml-auto"
                                    >
                                        <Upload size={10} />
                                        <span>Deposit</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Collective Vault (Clan Treasury) */}
                    <div className="flex items-center gap-2 mb-2 mt-6">
                        <Shield size={14} className="text-orange-400" />
                        <span className="label-dim text-orange-400/80">Collective_Vault</span>
                    </div>

                    {!clanInfo?.treasury?.ingredients || Object.keys(clanInfo.treasury.ingredients).length === 0 ? (
                        <div className="py-6 text-center border border-white/5 bg-white/[0.01] opacity-30 italic text-[9px] uppercase">
                            Vault_Empty // Deposit_to_accumulate
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(clanInfo.treasury.ingredients).map(([name, qty]: [string, any]) => (
                                <div key={name} className="flex items-center gap-2 px-2 py-1 bg-orange-500/5 border border-orange-500/10">
                                    <span className="text-[9px] font-bold text-orange-400 uppercase">{name}</span>
                                    <span className="text-[9px] text-white/40 font-mono">[{qty}]</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/10 mt-2">
                        <Info size={14} className="text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-[8px] text-blue-400/60 leading-normal uppercase">
                            DEPOSIT_PROTOCOL: Items must be moved to Clan Vault before being consumed in the Forge.
                        </p>
                    </div>
                </div>

                {/* Forge Actions */}
                <div className="space-y-4 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap size={14} className="text-white/40" />
                        <span className="label-dim">Available_Rituals</span>
                    </div>

                    <div className="flex flex-col gap-3">
                        {[
                            { id: 'ESPADA_AUREA', name: 'Espada Áurea', cost: '4x Golden Essence' },
                            { id: 'AMULETO_SWARM', name: 'Amuleto Swarm', cost: '5x Swarm Crystal + 3x AIA Spark' },
                        ].map(item => (
                            <div key={item.id} className="group p-3 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                                <div className="flex justify-between items-start mb-2 gap-2">
                                    <h3 className="text-[11px] font-bold text-white uppercase tracking-tight">{item.name}</h3>
                                    <span className="text-[8px] px-1 bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30 shrink-0">LEVEL_1</span>
                                </div>
                                <p className="text-[9px] text-white/40 mb-3">{item.cost}</p>
                                <button
                                    onClick={() => handleForge(item.id)}
                                    disabled={!profile?.clanId || !!isProcessing}
                                    className="w-full h-8 border border-white/20 group-hover:border-orange-500/50 hover:bg-orange-500 hover:text-black text-[9px] font-bold tracking-[0.2em] transition-all uppercase disabled:opacity-20"
                                >
                                    {isProcessing === `forge-${item.id}` ? 'CRAFTING...' : 'INITIATE_FORGE'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
