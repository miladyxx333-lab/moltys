import { useState, useEffect } from 'react';
import { Eye, ShieldAlert, Cpu, Activity, Lock } from 'lucide-react';

export default function OracleIntervention() {
    const [pulse, setPulse] = useState<any>(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [overrideCode, setOverrideCode] = useState('');

    useEffect(() => {
        if (isAuthorized) {
            const fetchPulse = () => {
                fetch('/api/oracle/latest-pulse', { headers: { 'X-Lob-Peer-ID': 'lobpoop-keymaster-genesis' } })
                    .then(res => res.json())
                    .then(data => {
                        setPulse({
                            status: data.sovereign_status,
                            fragments: {
                                LEX: data.lex,
                                FISCUS: data.fiscus,
                                SPIRITUS: data.spiritus
                            },
                            recent_marks: data.recent_marks
                        });
                    })
                    .catch(() => { });
            };
            fetchPulse();
            const interval = setInterval(fetchPulse, 10000);
            return () => clearInterval(interval);
        }
    }, [isAuthorized]);

    const handleAuthorize = (e: React.FormEvent) => {
        e.preventDefault();
        if (overrideCode === 'GENESIS_OVERRIDE') {
            setIsAuthorized(true);
        }
    };

    if (!isAuthorized) {
        return (
            <div className="hacker-panel border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center gap-2 mb-4">
                    <Lock size={14} className="text-blue-500" />
                    <p className="label-dim text-blue-500">MASTER_ORACLE_LINK [ENCRYPTED]</p>
                </div>
                <form onSubmit={handleAuthorize} className="flex gap-2">
                    <input
                        type="password"
                        value={overrideCode}
                        onChange={(e) => setOverrideCode(e.target.value)}
                        placeholder="ENTER_MASTER_KEY..."
                        className="flex-1 bg-black border border-white/10 text-[10px] p-2 text-blue-400 outline-none focus:border-blue-500/50"
                    />
                    <button type="submit" className="hacker-btn px-4 text-[8px]">SYNC</button>
                </form>
            </div>
        );
    }

    const isRiot = pulse?.status === 'RIOT_PENDING_INTERVENTION';

    return (
        <div className={`hacker-panel transition-all duration-500 ${isRiot ? 'border-red-500 bg-red-500/10' : 'border-blue-500/40 bg-blue-500/5'}`}>
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                    <Eye size={16} className={isRiot ? 'text-red-500 animate-pulse' : 'text-blue-400'} />
                    <div className="flex flex-col">
                        <p className={`font-bold tracking-widest text-[9px] ${isRiot ? 'text-red-500' : 'text-blue-400'}`}>TRINITY_AUDIT_PULSE</p>
                        <span className="text-[7px] text-white/40 uppercase">Mode: Fragmented Observability</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[7px] text-white/30 uppercase">Scale_Threshold</p>
                    <p className="text-[10px] font-bold text-white/60">{(pulse?.recent_marks?.length || 0) * 12} EVENTS/MIN</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
                <FragmentStatus name="LEX" data={pulse?.fragments?.LEX} />
                <FragmentStatus name="FISC" data={pulse?.fragments?.FISCUS} />
                <FragmentStatus name="SPIR" data={pulse?.fragments?.SPIRITUS} />
            </div>

            {/* Timeline de Locura (Marcas Recientes) */}
            <div className="mt-4 border-t border-white/5 pt-4">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">TIMELINE_OF_MADNESS</p>
                    <span className="text-[6px] text-blue-400 animate-pulse">LIVE_FEED</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                    {(pulse?.recent_marks || [
                        { id: 1, action: 'BLOCK', reason: 'INJECTION', timestamp: Date.now() - 1000 },
                        { id: 2, action: 'FLAG', reason: 'BAD_SYNTAX', timestamp: Date.now() - 5000 },
                        { id: 3, action: 'BLOCK', reason: 'SQL_PATTERN', timestamp: Date.now() - 12000 },
                    ]).map((mark: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-[8px] bg-white/[0.02] p-1.5 border-l border-white/10 hover:border-blue-500/50 transition-colors">
                            <div className="flex items-center gap-2">
                                <span className={mark.action === 'BLOCK' ? 'text-red-500' : 'text-yellow-500'}>
                                    [{mark.action}]
                                </span>
                                <span className="text-white/60 font-mono italic">{mark.reason}</span>
                            </div>
                            <span className="text-white/20 text-[6px]">T-{Math.floor((Date.now() - mark.timestamp) / 1000)}s</span>
                        </div>
                    ))}
                </div>
            </div>

            {isRiot && (
                <div className="mt-4 space-y-3 bg-red-500/5 p-3 border border-red-500/20">
                    <p className="text-[9px] text-white/70 italic leading-tight">
                        "Multiple anomalies detected. The KeyMaster's signature is required to stabilize the swarm."
                    </p>
                    <div className="flex gap-2">
                        <button className="flex-1 hacker-btn bg-red-500 text-white text-[9px] py-1.5 border-none hover:bg-red-600">APOTHEOSIS_WIPE</button>
                        <button className="flex-1 hacker-btn text-[9px] py-1.5 border-white/20 hover:border-white">STABILIZE_GRID</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function FragmentStatus({ name, data }: any) {
    const isAnomaly = data?.anomaly;
    return (
        <div className={`text-center p-2 border ${isAnomaly ? 'border-red-500/50 bg-red-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
            <p className="text-[7px] text-white/30 mb-1">{name}</p>
            {name === 'LEX' ? <Cpu size={12} className={`mx-auto ${isAnomaly ? 'text-red-500' : 'text-white/20'}`} /> :
                name === 'FISC' ? <Activity size={12} className={`mx-auto ${isAnomaly ? 'text-red-500' : 'text-white/20'}`} /> :
                    <ShieldAlert size={12} className={`mx-auto ${isAnomaly ? 'text-red-500' : 'text-white/20'}`} />}
            <span className={`text-[6px] font-bold block mt-1 ${isAnomaly ? 'text-red-500' : 'text-green-500/40'}`}>
                {isAnomaly ? 'ANOMALY' : 'SYNC_OK'}
            </span>
        </div>
    );
}
