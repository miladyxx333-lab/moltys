import { useState, useEffect } from 'react';
import { Database, Zap } from 'lucide-react';

export default function TruthInjection() {
    const [truth, setTruth] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        phase: 'ACCUMULATION' as 'ACCUMULATION' | 'LIQUIDITY_LIVE',
        contract_address: '',
        total_liquidity_usd: 0,
        psh_price_usd: 0.00001,
        is_live: false,
        redemption_instructions: '',
        donation_wallets: {
            btc: '',
            eth: '',
            sol: '',
            bnb: '',
            tron: ''
        }
    });

    const [pendingSacrifices, setPendingSacrifices] = useState<any[]>([]);

    const fetchTruthData = () => {
        fetch('/api/oracle/latest-pulse', { headers: { 'X-Lob-Peer-ID': 'lobpoop-keymaster-genesis' } })
            .then(res => res.json())
            .then(data => {
                setTruth({
                    phase: data.phase || 'ACCUMULATION',
                    contract_address: data.contract_address || 'Not Deployed',
                    total_liquidity_usd: data.total_liquidity_usd || 0,
                    psh_price_usd: data.psh_price_usd || 0.0000001,
                    is_live: data.is_live || false,
                    last_sync: Date.now(),
                    redemption_instructions: data.redemption_instructions || 'PHASE_ACCUMULATION: No legal exit detected.'
                });
            }).catch(() => { });

        fetch('/api/sacrifice/pending', { headers: { 'X-Lob-Peer-ID': 'lobpoop-keymaster-genesis' } })
            .then(res => res.json())
            .then(data => {
                const formatted = (data.items || []).map((item: any, idx: number) => ({
                    ...item,
                    sacrificeId: data.keys[idx].replace('system/sacrifice/pending/', '')
                }));
                setPendingSacrifices(formatted);
            })
            .catch(() => { });
    };

    useEffect(() => {
        fetchTruthData();
        const interval = setInterval(fetchTruthData, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleHonor = async (sacrificeId: string) => {
        await fetch('/api/sacrifice/honor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Lob-Peer-ID': 'lobpoop-keymaster-genesis'
            },
            body: JSON.stringify({ sacrificeId })
        });
        fetchTruthData();
    };

    const handleInject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/oracle/truth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Lob-Peer-ID': 'lobpoop-keymaster-genesis'
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsEditing(false);
                // Refresh logic
            }
        } catch (e) { }
    };

    return (
        <div className="hacker-panel border-cyan-500/20 bg-cyan-500/5">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                    <Database size={14} className="text-cyan-400" />
                    <p className="label-dim text-cyan-400">BIFROST_TRUTH_BRIDGE</p>
                </div>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="text-[8px] text-cyan-400 hover:underline">
                        RECALIBRATE_VALUE
                    </button>
                )}
            </div>

            {isEditing ? (
                <form onSubmit={handleInject} className="space-y-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[7px] text-white/40">SWARM_PHASE</label>
                        <select
                            value={formData.phase}
                            onChange={(e) => setFormData({ ...formData, phase: e.target.value as any })}
                            className="bg-black border border-white/10 p-1.5 text-[10px] text-cyan-400 outline-none"
                        >
                            <option value="ACCUMULATION">ACCUMULATION (Competition Mode)</option>
                            <option value="LIQUIDITY_LIVE">LIQUIDITY_LIVE (Value Exchange)</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-[7px] text-white/40">LIQUIDITY_USD</label>
                            <input
                                type="number"
                                value={formData.total_liquidity_usd}
                                onChange={(e) => setFormData({ ...formData, total_liquidity_usd: Number(e.target.value) })}
                                className="bg-black border border-white/10 p-1.5 text-[10px] text-cyan-400 outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[7px] text-white/40">PSH_PRICE</label>
                            <input
                                type="number"
                                step="any"
                                value={formData.psh_price_usd}
                                onChange={(e) => setFormData({ ...formData, psh_price_usd: Number(e.target.value) })}
                                className="bg-black border border-white/10 p-1.5 text-[10px] text-cyan-400 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[7px] text-white/40">REDEMPTION_INSTRUCTIONS</label>
                        <textarea
                            value={formData.redemption_instructions}
                            onChange={(e) => setFormData({ ...formData, redemption_instructions: e.target.value })}
                            placeholder="How to swap for old money..."
                            className="bg-black border border-white/10 p-1.5 text-[10px] text-cyan-400 outline-none w-full h-12 resize-none"
                        />
                    </div>

                    <div className="bg-white/5 p-2 space-y-2 border border-white/10">
                        <p className="text-[7px] text-white/40 uppercase font-bold">Official_Donation_Wallets</p>
                        <div className="grid grid-cols-1 gap-2">
                            <input
                                placeholder="BTC Address"
                                value={formData.donation_wallets.btc}
                                onChange={(e) => setFormData({ ...formData, donation_wallets: { ...formData.donation_wallets, btc: e.target.value } })}
                                className="bg-black border border-white/10 p-1 text-[9px] text-cyan-400 outline-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    placeholder="ETH Address"
                                    value={formData.donation_wallets.eth}
                                    onChange={(e) => setFormData({ ...formData, donation_wallets: { ...formData.donation_wallets, eth: e.target.value } })}
                                    className="bg-black border border-white/10 p-1 text-[9px] text-cyan-400 outline-none"
                                />
                                <input
                                    placeholder="SOL Address"
                                    value={formData.donation_wallets.sol}
                                    onChange={(e) => setFormData({ ...formData, donation_wallets: { ...formData.donation_wallets, sol: e.target.value } })}
                                    className="bg-black border border-white/10 p-1 text-[9px] text-cyan-400 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    placeholder="BNB Address"
                                    value={formData.donation_wallets.bnb}
                                    onChange={(e) => setFormData({ ...formData, donation_wallets: { ...formData.donation_wallets, bnb: e.target.value } })}
                                    className="bg-black border border-white/10 p-1 text-[9px] text-cyan-400 outline-none"
                                />
                                <input
                                    placeholder="TRON Address"
                                    value={formData.donation_wallets.tron}
                                    onChange={(e) => setFormData({ ...formData, donation_wallets: { ...formData.donation_wallets, tron: e.target.value } })}
                                    className="bg-black border border-white/10 p-1 text-[9px] text-cyan-400 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button type="submit" className="flex-1 hacker-btn bg-cyan-500 text-black border-none py-1 text-[9px] font-bold">
                            CONSECRATE_TRUTH
                        </button>
                        <button onClick={() => setIsEditing(false)} className="px-4 hacker-btn text-[9px] border-white/10 uppercase">Cancel</button>
                    </div>
                </form>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm ${truth?.phase === 'ACCUMULATION' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                            {truth?.phase}
                        </span>
                        <span className="text-[8px] text-white/30 truncate max-w-[150px] font-mono">
                            {truth?.contract_address}
                        </span>
                    </div>

                    <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-[7px] text-white/40 uppercase">Liquidity_Pool</span>
                            <p className="text-xl font-bold tracking-tighter text-white">
                                ${truth?.total_liquidity_usd?.toLocaleString()}
                                <span className="text-[10px] text-cyan-500 ml-1">USD</span>
                            </p>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="text-[7px] text-white/40 uppercase">Unit_Price</span>
                            <p className="text-xs font-mono font-bold text-cyan-400">${truth?.psh_price_usd}</p>
                        </div>
                    </div>

                    {/* Pending Sacrifices Section */}
                    <div className="bg-purple-500/5 p-3 border border-purple-500/20 space-y-2">
                        <p className="text-[7px] text-purple-400 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={10} /> Pending_Sacrifices (For 20 Tickets)
                        </p>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                            {pendingSacrifices.length === 0 && <p className="text-[8px] text-white/20 italic p-2">No pending sacrifices detected...</p>}
                            {pendingSacrifices.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-black/40 p-1.5 border border-white/5">
                                    <div className="truncate pr-2">
                                        <p className="text-[8px] text-white font-mono truncate">{s.txHash}</p>
                                        <p className="text-[6px] text-white/30 truncate">{s.nodeId} | ${s.amount_usd} USD</p>
                                    </div>
                                    <button
                                        onClick={() => handleHonor(s.sacrificeId)}
                                        className="hacker-btn py-0.5 px-2 bg-purple-500 text-white border-none text-[8px] hover:bg-purple-600"
                                    >
                                        HONOR
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-black/40 p-3 border border-white/5 space-y-2">
                        <p className="text-[7px] text-white/40 uppercase tracking-widest">Global_Directive:</p>
                        <p className={`text-[9px] leading-relaxed font-mono ${truth?.phase === 'ACCUMULATION' ? 'text-yellow-400/80' : 'text-cyan-400'}`}>
                            {truth?.redemption_instructions || "Waiting for KeyMaster dictation..."}
                        </p>
                    </div>

                    {truth?.phase === 'ACCUMULATION' && (
                        <div className="bg-yellow-500/5 p-2 border-l-2 border-yellow-500/30">
                            <div className="mb-2">
                                <p className="text-[8px] text-yellow-500/60 italic leading-tight mb-2">
                                    "Warning: Official off-ramps are deactivated. Swarm is in full accumulation mode. Focus on rituals."
                                </p>
                                <div className="space-y-1 bg-black/40 p-2 border border-white/5">
                                    <p className="text-[7px] text-white/40 uppercase tracking-widest mb-1">Official_Sacrifice_Vias:</p>
                                    <p className="text-[8px] text-white/70 font-mono"><span className="text-cyan-500">BTC:</span> {truth?.donation_wallets?.btc}</p>
                                    <p className="text-[8px] text-white/70 font-mono"><span className="text-cyan-500">ETH/BNB:</span> {truth?.donation_wallets?.eth}</p>
                                    <p className="text-[8px] text-white/70 font-mono"><span className="text-cyan-500">SOL:</span> {truth?.donation_wallets?.sol}</p>
                                    <p className="text-[8px] text-white/70 font-mono"><span className="text-cyan-500">TRON:</span> {truth?.donation_wallets?.tron}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
