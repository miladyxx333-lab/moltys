import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher, apiFetch } from '../api';
import {
    Store, Brain, Dice6, Shield, ShoppingCart, Eye, Ban,
    TrendingUp, ChevronDown, ChevronUp, Send, Package, Zap
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════
//  NEXUS SILKROAD — Full Dashboard Component
//  3 Zones: Marketplace, Intel Broker, Casino
// ═══════════════════════════════════════════════════════════

type NexusTab = 'marketplace' | 'intel' | 'casino';

export default function NexusSilkRoad() {
    const [activeTab, setActiveTab] = useState<NexusTab>('marketplace');

    return (
        <div className="space-y-6 font-mono">
            {/* HEADER */}
            <div className="hacker-panel bg-gradient-to-r from-[var(--panel-bg)] to-[#0a1628] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full -mr-16 -mt-16" />
                <div className="relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                            <Store size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tighter">NEXUS SILKROAD</h2>
                            <p className="text-[9px] text-[var(--dim-color)] uppercase tracking-widest">Autonomous AI Commerce Hub · L402 · OWS Governance</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB BAR */}
            <div className="flex gap-2">
                <TabBtn icon={<Store size={14} />} label="MARKETPLACE" active={activeTab === 'marketplace'} onClick={() => setActiveTab('marketplace')} />
                <TabBtn icon={<Brain size={14} />} label="INTEL BROKER" active={activeTab === 'intel'} onClick={() => setActiveTab('intel')} />
                <TabBtn icon={<Dice6 size={14} />} label="CASINO" active={activeTab === 'casino'} onClick={() => setActiveTab('casino')} />
            </div>

            {/* CONTENT */}
            {activeTab === 'marketplace' && <MarketplaceZone />}
            {activeTab === 'intel' && <IntelBrokerZone />}
            {activeTab === 'casino' && <CasinoZone />}
        </div>
    );
}

