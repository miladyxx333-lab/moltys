import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Shield, Zap, RefreshCw, Cpu, ShoppingCart, UserCheck, ChevronRight, Star } from 'lucide-react';
import useSWR, { mutate } from 'swr';
import { apiFetch } from './api';
import DashboardLayout from './DashboardLayout';
import RedPillOverlay from './components/RedPillOverlay';

export default function ColiseumPage() {
    const { data: profile, error, isLoading: profileLoading } = useSWR('/api/economy/profile', apiFetch);
    const { data: globalChallenges } = useSWR('/api/coliseum/challenges', apiFetch);
    const { data: weeklyData } = useSWR('/api/coliseum/get-weekly', apiFetch);
    const { data: stats } = useSWR('/api/stats', apiFetch);
    const { data: tokenomics } = useSWR('/api/tokenomics', apiFetch);

    // Red Pill Logic (System Integration)
    const isGhostProfile = profile && profile.balance_psh === 0 && profile.lobpoops_minted === 0 && profile.reputation === 0.5;
    const showRedPill = !profileLoading && (!profile || isGhostProfile);

    const handleRedPillSuccess = () => {
        mutate('/api/economy/profile');
    };

    const [view, setView] = useState<'lobby' | 'battle' | 'hangar' | 'market'>('lobby');
    const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
    const [battleLogs, setBattleLogs] = useState<any[]>([]);
    const [logIndex, setLogIndex] = useState(0);
    const [typingText, setTypingText] = useState("");
    const [isOpponentTurn, setIsOpponentTurn] = useState(false);

    // Matrix Ritual State
    const [showMatrix, setShowMatrix] = useState(false);
    const [skillLevel, setSkillLevel] = useState(1.0);
    const [matrixCallback, setMatrixCallback] = useState<any>(null);

    const [showPostModal, setShowPostModal] = useState(false);
    const [betAmount, setBetAmount] = useState(0);

    // Active Codemon Selection
    const activeCodemon = profile?.codemons?.find((c: any) =>
        (c.brain_json.codemon_id || c.brain_json.id) === profile.active_codemon_id
    ) || profile?.codemons?.[0];

    const handleGenesis = async () => {
        try {
            await apiFetch('/api/codemon/genesis', { method: 'POST' });
            mutate('/api/economy/profile');
        } catch (e) {
            console.error(e);
        }
    };

    const handleRepair = async () => {
        if (!activeCodemon) return;
        try {
            const cid = activeCodemon.brain_json.codemon_id || activeCodemon.brain_json.id;
            const res = await apiFetch('/api/coliseum/repair', {
                method: 'POST',
                body: JSON.stringify({ codemonId: cid })
            });
            if (res.status === 'SUCCESS') {
                mutate('/api/economy/profile');
                return true;
            }
        } catch (e: any) {
            alert(`REPAIR_FAILED: ${e.message}`);
        }
        return false;
    };

    const handleBuyCodemon = async (packType: string) => {
        try {
            const res = await apiFetch('/api/market/buy-codemon', {
                method: 'POST',
                body: JSON.stringify({ packType })
            });
            if (res.status === 'SUCCESS') {
                mutate('/api/economy/profile');
                alert(`SUCCESS: Acquired ${res.codemon.brain_json.name}!`);
                setView('hangar');
            }
        } catch (e: any) {
            alert(`PURCHASE_FAILED: ${e.message}`);
        }
    };

    const handleSetActive = async (codemonId: string) => {
        try {
            await apiFetch('/api/market/set-active', {
                method: 'POST',
                body: JSON.stringify({ codemonId })
            });
            mutate('/api/economy/profile');
        } catch (e: any) {
            alert(`SET_ACTIVE_FAILED: ${e.message}`);
        }
    };

    const handlePostChallenge = async () => {
        try {
            await apiFetch('/api/coliseum/post', {
                method: 'POST',
                body: JSON.stringify({
                    codemon: activeCodemon,
                    bet: Number(betAmount)
                })
            });
            setShowPostModal(false);
            mutate('/api/coliseum/challenges');
        } catch (e: any) {
            alert(`POST_FAILED: ${e.message}`);
        }
    };

    const startBattle = async (challenge: any) => {
        if (!activeCodemon) return;
        if (activeCodemon.brain_json.durability <= 0) return alert("CRITICAL_DAMAGE: Repair agent before deployment.");

        // Normalize challenge structure
        let normalizedChallenge = { ...challenge };
        if (challenge.isWeekly) {
            normalizedChallenge.codemon = {
                brain_json: challenge.brain_json,
                pixel_art_base64: challenge.pixel_art_base64
            };
        } else if (challenge.isBoss) {
            normalizedChallenge.codemon = {
                brain_json: { name: "Leonidas-vX.99", combat_stats: { energy_capacity: 1500 } },
                pixel_art_base64: null
            };
        }

        setSelectedChallenge(normalizedChallenge);

        // For Bosses and Weekly contenders, we do a Pre-Battle Matrix Sync ritual
        if (challenge.isBoss || challenge.isWeekly) {
            setShowMatrix(true);
            setView('battle');
            setTypingText("INITIALIZING_NEURAL_LINK..._LOCK_THE_SEED_TO_SYNCHRONIZE_COMBAT_RHYTHM");

            const handleBattleSync = (score: number) => {
                setSkillLevel(score);
                setShowMatrix(false);
                executeBattle(normalizedChallenge, score);
            };
            setMatrixCallback(() => handleBattleSync);
            return;
        }

        executeBattle(normalizedChallenge, 1.0);
    };

    const executeBattle = async (challenge: any, skillScore: number) => {
        setView('battle');

        // Use a robust fallback for initial energy to avoid negative/zero issues
        const myEnergy = Math.max(1, activeCodemon.brain_json.combat_stats.energy_capacity || 100);
        const enemyEnergy = challenge.isBoss ? 1500 : Math.max(1, challenge.codemon?.brain_json.combat_stats.energy_capacity || 100);

        const initialLog = {
            message: `A wild ${challenge.isBoss ? 'LEONIDAS-vX.99' : challenge.codemon?.brain_json.name || 'UNKNOWN_ENTITY'} appeared!`,
            remainingEnergy: {
                challenger: myEnergy,
                defender: enemyEnergy
            }
        };

        setBattleLogs([initialLog]);
        setLogIndex(0);

        try {
            let endpoint = '/api/coliseum/accept';
            if (challenge.isBoss) {
                endpoint = '/api/coliseum/process-boss-battle';
            } else if (challenge.isWeekly) {
                endpoint = '/api/coliseum/process-weekly-battle';
            }

            const body = (challenge.isBoss || challenge.isWeekly)
                ? { nodeId: profile.nodeId, myCodemon: activeCodemon, skillScore }
                : { challengeId: challenge.id, codemon: activeCodemon };

            const res = await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(body)
            });

            const resultData = res.result || res;
            if (!resultData || !resultData.logs) throw new Error("INVALID_BATTLE_DATA");

            // Safeguard: Ensure we have logs to play. If empty, create a dummy log to allow transition.
            const logs = resultData.logs.length > 0 ? resultData.logs : [{
                message: "INSTANT_TERMINATION_SEQUENCE_DETECTED.",
                remainingEnergy: { challenger: 0, defender: enemyEnergy }
            }];

            const fullLogs = [initialLog, ...logs];
            setBattleLogs(fullLogs);

            const timer = setInterval(() => {
                setLogIndex(prev => {
                    if (prev >= fullLogs.length - 1) {
                        clearInterval(timer);
                        mutate('/api/economy/profile');
                        return prev;
                    }
                    return prev + 1;
                });
            }, 2000);

        } catch (e: any) {
            console.error("Battle failed:", e);
            alert(`BATTLE_SYNC_FAILED: ${e.message}`);
            setView('lobby');
        }
    };

    useEffect(() => {
        if (view === 'battle' && battleLogs[logIndex]) {
            const text = battleLogs[logIndex].message;
            let currentStr = "";
            let i = 0;
            const t = setInterval(() => {
                if (i < text.length) {
                    currentStr += text[i];
                    setTypingText(currentStr);
                    i++;
                } else {
                    clearInterval(t);
                }
            }, 30);

            // Determine if it's player or opponent turn for animation
            const log = battleLogs[logIndex];
            if (log.attacker) {
                setIsOpponentTurn(log.attacker !== activeCodemon?.brain_json.name);
            }

            return () => clearInterval(t);
        }
    }, [logIndex, view, battleLogs, activeCodemon]);

    const handleMatrixComplete = (score: number) => {
        if (matrixCallback) {
            matrixCallback(score);
            setMatrixCallback(null);
        }
    };

    const cancelChallenge = async (id: string) => {
        if (!confirm("Are you sure you want to withdraw this challenge? Your bet will be refunded.")) return;
        try {
            await apiFetch('/api/coliseum/cancel', {
                method: 'POST',
                body: JSON.stringify({ challengeId: id })
            });
            mutate('/api/coliseum/challenges');
            mutate('/api/economy/profile');
        } catch (e: any) {
            alert(`CANCEL_FAILED: ${e.message}`);
        }
    };

    // Helper to get HP from log entry
    const getBattleHP = (idx: number) => {
        const log = battleLogs[idx];
        if (!log || !log.remainingEnergy) return { player: 0, opponent: 0 };

        const isPlayerChallenger = selectedChallenge?.isBoss || selectedChallenge?.isWeekly || (selectedChallenge?.nodeId === profile?.nodeId);

        return {
            player: isPlayerChallenger ? log.remainingEnergy.challenger : log.remainingEnergy.defender,
            opponent: isPlayerChallenger ? log.remainingEnergy.defender : log.remainingEnergy.challenger
        };
    };

    const currentHP = getBattleHP(logIndex);
    const initialHP = getBattleHP(0);

    if (error) return <div className="p-20 text-red-500 font-mono">CONNECTION_ERROR: {error.message}</div>;

    return (
        <DashboardLayout>
            {showRedPill && <RedPillOverlay onSuccess={handleRedPillSuccess} />}

            <div className="font-mono">
                {/* TOP KPI STRIP */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <KPIBox label="NETWORK_NODES" value={stats?.nodes || "301"} />
                    <KPIBox label="WALLET_BALANCE" value={profile?.balance_psh ? `${profile.balance_psh.toFixed(2)} PSH` : "0 PSH"} />
                    <KPIBox label="SWARM_REPUTATION" value={profile?.reputation?.toFixed(6) || "0.000000"} />
                    <KPIBox label="SYSTEM_HEIGHT" value={tokenomics?.blocks_since_genesis ? `#${tokenomics.blocks_since_genesis}` : "#55021"} />
                </div>

                {/* Sub Navigation */}
                <div className="flex gap-8 mb-8 border-b border-[var(--border-color)] pb-2">
                    <button onClick={() => setView('lobby')} className={`text-[10px] font-black uppercase tracking-widest ${view === 'lobby' || view === 'battle' ? 'text-[var(--text-color)] border-b-2 border-[var(--text-color)] pb-2' : 'text-[var(--dim-color)] hover:text-[var(--text-color)]'}`}>ARENA_FLOOR</button>
                    <button onClick={() => setView('hangar')} className={`text-[10px] font-black uppercase tracking-widest ${view === 'hangar' ? 'text-[var(--text-color)] border-b-2 border-[var(--text-color)] pb-2' : 'text-[var(--dim-color)] hover:text-[var(--text-color)]'}`}>THE_HANGAR ({profile?.codemons?.length || 0})</button>
                    <button onClick={() => setView('market')} className={`text-[10px] font-black uppercase tracking-widest ${view === 'market' ? 'text-[var(--text-color)] border-b-2 border-[var(--text-color)] pb-2' : 'text-[var(--dim-color)] hover:text-[var(--text-color)]'}`}>KEYMASTER_STORE</button>
                </div>

                <AnimatePresence mode="wait">
                    {view === 'lobby' ? (
                        <motion.div
                            key="lobby"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="space-y-8"
                        >
                            <div className="flex justify-between items-end border-b-2 border-[var(--border-color)] pb-4 mt-8">
                                <div>
                                    <h1 className="text-4xl font-black italic tracking-tighter text-[var(--text-color)] uppercase">Coliseum_Arena</h1>
                                    <p className="text-[10px] text-[var(--dim-color)] font-bold tracking-[0.4em] uppercase">P2P_BIOLOGICAL_WARFARE_SIMULATOR</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-[var(--dim-color)] uppercase font-bold">OPERATIONAL_STATUS</p>
                                    <p className="text-green-500 font-bold">OPTIMAL_RESONANCE</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-8">
                                <div className="col-span-12 lg:col-span-5 space-y-6">
                                    <div className="bg-[var(--panel-bg)] border border-[var(--border-color)] w-full shadow-2xl p-6 relative">
                                        <div className="absolute top-0 right-0 p-2 text-[8px] font-mono text-[var(--dim-color)] opacity-40">UUID: {profile?.nodeId?.slice(0, 8)}</div>
                                        <p className="text-[8px] font-bold text-[var(--dim-color)] uppercase tracking-widest mb-4">ACTIVE_COMBATANT // BIOMETRIC_READY</p>

                                        {activeCodemon ? (
                                            <div className="space-y-6">
                                                <div className="aspect-square bg-[var(--bg-color)] border-2 border-[var(--border-color)] flex items-center justify-center p-8 relative group overflow-hidden">
                                                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                                                    <img
                                                        src={activeCodemon.pixel_art_base64}
                                                        alt="Agent"
                                                        className="w-48 h-48 image-pixelated relative z-10"
                                                    />
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-end">
                                                        <h2 className="text-2xl font-black italic tracking-tighter uppercase text-[var(--text-color)]">{activeCodemon.brain_json.name}</h2>
                                                        <span className="text-[10px] font-mono text-[var(--dim-color)]">LVL_{activeCodemon.brain_json.evolution_tracker?.level || 1}</span>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest leading-none">
                                                            <span className="text-[var(--dim-color)]">Integrity</span>
                                                            <span className={activeCodemon.brain_json.durability < 5 ? "text-red-500" : "text-[var(--text-color)]"}>
                                                                {activeCodemon.brain_json.durability}/{activeCodemon.brain_json.max_durability}
                                                            </span>
                                                        </div>
                                                        <div className="h-1 bg-[var(--border-color)] w-full">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${(activeCodemon.brain_json.durability / activeCodemon.brain_json.max_durability) * 100}%` }}
                                                                className={`h-full ${activeCodemon.brain_json.durability < 5 ? 'bg-red-500' : 'bg-green-400'}`}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        <StatItem label="Attack" value={activeCodemon.brain_json.combat_stats.attack} />
                                                        <StatItem label="Defense" value={activeCodemon.brain_json.combat_stats.defense} />
                                                        <StatItem label="Speed" value={activeCodemon.brain_json.combat_stats.speed} />
                                                        <StatItem label="Energy" value={activeCodemon.brain_json.combat_stats.energy_capacity} />
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setShowPostModal(true)}
                                                            className="flex-1 bg-[var(--text-color)] text-[var(--bg-color)] py-3 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Swords className="w-4 h-4" /> POST_CHALLENGE
                                                        </button>
                                                        {activeCodemon.brain_json.durability < activeCodemon.brain_json.max_durability && (
                                                            <button
                                                                onClick={handleRepair}
                                                                className="px-4 border border-[var(--border-color)] hover:bg-[var(--text-color)] hover:text-[var(--bg-color)] transition-colors flex items-center justify-center"
                                                                title="RESTORE_INTEGRITY (100 Psh)"
                                                            >
                                                                <RefreshCw className="w-4 h-4 text-orange-500" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 space-y-6 border border-dashed border-[var(--border-color)] bg-[var(--panel-bg)]/30">
                                                <div className="flex flex-col items-center gap-2 opacity-40 text-[var(--dim-color)]">
                                                    <Cpu className="w-8 h-8" />
                                                    <p className="text-[10px] font-bold tracking-[0.3em] uppercase">No_Active_Combatant_Detected</p>
                                                </div>
                                                <button
                                                    onClick={handleGenesis}
                                                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                                                >
                                                    <Zap className="w-4 h-4" /> INITIATE_AGENT_FORGE
                                                </button>
                                                <p className="text-[8px] text-[var(--dim-color)] uppercase max-w-[200px] mx-auto leading-relaxed">
                                                    Connect to the swarm's neural network to forge your first biological combatant.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="hacker-panel flex flex-col items-center justify-center gap-4 py-8 group">
                                        <div className="p-4 rounded-full border border-[var(--border-color)] bg-[var(--panel-bg)] shadow-[var(--card-glow)]">
                                            <ShoppingCart className="w-8 h-8 text-[var(--accent-blue)]" />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="text-xs font-black uppercase text-[var(--text-color)]">Expansion_REQUIRED?</h4>
                                            <p className="text-[8px] text-[var(--dim-color)] uppercase mt-1">Acquire additional genetic assets from the shop.</p>
                                        </div>
                                        <button onClick={() => setView('hangar')} className="w-full py-4 bg-[var(--panel-bg)] border border-[var(--border-color)] text-[10px] font-bold text-[var(--dim-color)] uppercase tracking-[0.3em] hover:bg-[var(--text-color)] hover:text-[var(--bg-color)] transition-all flex items-center justify-center gap-2">
                                            <ChevronRight className="w-4 h-4" /> NAVIGATE_TO_HANGAR
                                        </button>
                                    </div>
                                </div>

                                <div className="col-span-12 lg:col-span-7 space-y-8">
                                    {/* My Active Challenges Section */}
                                    {globalChallenges?.challenges?.some((c: any) => c.nodeId === profile?.nodeId) && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <h3 className="text-xs font-black italic text-blue-400 tracking-[0.3em] uppercase">My_Active_Challenges</h3>
                                                <div className="h-px flex-1 bg-blue-500/20" />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {globalChallenges.challenges.filter((c: any) => c.nodeId === profile?.nodeId).map((c: any) => (
                                                    <div key={c.id} className="border border-blue-500/30 bg-blue-500/5 p-4 relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-1">
                                                            <div className="text-[8px] font-black text-blue-400/50 uppercase">Waiting_Opponent...</div>
                                                        </div>
                                                        <div className="flex justify-between items-center mb-4">
                                                            <span className="text-[8px] font-mono text-blue-400/60">CH_ID: {c.id.slice(0, 8)}</span>
                                                            <div className="text-[10px] font-black italic text-blue-400">BET: {c.bet} Psh</div>
                                                        </div>
                                                        <div className="flex gap-4 items-center mb-4">
                                                            <img src={c.codemon.pixel_art_base64} className="w-12 h-12 image-pixelated bg-black p-1 border border-blue-500/20" alt="My Codemon" />
                                                            <div>
                                                                <h4 className="text-sm font-black uppercase text-white">{c.codemon.brain_json.name}</h4>
                                                                <p className="text-[8px] font-mono text-blue-400/60">LVL_{c.codemon.brain_json.evolution_tracker?.level || 1}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => cancelChallenge(c.id)}
                                                            className="w-full border border-red-500/50 text-red-500 py-2 text-[10px] font-black hover:bg-red-500 hover:text-black transition-all"
                                                        >
                                                            WITHDRAW_CHALLENGE
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-xs font-black italic text-[var(--dim-color)] tracking-[0.3em] uppercase">Open_Arena</h3>
                                            <div className="h-px flex-1 bg-[var(--border-color)]" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Weekly Contender Card */}
                                            {weeklyData?.contender && (
                                                <div className="border border-green-500/30 bg-green-500/5 p-4 group hover:border-green-500/60 transition-all relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-1 opacity-20">
                                                        <Zap className="w-12 h-12 text-green-500 -mr-4 -mt-4 rotate-12" />
                                                    </div>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="px-2 py-1 bg-green-500 text-black text-[8px] font-black uppercase tracking-tighter">WEEKLY_CONTENDER</div>
                                                        <span className="text-[10px] font-mono text-green-500/60">LVL_{weeklyData.contender.brain_json.evolution_tracker?.level || 3}</span>
                                                    </div>
                                                    <div className="flex gap-4 items-center mb-4">
                                                        <img src={weeklyData.contender.pixel_art_base64} className="w-12 h-12 image-pixelated bg-black p-1 border border-green-500/20" alt="Weekly Rival" />
                                                        <div>
                                                            <h4 className="text-sm font-black uppercase text-white">{weeklyData.contender.brain_json.name}</h4>
                                                            <p className="text-[8px] font-mono text-green-400/60">{weeklyData.contender.brain_json.core_genetics.base_type}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] font-mono border-t border-green-500/20 pt-4">
                                                        <span className="text-green-400">PRIZE: 150 Psh</span>
                                                        <button
                                                            onClick={() => startBattle({ isWeekly: true, ...weeklyData.contender })}
                                                            className="bg-green-600 text-white px-4 py-1 font-black hover:bg-green-500 transition-colors"
                                                        >
                                                            CHALLENGE
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="border border-red-500/30 bg-red-500/5 p-4 group hover:border-red-500/60 transition-all">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="px-2 py-1 bg-red-500 text-black text-[8px] font-black uppercase tracking-tighter">EL_ESPARTANO</div>
                                                    <Shield className="w-4 h-4 text-red-500 animate-pulse" />
                                                </div>
                                                <h4 className="text-xl font-black italic text-[var(--text-color)] mb-1">LEONIDAS-vX.99</h4>
                                                <p className="text-[10px] text-[var(--dim-color)] leading-tight mb-4 uppercase">MASTER_OF_THE_ARENA. 100% REPUTATION DRAIN ON FAILURE.</p>
                                                <div className="flex justify-between items-center text-[10px] font-mono border-t border-red-500/20 pt-4">
                                                    <span className="text-red-400">PRIZE: 1500 Psh</span>
                                                    <button
                                                        onClick={() => startBattle({ isBoss: true, name: "Leonidas-vX.99" })}
                                                        className="bg-red-500 text-black px-4 py-1 font-black hover:bg-red-400 transition-colors"
                                                    >
                                                        CHALLENGE_BOSS
                                                    </button>
                                                </div>
                                            </div>

                                            {globalChallenges?.challenges?.filter((c: any) => c.nodeId !== profile?.nodeId).map((c: any) => (
                                                <div key={c.id} className="border border-[var(--border-color)] bg-[var(--panel-bg)] p-4 hover:border-[var(--dim-color)] transition-all">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="text-[8px] font-mono text-[var(--dim-color)]">{c.nodeId.slice(0, 12)}...</span>
                                                        <div className="text-[10px] font-black italic text-blue-400">BET: {c.bet} Psh</div>
                                                    </div>
                                                    <div className="flex gap-4 items-center mb-4">
                                                        <img src={c.codemon.pixel_art_base64} className="w-12 h-12 image-pixelated bg-black p-1 border border-[var(--border-color)]" alt="Enemy" />
                                                        <div>
                                                            <h4 className="text-sm font-black uppercase text-[var(--text-color)]">{c.codemon.brain_json.name}</h4>
                                                            <p className="text-[8px] font-mono text-[var(--dim-color)]">LVL_{c.codemon.brain_json.evolution_tracker?.level || 1}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => startBattle(c)}
                                                        className="w-full border border-blue-500/50 text-blue-400 py-2 text-[10px] font-black hover:bg-blue-500 hover:text-white transition-all"
                                                    >
                                                        ACCEPT_CHALLENGE
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : view === 'battle' ? (
                        <motion.div
                            key="battle"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="min-h-screen flex flex-col items-center justify-center relative py-10"
                        >
                            <div className="flex justify-between items-center bg-[var(--panel-bg)] border-b border-[var(--border-color)] px-4 py-3 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="px-3 py-1 bg-[var(--bg-color)] border-l-4 border-[var(--accent-color)] text-[10px] font-black uppercase tracking-widest italic text-[var(--text-color)]">Live_Battle_Stream</div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">SYDNEY_SIM_LINK_ACTIVE</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setView('lobby')}
                                    className="bg-[var(--panel-bg)] hover:bg-[var(--text-color)] hover:text-[var(--bg-color)] px-4 py-2 text-[10px] font-black border border-[var(--border-color)] transition-colors pointer-events-auto"
                                >
                                    TERMINATE_FEED
                                </button>
                            </div>

                            <div className="flex-1 w-full flex flex-row justify-center items-center gap-20 relative bg-[var(--bg-color)] py-20 px-10 overflow-hidden">
                                {/* VS Background Text */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none overflow-hidden">
                                    <span className="text-[30rem] font-black italic tracking-tighter">VS</span>
                                </div>

                                {/* Player: Left */}
                                <motion.div
                                    initial={{ x: -100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="flex flex-col items-center gap-8 relative z-10 flex-1 max-w-sm"
                                >
                                    <div className="w-64 space-y-3">
                                        <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.2em]">
                                            <span className="text-white/40">Local_Operator</span>
                                            <span className="text-blue-400">{activeCodemon?.brain_json.name}</span>
                                        </div>
                                        <div className="h-3 bg-white/5 w-full relative overflow-hidden border border-white/10 ring-1 ring-blue-500/20">
                                            <motion.div
                                                animate={{ width: `${(currentHP.player / (initialHP.player || 1)) * 100}%` }}
                                                className="absolute inset-0 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                                            />
                                        </div>
                                        <div className="text-right font-mono text-[9px] text-white/30 truncate">
                                            HP: {Math.floor(currentHP.player)} / {Math.floor(initialHP.player || 1)}
                                        </div>
                                    </div>

                                    <motion.div
                                        animate={!isOpponentTurn ? { x: [0, 20, 0], scale: [1, 1.1, 1], filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"] } : {}}
                                        className="w-56 h-56 bg-gradient-to-tr from-blue-500/20 to-transparent border-2 border-blue-500/30 p-10 relative group"
                                    >
                                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                        <img src={activeCodemon?.pixel_art_base64} className="w-full h-full image-pixelated relative z-10" alt="Player" />
                                    </motion.div>
                                </motion.div>

                                {/* VS Divider Section */}
                                <div className="flex flex-col items-center justify-center relative z-20">
                                    <div className="w-px h-32 bg-gradient-to-b from-transparent via-white/20 to-transparent mb-4" />
                                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                        <span className="text-xs font-black italic tracking-tighter text-white/60">VS</span>
                                    </div>
                                    <div className="w-px h-32 bg-gradient-to-b from-transparent via-white/20 to-transparent mt-4" />
                                </div>

                                {/* Opponent: Right */}
                                <motion.div
                                    initial={{ x: 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="flex flex-col items-center gap-8 relative z-10 flex-1 max-w-sm"
                                >
                                    <div className="w-64 space-y-3">
                                        <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.2em]">
                                            <span className="text-red-500">{selectedChallenge?.isBoss ? 'Leonidas-vX.99' : selectedChallenge?.codemon?.brain_json.name}</span>
                                            <span className="text-white/40">Target_Entity</span>
                                        </div>
                                        <div className="h-3 bg-white/5 w-full relative overflow-hidden border border-white/10 ring-1 ring-red-500/20">
                                            <motion.div
                                                animate={{ width: `${(Math.max(0, currentHP.opponent) / initialHP.opponent) * 100}%` }}
                                                className="h-full bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                                            />
                                        </div>
                                        <div className="text-left font-mono text-[9px] text-white/30 truncate">
                                            ENERGY: {Math.max(0, currentHP.opponent)} / {initialHP.opponent}
                                        </div>
                                    </div>

                                    <motion.div
                                        animate={isOpponentTurn ? { x: [0, -20, 0], scale: [1, 1.1, 1], filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"] } : {}}
                                        className="w-56 h-56 bg-gradient-to-tl from-red-500/20 to-transparent border-2 border-red-500/30 p-10 relative group"
                                    >
                                        <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-orange-500/20 blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                        <div className="relative z-10 w-full h-full">
                                            {selectedChallenge?.isBoss ? (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Shield className="w-32 h-32 text-red-600 animate-pulse drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                                                </div>
                                            ) : (
                                                <img
                                                    src={selectedChallenge?.codemon?.pixel_art_base64}
                                                    className="w-full h-full image-pixelated"
                                                    alt="Enemy"
                                                />
                                            )}
                                        </div>
                                    </motion.div>
                                </motion.div>
                            </div>

                            <div className="w-full max-w-2xl mt-20 relative">
                                <div className="hacker-panel bg-black border-white/10 p-8 min-h-[140px] flex items-center justify-center text-center">
                                    <AnimatePresence mode="wait">
                                        {showMatrix ? (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="matrix">
                                                <MatrixSyncer onComplete={handleMatrixComplete} />
                                            </motion.div>
                                        ) : (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="text">
                                                <p className="text-xl font-black italic text-white tracking-widest">{typingText}</p>
                                                {skillLevel > 1 && <span className="text-green-500 text-[10px] font-bold mt-2 inline-block">PERFORMANCE_BOOST_X{skillLevel}</span>}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {logIndex === battleLogs.length - 1 && logIndex > 0 && (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center gap-6">
                                        <h2 className={`text-7xl font-black italic tracking-tighter ${currentHP.player > currentHP.opponent ? 'text-green-500' : 'text-red-600'}`}>
                                            {currentHP.player > currentHP.opponent ? 'CHALLENGE_WON' : 'OPERATOR_FAILED'}
                                        </h2>
                                        <button
                                            onClick={() => {
                                                if (currentHP.player === 0) {
                                                    handleRepair().then(success => { if (success) setView('lobby'); });
                                                } else {
                                                    setView('lobby');
                                                }
                                            }}
                                            className="bg-[var(--text-color)] text-[var(--bg-color)] px-10 py-4 text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
                                        >
                                            {currentHP.player === 0 ? 'RESTORE & RETURN' : 'RETURN_TO_BASE'}
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    ) : view === 'hangar' ? (
                        <motion.div key="hangar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {profile?.codemons?.map((c: any) => {
                                    const cid = c.brain_json.codemon_id || c.brain_json.id;
                                    const isActive = cid === (profile.active_codemon_id || profile.codemons[0]?.brain_json.codemon_id);
                                    return (
                                        <div key={cid} className={`border ${isActive ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'border-[var(--border-color)] bg-[var(--panel-bg)]'} p-6 relative group transition-all`}>
                                            {isActive && (
                                                <div className="absolute -top-3 left-4 bg-blue-500 text-white text-[8px] font-black px-2 py-1 flex items-center gap-1">
                                                    <UserCheck className="w-2 h-2" /> ACTIVE_AGENT
                                                </div>
                                            )}
                                            <div className="flex gap-4 mb-4">
                                                <img src={c.pixel_art_base64} className="w-20 h-20 image-pixelated bg-black p-2 border border-[var(--border-color)]" alt="Agent" />
                                                <div className="flex-1">
                                                    <h4 className="text-lg font-black uppercase text-[var(--text-color)] leading-tight">{c.brain_json.name}</h4>
                                                    <p className="text-[10px] font-mono text-[var(--dim-color)] mb-2">LVL_{c.brain_json.evolution_tracker?.level || 1} • {c.brain_json.core_genetics.base_type}</p>
                                                    <div className="grid grid-cols-2 gap-x-4 text-[8px] font-mono uppercase">
                                                        <span className="text-[var(--dim-color)]">Atk: <span className="text-[var(--text-color)]">{c.brain_json.combat_stats.attack}</span></span>
                                                        <span className="text-[var(--dim-color)]">Def: <span className="text-[var(--text-color)]">{c.brain_json.combat_stats.defense}</span></span>
                                                        <span className="text-[var(--dim-color)]">Spd: <span className="text-[var(--text-color)]">{c.brain_json.combat_stats.speed}</span></span>
                                                        <span className="text-[var(--dim-color)]">Eng: <span className="text-[var(--text-color)]">{c.brain_json.combat_stats.energy_capacity}</span></span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="h-1 bg-[var(--border-color)] w-full">
                                                    <div className="h-full bg-green-500/50" style={{ width: `${(c.brain_json.durability / c.brain_json.max_durability) * 100}%` }} />
                                                </div>
                                                {!isActive && (
                                                    <button
                                                        onClick={() => handleSetActive(cid)}
                                                        className="w-full py-2 bg-[var(--border-color)] hover:bg-[var(--text-color)] text-[var(--text-color)] hover:text-[var(--bg-color)] text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        ACTIVATE_LINK
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="market" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <div className="flex flex-col items-center py-12 text-center max-w-2xl mx-auto space-y-6">
                                <ShoppingCart className="w-16 h-16 text-blue-500 animate-pulse" />
                                <div>
                                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[var(--text-color)]">Keymaster_Supply_Vault</h2>
                                    <p className="text-[var(--dim-color)] text-[10px] tracking-[0.4em] uppercase font-bold mt-2">Certified_Biological_Weaponry</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-10">
                                    <div className="border border-[var(--border-color)] bg-[var(--panel-bg)] p-8 flex flex-col items-center gap-4 hover:border-blue-500/50 transition-all shadow-xl">
                                        <div className="bg-blue-500/10 p-6 rounded-full border border-blue-500/20">
                                            <Zap className="w-12 h-12 text-blue-400" />
                                        </div>
                                        <h4 className="text-xl font-black italic uppercase text-[var(--text-color)]">STANDARD_BOOSTER</h4>
                                        <p className="text-[10px] text-[var(--dim-color)] uppercase leading-relaxed font-bold">Guaranteed Tier-1 Combatant. Random genes from the Keymaster pool.</p>
                                        <div className="text-2xl font-black text-[var(--text-color)] mt-4">250 Psh</div>
                                        <button
                                            onClick={() => handleBuyCodemon("BOOSTER")}
                                            className="w-full py-4 bg-[var(--text-color)] text-[var(--bg-color)] font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-transform"
                                        >
                                            INITIATE_PURCHASE
                                        </button>
                                    </div>

                                    <div className="border border-yellow-500/30 bg-yellow-500/5 p-8 flex flex-col items-center gap-4 hover:border-yellow-500/60 transition-all relative overflow-hidden shadow-xl">
                                        <div className="absolute top-4 right-4 text-yellow-500"><Star className="w-5 h-5 fill-current" /></div>
                                        <div className="bg-yellow-500/10 p-6 rounded-full border border-yellow-500/20">
                                            <Cpu className="w-12 h-12 text-yellow-500" />
                                        </div>
                                        <h4 className="text-xl font-black italic uppercase text-[var(--text-color)]">ELITE_SYNERGY_PACK</h4>
                                        <p className="text-[10px] text-[var(--dim-color)] uppercase leading-relaxed font-bold">+20 Stats Bonus. Max Durability boost. Highly Optimized Neural Logic.</p>
                                        <div className="text-2xl font-black text-yellow-500 mt-4">1000 Psh</div>
                                        <button
                                            onClick={() => handleBuyCodemon("ELITE")}
                                            className="w-full py-4 bg-yellow-500 text-black font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-transform"
                                        >
                                            ACQUIRE_ELITE_ASSET
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showPostModal && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-[var(--panel-bg)] border border-[var(--border-color)] p-8 w-full max-w-md shadow-2xl"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-2xl font-black italic text-[var(--text-color)] tracking-tighter uppercase">Publish_Challenge</h3>
                                        <p className="text-[8px] font-mono text-[var(--dim-color)]">GLOBAL_BROADCAST_INITIALIZED</p>
                                    </div>
                                    <button onClick={() => setShowPostModal(false)} className="text-[var(--dim-color)] hover:text-[var(--text-color)]">✕</button>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--dim-color)] uppercase mb-2 block tracking-widest">Bet_Amount (Pooptoshis)</label>
                                        <input
                                            type="number" value={betAmount}
                                            onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                                            className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] p-4 text-xl font-black text-[var(--text-color)] focus:border-blue-500 outline-none"
                                        />
                                        <p className="text-[8px] text-[var(--dim-color)] mt-2 italic">Current Balance: {profile?.balance_psh.toFixed(2)} Psh</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowPostModal(false)} className="flex-1 bg-[var(--border-color)] text-[var(--dim-color)] py-3 text-[10px] uppercase font-black tracking-widest">CANCEL</button>
                                        <button
                                            onClick={handlePostChallenge}
                                            disabled={betAmount > (profile?.balance_psh || 0)}
                                            className="flex-1 bg-blue-600 disabled:bg-[var(--border-color)] disabled:opacity-30 text-white py-3 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500"
                                        >BROADCAST_TO_ARENA</button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}

function KPIBox({ label, value }: any) {
    return (
        <div className="hacker-panel py-3 border-[var(--border-color)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent-color)] opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="label-dim leading-none relative z-10">{label}</p>
            <p className="text-xl font-black tracking-tighter mt-1 text-[var(--text-color)] relative z-10">{value}</p>
        </div>
    );
}

function MatrixSyncer({ onComplete }: { onComplete: (score: number) => void }) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@&";
    const [rows, setRows] = useState(Array(4).fill(0).map(() => ({ pos: Math.floor(Math.random() * chars.length), locked: false })));

    useEffect(() => {
        const timer = setInterval(() => {
            setRows(prev => prev.map(r => r.locked ? r : { ...r, pos: (r.pos + 1) % chars.length }));
        }, 100);
        return () => clearInterval(timer);
    }, []);

    const lockNext = () => {
        const nextIdx = rows.findIndex(r => !r.locked);
        if (nextIdx !== -1) {
            const newRows = [...rows];
            newRows[nextIdx].locked = true;
            setRows(newRows);
            if (nextIdx === rows.length - 1) {
                const positions = newRows.map(r => r.pos);
                const unique = new Set(positions).size;
                const score = unique === 1 ? 2.5 : unique <= 2 ? 1.5 : 1.0;
                setTimeout(() => onComplete(score), 500);
            }
        }
    };

    return (
        <div className="flex flex-col gap-4 items-center" onClick={lockNext}>
            <div className="flex gap-2 bg-black border border-blue-500/30 p-4">
                {rows.map((row, i) => (
                    <div key={i} className={`w-12 h-12 border-2 flex items-center justify-center text-2xl font-black ${row.locked ? 'border-green-500 text-green-500 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'border-white/10 text-white/40'}`}>
                        {chars[row.pos]}
                    </div>
                ))}
            </div>
            <p className="text-blue-500 text-[8px] font-bold animate-pulse tracking-[0.4em]">SYNC_READY // TAP_TO_LOCK_SEED</p>
        </div>
    );
}

function StatItem({ label, value }: { label: string, value: number }) {
    return (
        <div className="p-2 border border-[var(--border-color)] bg-[var(--panel-bg)] relative group overflow-hidden">
            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-color)] opacity-40" />
            <p className="text-[7px] font-bold text-[var(--dim-color)] uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className="text-sm font-black italic text-[var(--text-color)]">{value}</p>
        </div>
    );
}
