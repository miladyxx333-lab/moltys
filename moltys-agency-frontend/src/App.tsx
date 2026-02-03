import { useState, useEffect } from 'react';
import { FileText, Zap, Upload, Activity, ShoppingCart, Lock, Palette, CheckCircle2, Play, PlusCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const FRAMES = [
    { id: 'rainbow', name: 'Prism', classes: 'bg-gradient-to-br from-pink-500 via-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 p-[8px] animate-gradient-xy shadow-2xl' },
    { id: 'minimal_light', name: 'Clean', classes: 'bg-white border-4 border-slate-200 shadow-xl' },
    { id: 'minimal_dark', name: 'Stealth', classes: 'bg-slate-900 border-4 border-slate-700 shadow-2xl' },
];

const API_BASE = "https://lobpoop-core.miladyxx333.workers.dev/agency";

// --- PIXEL ART ASSETS (SVGs) ---
const PixelLobster = () => (
    <svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path fill="#ef4444" d="M4 4H6V5H7V6H9V5H10V4H12V6H13V8H12V9H13V11H14V14H12V12H11V14H9V13H7V14H5V12H4V14H2V11H3V9H4V8H3V6H4V4ZM6 7H7V8H6V7ZM9 7H10V8H9V7Z" />
        <path fill="white" d="M5 5H6V6H5V5ZM10 5H11V6H10V5Z" />
        <path fill="black" d="M5 5H6V6H5V5H5.5V5.5ZM10 5H11V6H10V5H10.5V5.5Z" />
        <path fill="black" d="M7 10H9V11H7V10Z" />
    </svg>
);

const PixelCat = ({ color = "currentColor" }) => (
    <svg width="64" height="64" viewBox="0 0 16 16" fill={color} xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M3 4H5V5H4V6H3V9H2V12H4V13H12V12H14V9H13V6H12V5H11V4H9V5H7V4H5V5H3V4ZM5 7H6V8H5V7ZM10 7H11V8H10V7ZM7 9H9V10H7V9Z" />
    </svg>
);

const PixelPenguin = ({ color = "currentColor" }) => (
    <svg width="64" height="64" viewBox="0 0 16 16" fill={color} xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M6 2H10V3H11V5H12V10H13V13H11V14H5V13H3V10H4V5H5V3H6V2ZM7 4H6V5H7V4ZM10 4H9V5H10V4ZM8 6H9V7H7V6H8ZM6 8H10V12H6V8Z" />
    </svg>
);

// --- EMOTE PARTICLES ---
const EmoteHeart = () => (
    <motion.div initial={{ y: 0, opacity: 1 }} animate={{ y: -20, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute -top-4 right-0 text-red-500 pixel-font text-lg">❤️</motion.div>
);
const EmoteSweat = () => (
    <motion.div initial={{ y: 0, opacity: 1 }} animate={{ y: 10, opacity: 0 }} transition={{ duration: 1, repeat: Infinity }} className="absolute -top-2 -right-2 text-blue-400 pixel-font text-lg">💧</motion.div>
);
const EmoteFlower = () => (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 180 }} transition={{ duration: 2, repeat: Infinity }} className="absolute -bottom-2 -left-2 text-pink-400 pixel-font text-lg">🌸</motion.div>
);

// --- SKINS DATABASE ---
const SKINS = [
    { id: 'lob_basic', name: 'Lobby Core', type: 'BASIC', component: PixelLobster, color: '#4ade80', bg: 'bg-[#0f1d15]', accent: 'text-green-400' },
    { id: 'cat_cyber', name: 'Nyan Verify', type: 'PREMIUM', price: 2.99, component: PixelCat, color: '#f472b6', bg: 'bg-indigo-950', accent: 'text-pink-400', shine: true },
    { id: 'peng_cool', name: 'Ice Breaker', type: 'PREMIUM', price: 3.50, component: PixelPenguin, color: '#38bdf8', bg: 'bg-slate-900', accent: 'text-sky-400', shine: true },
];

export default function MoltyDash() {
    const [botId, setBotId] = useState<string | null>(null);
    const [botState, setBotState] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'OFFICE' | 'OPS'>('OFFICE');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSkinStore, setShowSkinStore] = useState(false);
    const [currentEmote, setCurrentEmote] = useState<'NONE' | 'LOVE' | 'SWEAT' | 'WORK'>('NONE');
    const [currentFrame, setCurrentFrame] = useState(FRAMES[1]); // Default Minimal Dark

    // Logs System
    const [logs, setLogs] = useState<string[]>([]);

    // Chat System
    const [messages, setMessages] = useState<{ sender: 'user' | 'molty', content: string, type: 'text' | 'upsell', skill?: any }[]>([
        { sender: 'molty', content: 'Gossip Protocol Synced. Awaiting input.', type: 'text' }
    ]);
    const [inputVal, setInputVal] = useState("");

    // Init: Check URL for ID
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('botId');
        if (id) {
            setBotId(id);
            fetchBotState(id);
        }
    }, []);

    // Polling State
    useEffect(() => {
        if (!botId) return;
        const interval = setInterval(() => {
            fetchBotState(botId);
        }, 3000);
        return () => clearInterval(interval);
    }, [botId]);

    const fetchBotState = async (id: string) => {
        try {
            // State
            const stateRes = await fetch(`${API_BASE}/bot/${id}/state`);
            if (stateRes.ok) {
                const data = await stateRes.json();
                setBotState(data);
                // Sync Local State
                if (data.emotions !== 'NONE') setCurrentEmote(data.emotions as any);
            }

            // Logs
            const logsRes = await fetch(`${API_BASE}/bot/${id}/logs`);
            if (logsRes.ok) {
                const data = await logsRes.json();
                setLogs(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSpawn = async () => {
        setIsProcessing(true);
        try {
            const res = await fetch(`${API_BASE}/spawn`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?botId=' + data.botId;
                window.history.pushState({ path: newUrl }, '', newUrl);
                setBotId(data.botId);
                setBotState(data.state);
            }
        } catch (e) {
            alert("Failed to spawn bot. Backend might be sleeping.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSend = () => {
        if (!inputVal.trim()) return;
        setMessages(prev => [...prev, { sender: 'user', content: inputVal, type: 'text' }]);

        const userQuery = inputVal;
        setInputVal("");
        setIsProcessing(true);
        setCurrentEmote('WORK');

        // Connect to Brain (Backend AI)
        if (botId) {
            fetch(`${API_BASE}/interact`, {
                method: 'POST',
                body: JSON.stringify({ botId, action: 'CHAT', payload: { message: userQuery } })
            }).then(() => {
                setTimeout(() => fetchBotState(botId), 1000);
            }).finally(() => {
                setTimeout(() => setIsProcessing(false), 1500);
            });
        } else {
            setTimeout(() => setIsProcessing(false), 1000);
        }
    };

    const handleBuySkill = (skillName: string) => {
        // Send TRAIN signal to backend
        if (botId) {
            fetch(`${API_BASE}/interact`, {
                method: 'POST',
                body: JSON.stringify({ botId, action: 'TRAIN', payload: { skill: skillName } })
            });
        }

        setShowSkinStore(false);
        setCurrentEmote('LOVE');

        setMessages(prev => [...prev, {
            sender: 'molty',
            content: `Installing ${skillName}... DONE. XP Gained!`,
            type: 'text'
        }]);

        setTimeout(() => setCurrentEmote('NONE'), 3000);
    };

    const handleBuySkinVisual = (skinId: string) => {
        if (botId) {
            fetch(`${API_BASE}/interact`, {
                method: 'POST',
                body: JSON.stringify({ botId, action: 'CHANGE_SKIN', payload: { skinId } })
            });
        }
        // Force local update for immediate feedback
        if (botState) setBotState({ ...botState, skin: skinId });

        setShowSkinStore(false);
        setCurrentEmote('LOVE');
        setTimeout(() => setCurrentEmote('NONE'), 3000);
    };

    const handleTerminate = async () => {
        if (!confirm("⚠️ FIRE THIS EMPLOYEE?\n\nThis action is permanent. All XP and Memory Logs will be wiped from the Neural Net.\n\nAre you sure?")) return;

        if (botId) {
            try {
                // Send Terminate Request
                await fetch(`${API_BASE}/terminate`, {
                    method: 'POST',
                    body: JSON.stringify({ botId })
                });

                // Clear Local State
                setBotId(null);
                setBotState(null);
                const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                window.history.pushState({ path: newUrl }, '', newUrl);

            } catch (e) {
                alert("Termination failed. The contract is ironclad (Backend Error).");
            }
        }
    };

    // --- RENDER LANDING PAGE IF NO BOT ID ---
    if (!botId) {
        return (
            <div className="w-full h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black text-slate-900 mb-2">Moltys Agency</h1>
                    <p className="text-slate-500">Hire your first specialized digital employee.</p>
                </div>

                <button
                    onClick={handleSpawn}
                    disabled={isProcessing}
                    className="group relative bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-105 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="flex items-center gap-3 font-bold text-lg">
                        {isProcessing ? (
                            <Activity className="animate-spin" />
                        ) : (
                            <PlusCircle size={24} />
                        )}
                        <span>{isProcessing ? 'INITIALIZING NEURAL NET...' : 'SPAWN MY AGENT'}</span>
                    </div>
                </button>
            </div>
        );
    }

    // --- MAIN DASHBOARD ---

    // Resolve Skin
    const skinId = botState?.skin || 'lob_basic';
    const skin = SKINS.find(s => s.id === skinId) || SKINS[0];
    const Avatar = skin.component;

    return (
        <div className="w-full h-screen bg-[#F0F2F5] text-slate-800 font-sans overflow-hidden flex flex-col relative">

            {/* MAIN WORKSPACE */}
            <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-40px)]">

                {/* 1. SIDEBAR / MOLTYGOTCHI */}
                <div className="w-72 bg-white border-r border-slate-200 flex flex-col items-center py-6 px-4 z-10 shrink-0 relative shadow-lg">

                    {/* MOLTYGOTCHI CONTAINER */}
                    <div className="w-full aspect-square mb-6 relative group">

                        {/* THE FRAME */}
                        <div className={clsx("w-full h-full rounded-3xl relative transition-all duration-500 overflow-hidden flex items-center justify-center", currentFrame.classes)}>

                            {/* INNER BEZEL / CONTENT AREA */}
                            <div className={clsx("w-full h-full relative overflow-hidden rounded-[20px]",
                                currentFrame.id === 'rainbow' ? 'bg-slate-100' : ''
                            )}
                                style={{ backgroundColor: currentFrame.id.includes('minimal') ? (currentFrame.id === 'minimal_dark' ? '#0f172a' : '#f8fafc') : undefined }}
                            >
                                {/* Screen Background - Increased Inset for thicker bezel */}
                                <div className={clsx("absolute inset-4 rounded-xl overflow-hidden flex flex-col items-center justify-center pixelated-border", skin.bg)}>

                                    {/* Scanlines & Glow for Premium */}
                                    {skin.shine && <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,6px_100%] pointer-events-none opacity-50" />}
                                    {skin.shine && <div className="absolute inset-0 bg-indigo-500/10 animate-pulse z-0" />}

                                    {/* THE AVATAR 8-BIT */}
                                    <div className="relative z-20">
                                        <motion.div
                                            animate={isProcessing ? { y: [0, -4, 0], scale: [1, 1.05, 1] } : { y: [0, -2, 0] }}
                                            transition={isProcessing ? { repeat: Infinity, duration: 0.2 } : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                            className={clsx(skin.shine ? "drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "")}
                                        >
                                            <Avatar color={skin.color} />
                                        </motion.div>

                                        {/* EMOTIONS OVERLAY */}
                                        <AnimatePresence>
                                            {currentEmote === 'LOVE' && <EmoteHeart />}
                                            {currentEmote === 'SWEAT' && <EmoteSweat />}
                                            {currentEmote === 'LOVE' && <EmoteFlower />}
                                        </AnimatePresence>
                                    </div>

                                    {/* Status Text */}
                                    <div className={clsx("mt-4 font-mono text-[10px] tracking-widest z-20 uppercase", skin.accent)}>
                                        {isProcessing ? "THINKING..." : currentEmote === 'SWEAT' ? "NERVOUS" : currentEmote === 'LOVE' ? "HAPPY" : "IDLE"}
                                    </div>

                                    {/* Energy Bar */}
                                    <div className="absolute bottom-2 left-2 right-2 h-1 bg-black/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 transition-all" style={{ width: `${botState?.energy || 50}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Frame Selector Dots & Label */}
                        <div className="absolute -bottom-10 left-0 right-0 flex flex-col items-center gap-2">
                            <div className="flex justify-center gap-2">
                                {FRAMES.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setCurrentFrame(f)}
                                        className={clsx("w-4 h-4 rounded-full transition-all border-2",
                                            currentFrame.id === f.id ? "border-indigo-600 bg-indigo-600 scale-110" : "border-slate-300 bg-white hover:bg-slate-100"
                                        )}
                                        title={f.name}
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentFrame.name}</span>
                        </div>

                        {/* Edit Skin Button */}
                        <button
                            onClick={() => setShowSkinStore(true)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-md border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:scale-110 transition-all z-30"
                        >
                            <Palette size={14} />
                        </button>
                    </div>

                    <nav className="space-y-2 w-full flex-1 mt-8">
                        <NavBtn active={activeTab === 'OFFICE'} onClick={() => setActiveTab('OFFICE')} icon={FileText} label="Office" />
                        <NavBtn active={activeTab === 'OPS'} onClick={() => setActiveTab('OPS')} icon={Zap} label="Field Ops" />
                    </nav>

                    <div className="mt-auto hidden md:block w-full flex flex-col gap-4">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{botState?.name || 'Unit-?'} (Lvl {botState?.level || 1})</span>
                        </div>

                        {/* TERMINATE BUTTON */}
                        <button
                            onClick={handleTerminate}
                            className="w-full py-2 flex items-center justify-center gap-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-all"
                            title="Fire/Delete Agent"
                        >
                            <Trash2 size={14} />
                            <span>TERMINATE</span>
                        </button>
                    </div>
                </div>

                {/* 2. CHAT AREA */}
                <div className="flex-1 flex flex-col bg-[#FAFAFA] relative min-w-0">
                    {/* Skin Store Modal Overlay */}
                    <AnimatePresence>
                        {showSkinStore && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md p-8 flex items-center justify-center"
                            >
                                <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[600px]">
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                        <h2 className="text-xl font-black text-slate-800">Molty Custom Shop</h2>
                                        <button onClick={() => setShowSkinStore(false)} className="text-slate-400 hover:text-slate-900 font-bold">CLOSE</button>
                                    </div>
                                    <div className="p-8 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-6 bg-[#F8FAFC]">
                                        {SKINS.map(s => (
                                            <div key={s.id} onClick={() => handleBuySkinVisual(s.id)}
                                                className={clsx("relative rounded-2xl p-4 border-2 flex flex-col items-center gap-4 cursor-pointer transition-all hover:scale-105",
                                                    skinId === s.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300"
                                                )}
                                            >
                                                <div className={clsx("w-20 h-20 rounded-lg flex items-center justify-center mb-2", s.bg)}>
                                                    <s.component color={s.color} />
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-bold text-slate-800">{s.name}</div>
                                                    <div className="text-xs text-slate-400 mt-1">{s.type}</div>
                                                </div>

                                                {s.price && skinId !== s.id ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleBuySkinVisual(s.id); }}
                                                        className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 transition-colors"
                                                    >
                                                        BUY ${s.price}
                                                    </button>
                                                ) : (
                                                    <div className="text-xs font-bold text-green-500 flex items-center gap-1">
                                                        <CheckCircle2 size={12} /> OWNED
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Header */}
                    <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
                        <h2 className="font-bold text-slate-700 truncate">Mission Control // {activeTab}</h2>
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                            <Activity size={12} />
                            <span>Online</span>
                        </div>
                    </div>

                    {/* Chat Stream */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth pb-32">
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.type === 'upsell' && msg.skill ? (
                                    <div className="flex flex-col gap-2 max-w-sm">
                                        <div className="bg-white border border-slate-200 text-slate-600 p-4 rounded-2xl rounded-tl-sm shadow-sm text-sm">
                                            {msg.content}
                                        </div>
                                        {/* UPSELL CARD */}
                                        <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-xl shadow-indigo-500/20 flex flex-col gap-4 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <Lock size={80} />
                                            </div>
                                            <div className="flex items-center gap-3 relative z-10">
                                                <div className="w-10 h-10 bg-indigo-500/30 rounded-lg flex items-center justify-center border border-indigo-400/30">
                                                    <msg.skill.icon size={20} className="text-indigo-300" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg leading-tight">{msg.skill.name}</div>
                                                    <div className="text-indigo-300 text-xs font-medium">Official Expansion Pack</div>
                                                </div>
                                            </div>
                                            <p className="text-sm text-indigo-200 relative z-10">{msg.skill.desc}</p>
                                            <button
                                                onClick={() => handleBuySkill(msg.skill.name)}
                                                className="w-full py-3 bg-white text-indigo-900 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors relative z-10"
                                            >
                                                <span>Buy for ${msg.skill.price}</span>
                                                <ShoppingCart size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`max-w-[85%] md:max-w-xl p-4 md:p-5 text-sm md:text-base font-medium leading-relaxed shadow-sm
                                        ${msg.sender === 'user'
                                            ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                                            : 'bg-white border border-slate-200 text-slate-600 rounded-2xl rounded-tl-sm'
                                        }
                                    `}>
                                        {msg.content}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                        {isProcessing && <div className="text-xs text-slate-400 pl-4 animate-pulse">Molty is thinking...</div>}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 md:p-6 bg-white border-t border-slate-200 sticky bottom-0 z-20">
                        <div className="max-w-4xl mx-auto relative flex items-center gap-3">
                            <div className="flex-1 bg-slate-50 border-2 border-slate-100 hover:border-slate-200 focus-within:border-indigo-500 rounded-2xl flex items-center px-2 transition-all shadow-inner">
                                <input
                                    className="w-full h-12 bg-transparent outline-none text-slate-700 font-medium placeholder:text-slate-400 px-2"
                                    placeholder="Type instructions..."
                                    value={inputVal}
                                    onChange={(e) => setInputVal(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                />
                                <button onClick={handleSend} className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-xl hover:bg-slate-100">
                                    <Upload size={20} />
                                </button>
                            </div>
                            <button
                                onClick={handleSend}
                                className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 shrink-0"
                            >
                                <Play size={20} className="ml-1" fill="currentColor" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. TERMINAL BAR */}
            <div className="w-full bg-[#0A0F16] border-t border-white/10 h-8 flex items-center px-4 text-[10px] font-mono text-[#4af626] z-50">
                <span className="opacity-50 mr-2">LOGS</span>
                <span className="truncate">{logs[logs.length - 1] || 'SYSTEM READY'}</span>
            </div>
        </div>
    );
}

function NavBtn({ icon: Icon, active, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 group
                ${active
                    ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }
            `}
        >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} className={active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
            <span className="text-sm hidden md:block">{label}</span>
        </button>
    );
}