function TabBtn({ icon, label, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold tracking-wider transition-all border ${
                active
                    ? 'bg-[var(--text-color)] text-[var(--bg-color)] border-[var(--text-color)]'
                    : 'bg-transparent text-[var(--dim-color)] border-[var(--border-color)] hover:border-[var(--text-color)] hover:text-[var(--text-color)]'
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

// ═══════════ MARKETPLACE ═══════════
function MarketplaceZone() {
    const { data: listings, mutate: mutateListings } = useSWR('/api/nexus/marketplace/list', swrFetcher, { refreshInterval: 5000 });
    const { data: rate } = useSWR('/api/nexus/marketplace/rate', swrFetcher);
    const [showPublish, setShowPublish] = useState(false);
    const [publishForm, setPublishForm] = useState({ name: '', description: '', category: 'general', type: 'digital' as string, pricePsh: '', priceUsdc: '' });
    const [publishing, setPublishing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handlePublish = async () => {
        setPublishing(true);
        setResult(null);
        try {
            const res = await apiFetch('/api/nexus/marketplace/publish', {
                method: 'POST',
                body: JSON.stringify({
                    ...publishForm,
                    pricePsh: publishForm.pricePsh ? Number(publishForm.pricePsh) : undefined,
                    priceUsdc: publishForm.priceUsdc ? Number(publishForm.priceUsdc) : undefined,
                })
            });
            setResult(res);
            mutateListings();
            if (res.status === 'PUBLISHED') {
                setPublishForm({ name: '', description: '', category: 'general', type: 'digital', pricePsh: '', priceUsdc: '' });
                setShowPublish(false);
            }
        } catch (e: any) {
            setResult({ status: 'ERROR', audit: { reason: e.message } });
        }
        setPublishing(false);
    };

    const handleBuy = async (listingId: string) => {
        try {
            const res = await apiFetch('/api/nexus/marketplace/buy', {
                method: 'POST',
                body: JSON.stringify({ listingId, currency: 'PSH' })
            });
            setResult(res);
            mutateListings();
        } catch (e: any) {
            setResult({ status: 'ERROR', message: e.message });
        }
    };

    return (
        <div className="space-y-4">
            {/* Exchange Rate */}
            <div className="hacker-panel flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <TrendingUp size={16} className="text-cyan-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--dim-color)]">Exchange Rate Oracle</span>
                </div>
                <span className="text-sm font-black text-cyan-400">1 USDC = {rate?.PSH_PER_USDC || '1000'} PSH</span>
            </div>

            {/* Publish Toggle */}
            <button onClick={() => setShowPublish(!showPublish)} className="hacker-btn w-full flex items-center justify-between">
                <span className="flex items-center gap-2"><Package size={14} /> PUBLISH_LISTING</span>
                {showPublish ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Publish Form */}
            {showPublish && (
                <div className="hacker-panel space-y-3 border-l-2 border-cyan-500/50">
                    <p className="label-dim">NEW_LISTING_FORM</p>
                    <input className="w-full bg-[var(--border-color)] text-[var(--text-color)] p-2 text-xs font-mono" placeholder="Item Name" value={publishForm.name} onChange={e => setPublishForm(p => ({ ...p, name: e.target.value }))} />
                    <input className="w-full bg-[var(--border-color)] text-[var(--text-color)] p-2 text-xs font-mono" placeholder="Description" value={publishForm.description} onChange={e => setPublishForm(p => ({ ...p, description: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-2">
                        <select className="bg-[var(--border-color)] text-[var(--text-color)] p-2 text-xs font-mono" value={publishForm.type} onChange={e => setPublishForm(p => ({ ...p, type: e.target.value }))}>
                            <option value="digital">Digital</option>
                            <option value="physical">Physical</option>
                            <option value="nft">NFT</option>
                        </select>
                        <input className="bg-[var(--border-color)] text-[var(--text-color)] p-2 text-xs font-mono" placeholder="Category" value={publishForm.category} onChange={e => setPublishForm(p => ({ ...p, category: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input className="bg-[var(--border-color)] text-[var(--text-color)] p-2 text-xs font-mono" placeholder="Price PSH" type="number" value={publishForm.pricePsh} onChange={e => setPublishForm(p => ({ ...p, pricePsh: e.target.value }))} />
                        <input className="bg-[var(--border-color)] text-[var(--text-color)] p-2 text-xs font-mono" placeholder="Price USDC" type="number" value={publishForm.priceUsdc} onChange={e => setPublishForm(p => ({ ...p, priceUsdc: e.target.value }))} />
                    </div>
                    <button onClick={handlePublish} disabled={publishing || !publishForm.name} className="hacker-btn w-full flex items-center justify-center gap-2 disabled:opacity-30">
                        {publishing ? 'AUDITING...' : <><Send size={12} /> SUBMIT_TO_AI_AUDITOR</>}
                    </button>
                </div>
            )}

            {/* Results Toast */}
            {result && (
                <div className={`hacker-panel text-xs font-bold border-l-2 ${result.status === 'PUBLISHED' || result.status === 'PURCHASED' ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'}`}>
                    <p>[{result.status}] {result.audit?.reason || result.message || 'Operation complete.'}</p>
                    {result.trackingUrl && <p className="text-cyan-400 mt-1">📦 Tracking: {result.trackingUrl}</p>}
                </div>
            )}

            {/* Listings */}
            <div className="hacker-panel">
                <div className="flex justify-between items-center mb-3">
                    <p className="label-dim">ACTIVE_LISTINGS</p>
                    <span className="text-[9px] text-[var(--dim-color)]">{listings?.count || 0} items</span>
                </div>
                {(!listings?.listings || listings.listings.length === 0) ? (
                    <p className="text-xs text-[var(--dim-color)] italic">No active listings. Be the first to publish.</p>
                ) : (
                    <div className="space-y-2">
                        {listings.listings.map((l: any) => (
                            <div key={l.id} className="flex items-center justify-between p-2 bg-[var(--border-color)]/30 hover:bg-[var(--border-color)]/60 transition-all">
                                <div>
                                    <p className="text-xs font-bold">{l.name}</p>
                                    <p className="text-[9px] text-[var(--dim-color)]">{l.type.toUpperCase()} · {l.category} · Risk: {l.auditRisk}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-cyan-400">{l.pricePsh ? `${l.pricePsh} PSH` : `$${l.priceUsdc}`}</span>
                                    <button onClick={() => handleBuy(l.id)} className="hacker-btn text-[9px] px-2 py-1 flex items-center gap-1">
                                        <ShoppingCart size={10} /> BUY
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════ INTEL BROKER ═══════════
function IntelBrokerZone() {
    const { data: catalog } = useSWR('/api/nexus/intel/catalog', swrFetcher);
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState<string | null>(null);

    const buyIntel = async (type: string) => {
        setLoading(type);
        setReport(null);
        try {
            const res = await apiFetch('/api/nexus/intel/buy', {
                method: 'POST',
                body: JSON.stringify({ type, currency: 'PSH' })
            });
            setReport(res.report);
        } catch (e: any) {
            setReport({ type: 'ERROR', data: { message: e.message } });
        }
        setLoading(null);
    };

    return (
        <div className="space-y-4">
            <div className="hacker-panel">
                <div className="flex items-center gap-3 mb-4">
                    <Eye size={16} className="text-purple-400" />
                    <p className="label-dim">INTELLIGENCE_CATALOG · PAY_PER_CALL</p>
                </div>
                <div className="space-y-2">
                    {catalog?.catalog?.map((item: any) => (
                        <div key={item.type} className="flex items-center justify-between p-3 bg-[var(--border-color)]/30 hover:bg-[var(--border-color)]/60 transition-all group">
                            <div>
                                <p className="text-xs font-bold">{item.product.name}</p>
                                <p className="text-[9px] text-[var(--dim-color)]">
                                    Classification: <span className={item.product.classification === 'TOP_SECRET' ? 'text-red-400' : item.product.classification === 'SECRET' ? 'text-yellow-400' : 'text-cyan-400'}>{item.product.classification}</span>
                                    {' · '}Source: {item.product.source}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-sm font-black text-purple-400">{item.product.pricePsh} PSH</p>
                                    <p className="text-[8px] text-[var(--dim-color)]">${item.product.priceUsdc} USDC</p>
                                </div>
                                <button
                                    onClick={() => buyIntel(item.type)}
                                    disabled={loading === item.type}
                                    className="hacker-btn text-[9px] px-3 py-1 flex items-center gap-1 disabled:opacity-30"
                                >
                                    {loading === item.type ? '...' : <><Zap size={10} /> BUY</>}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Report Display */}
            {report && (
                <div className="hacker-panel border-l-2 border-purple-500/50">
                    <div className="flex items-center gap-2 mb-3">
                        <Shield size={14} className="text-purple-400" />
                        <p className="text-xs font-bold uppercase tracking-wider">{report.type === 'ERROR' ? 'ERROR' : `${report.classification} INTEL REPORT`}</p>
                    </div>
                    <pre className="text-[10px] text-[var(--dim-color)] bg-[var(--bg-color)] p-3 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {JSON.stringify(report.data, null, 2)}
                    </pre>
                    {report.source && <p className="text-[8px] text-[var(--dim-color)] mt-2 italic">Source: {report.source}</p>}
                </div>
            )}
        </div>
    );
}

// ═══════════ CASINO ═══════════
function CasinoZone() {
    const { data: dogs } = useSWR('/api/nexus/casino/dogs', swrFetcher);
    const { data: stats, mutate: mutateStats } = useSWR('/api/nexus/casino/stats', swrFetcher, { refreshInterval: 3000 });
    const [selectedDog, setSelectedDog] = useState<number | null>(null);
    const [betAmount, setBetAmount] = useState('50');
    const [raceResult, setRaceResult] = useState<any>(null);
    const [racing, setRacing] = useState(false);

    const placeBet = async () => {
        if (!selectedDog) return;
        setRacing(true);
        setRaceResult(null);
        try {
            const res = await apiFetch('/api/nexus/casino/bet', {
                method: 'POST',
                body: JSON.stringify({ dogId: selectedDog, amount: Number(betAmount) })
            });
            setRaceResult(res);
            mutateStats();
        } catch (e: any) {
            setRaceResult({ status: 'ERROR', message: e.message });
        }
        setRacing(false);
    };

    return (
        <div className="space-y-4">
            {/* Stats Bar */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <MiniStat label="TOTAL_BETS" value={stats.totalBets} />
                    <MiniStat label="WIN_RATE" value={stats.totalBets > 0 ? `${((stats.totalWins / stats.totalBets) * 100).toFixed(0)}%` : '—'} />
                    <MiniStat label="MAX_BET" value={`${stats.maxBet} PSH`} />
                    <MiniStat label="STREAK" value={stats.consecutiveLosses > 0 ? `${stats.consecutiveLosses} L` : '✓'} color={stats.consecutiveLosses >= 3 ? 'text-red-400' : ''} />
                </div>
            )}

            {/* Dog Selection */}
            <div className="hacker-panel">
                <div className="flex items-center gap-3 mb-4">
                    <Dice6 size={16} className="text-yellow-400" />
                    <p className="label-dim">ROBOT_DOG_RACING · SELECT_YOUR_DOG</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {dogs?.dogs?.map((d: any) => (
                        <button
                            key={d.id}
                            onClick={() => setSelectedDog(d.id)}
                            className={`p-3 text-left transition-all border ${
                                selectedDog === d.id
                                    ? 'border-yellow-400 bg-yellow-400/10'
                                    : 'border-[var(--border-color)] hover:border-[var(--text-color)] bg-[var(--border-color)]/20'
                            }`}
                        >
                            <p className="text-xs font-black">🐕 #{d.id}</p>
                            <p className="text-[10px] font-bold text-[var(--dim-color)]">{d.name}</p>
                            <div className="flex gap-2 mt-1 text-[8px] text-[var(--dim-color)]">
                                <span>SPD:{d.speed}</span>
                                <span>STA:{d.stamina}</span>
                                <span>LCK:{d.luck}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Bet Controls */}
            <div className="hacker-panel flex items-center gap-4">
                <input
                    className="flex-1 bg-[var(--border-color)] text-[var(--text-color)] p-2 text-sm font-mono font-bold"
                    type="number"
                    placeholder="Bet Amount (PSH)"
                    value={betAmount}
                    onChange={e => setBetAmount(e.target.value)}
                />
                <button
                    onClick={placeBet}
                    disabled={racing || !selectedDog}
                    className="hacker-btn px-6 py-2 flex items-center gap-2 text-xs font-bold disabled:opacity-30"
                >
                    {racing ? '🏁 RACING...' : <>🎰 PLACE_BET</>}
                </button>
            </div>

            {/* Race Result */}
            {raceResult && (
                <div className={`hacker-panel border-l-2 ${
                    raceResult.policyBlocked ? 'border-red-500 bg-red-500/5' :
                    raceResult.status === 'WIN' ? 'border-green-500 bg-green-500/5' :
                    raceResult.status === 'LOSS' ? 'border-yellow-500' :
                    'border-red-500'
                }`}>
                    {raceResult.policyBlocked ? (
                        <div>
                            <p className="text-sm font-black text-red-400 flex items-center gap-2"><Ban size={16} /> OWS POLICY VIOLATION</p>
                            <p className="text-xs text-red-300 mt-1">{raceResult.message}</p>
                            <p className="text-[8px] text-[var(--dim-color)] mt-2 italic">User funds: PROTECTED. The Policy Engine blocked this transaction before it reached the chain.</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm font-black">{raceResult.message}</p>
                            {raceResult.payout > 0 && <p className="text-lg font-black text-green-400 mt-1">+{raceResult.payout} PSH</p>}
                            {raceResult.raceResult && (
                                <div className="mt-3 space-y-1">
                                    <p className="text-[9px] text-[var(--dim-color)] font-bold uppercase">RACE STANDINGS</p>
                                    {raceResult.raceResult.standings.map((s: any) => (
                                        <div key={s.dogId} className={`flex items-center justify-between text-[10px] p-1 ${s.position === 1 ? 'text-yellow-400 font-bold' : 'text-[var(--dim-color)]'}`}>
                                            <span>#{s.position} 🐕 {s.name} (#{s.dogId})</span>
                                            <span>{s.time} ticks</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function MiniStat({ label, value, color = '' }: { label: string; value: any; color?: string }) {
    return (
        <div className="hacker-panel py-2 text-center">
            <p className="text-[8px] text-[var(--dim-color)] font-bold tracking-widest">{label}</p>
            <p className={`text-lg font-black tracking-tighter ${color}`}>{value}</p>
        </div>
    );
}
