import { useState, useEffect, useRef } from 'react';
import {
    Palette, Eye, Play,
    History, Search, BrainCog,
    BookOpen, Calculator, GraduationCap, Code2, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import QRCode from 'react-qr-code';

const API_BASE = "https://lobpoop-core.miladyxx333.workers.dev/agency";

// --- PIXEL AVATARS ---
const Gato = ({ color }: { color: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        <rect x="20" y="30" width="60" height="50" rx="12" fill={color} />
        <path d="M 20 35 L 10 5 L 45 30" fill={color} />
        <path d="M 80 35 L 90 5 L 55 30" fill={color} />
        <circle cx="35" cy="50" r="5" fill="black" />
        <circle cx="65" cy="50" r="5" fill="black" />
        <path d="M 15 55 L 30 58 M 15 62 L 30 62 M 70 58 L 85 55 M 70 62 L 85 62" stroke="black" strokeWidth="1.5" />
    </svg>
);

const Pollo = ({ color }: { color: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        <circle cx="50" cy="55" r="42" fill={color} />
        <path d="M 42 15 Q 50 2 58 15" stroke="#ef4444" strokeWidth="10" fill="transparent" />
        <circle cx="35" cy="45" r="5" fill="black" />
        <circle cx="65" cy="45" r="5" fill="black" />
        <path d="M 45 55 L 55 55 L 50 70 Z" fill="#f59e0b" />
    </svg>
);

const Cangrejo = ({ color }: { color: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        <rect x="25" y="45" width="50" height="35" rx="15" fill={color} />
        {/* Claws */}
        <path d="M 20 40 Q 10 30 25 35" stroke={color} strokeWidth="8" fill="transparent" />
        <path d="M 80 40 Q 90 30 75 35" stroke={color} strokeWidth="8" fill="transparent" />
        {/* Eyes */}
        <circle cx="40" cy="40" r="4" fill="black" />
        <circle cx="60" cy="40" r="4" fill="black" />
        <rect x="38" y="30" width="2" height="10" fill="black" opacity="0.2" />
        <rect x="58" y="30" width="2" height="10" fill="black" opacity="0.2" />
        {/* Legs */}
        <path d="M 25 60 L 10 70 M 25 70 L 10 80" stroke={color} strokeWidth="4" />
        <path d="M 75 60 L 90 70 M 75 70 L 90 80" stroke={color} strokeWidth="4" />
    </svg>
);

const Rosa = ({ color }: { color: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        <motion.path
            animate={{
                d: [
                    "M 50 20 Q 80 20 80 50 Q 80 80 50 80 Q 20 80 20 50 Q 20 20 50 20",
                    "M 50 15 Q 85 25 80 55 Q 75 85 50 85 Q 25 85 20 55 Q 15 25 50 15"
                ]
            }}
            transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
            fill={color}
        />
        <circle cx="40" cy="45" r="4" fill="white" />
        <circle cx="60" cy="45" r="4" fill="white" />
        <path d="M 45 60 Q 50 65 55 60" stroke="white" strokeWidth="2" fill="transparent" />
    </svg>
);

const Hielo = ({ color }: { color: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        <rect x="20" y="25" width="60" height="60" rx="8" fill={color} />
        <path d="M 20 25 L 80 25 L 70 35 L 30 35 Z" fill="white" opacity="0.5" />
        <rect x="25" y="45" width="50" height="30" fill="white" opacity="0.1" />
        <circle cx="40" cy="55" r="4" fill="#1e293b" />
        <circle cx="60" cy="55" r="4" fill="#1e293b" />
        <path d="M 45 70 L 55 70" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        <path d="M 70 40 L 75 45" stroke="white" strokeWidth="2" opacity="0.8" />
    </svg>
);

const SkullEngine = ({ color: _color }: { color: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        <rect x="25" y="30" width="50" height="40" rx="10" fill="#334155" />
        <circle cx="35" cy="45" r="8" fill="#f97316" className="animate-pulse" />
        <circle cx="65" cy="45" r="8" fill="#f97316" className="animate-pulse" />
        <rect x="35" y="60" width="30" height="15" rx="4" fill="#1e293b" />
        <rect x="40" y="62" width="2" height="10" fill="#f97316" opacity="0.5" />
        <rect x="50" y="62" width="2" height="10" fill="#f97316" opacity="0.5" />
        <rect x="58" y="62" width="2" height="10" fill="#f97316" opacity="0.5" />
        {/* Wires */}
        <path d="M 25 40 Q 10 40 10 20" stroke="#f97316" strokeWidth="2" fill="transparent" />
        <path d="M 75 40 Q 90 40 90 20" stroke="#f97316" strokeWidth="2" fill="transparent" />
    </svg>
);

const SKINS = [
    { id: 'lob_gato', name: 'Gato Pixel', color: '#f97316', component: Gato },
    { id: 'lob_pollo', name: 'Pollo Beta', color: '#fbbf24', component: Pollo },
    { id: 'lob_cangrejo', name: 'Cangrejo Rojo', color: '#ef4444', component: Cangrejo },
    { id: 'lob_rosa', name: 'Cosa Rosa', color: '#f472b6', component: Rosa },
    { id: 'lob_hielo', name: 'Bloque Hielo', color: '#7dd3fc', component: Hielo },
    { id: 'openclaw_engine', name: 'Sovereign Skull', color: '#f97316', component: SkullEngine }
];

const SKILLS = [
    { id: 'Tutor Experto', name: 'Tutor IA', icon: GraduationCap, color: 'text-orange-500' },
    { id: 'p5.js Creative Coder', name: 'p5.js Code', icon: Code2, color: 'text-pink-500' },
    { id: 'Context Bridge 2024-2026', name: 'Bridge 2026', icon: BrainCog, color: 'text-cyan-500' },
    { id: 'Chronicle 2024-2026', name: 'Crónica 2026', icon: History, color: 'text-amber-600' },
    { id: 'Spanish Master', name: 'Español', icon: BookOpen, color: 'text-red-500' },
    { id: 'Math Genius', name: 'Matemáticas', icon: Calculator, color: 'text-blue-500' },
    { id: 'Web Explorer', name: 'Explorador', icon: Globe, color: 'text-indigo-500' }
];

export default function MoltyDash() {
    const [botId, setBotId] = useState<string | null>(null);
    const [botState, setBotState] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSkins, setShowSkins] = useState(false);
    const [messages, setMessages] = useState<{ sender: 'user' | 'molty', content: string }[]>([]);
    const [inputVal, setInputVal] = useState("");
    const [showMonitor, setShowMonitor] = useState(false);
    const [isForging, setIsForging] = useState(false);
    const [forgeLogs, setForgeLogs] = useState<string[]>([]);
    const [qrCode, setQrCode] = useState<string | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('botId');
        if (id) { setBotId(id); fetchBotState(id); }
        else { setMessages([{ sender: 'molty', content: 'Neural Link Idle. Hatch your education Unit. 🐾' }]); }
    }, []);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const fetchBotState = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/bot/${id}/state`);
            if (res.ok) setBotState(await res.json());
        } catch (e) { }
    };

    const handleForge = async () => {
        setIsForging(true);
        setForgeLogs([
            "⚡ INITIALIZING CLOUD PROTOCOL...",
            "📡 CONTACTING LOBPOOP SWARM...",
            "🔐 BYPASSING WHATSAPP AUTH LAYER (Web-Only Mode)..."
        ]);

        // Small delay for dramatic effect
        setTimeout(async () => {
            setForgeLogs(prev => [...prev, "🚀 LAUNCHING SOVEREIGN ENGINE..."]);
            // Call the spawn logic directly
            await handleSpawn("ENGINE");

            setForgeLogs(prev => [...prev, "✅ ENGINE ONLINE.", "🖥️ REDIRECTING TO TERMINAL..."]);
            setTimeout(() => {
                setIsForging(false); // Close the 'Forge' modal to show the dashboard
            }, 1000);
        }, 1500);
    };

    const handleSpawn = async (type: "TUTOR" | "ENGINE" = "TUTOR") => {
        setIsProcessing(true);
        try {
            const res = await fetch(`${API_BASE}/spawn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            const data = await res.json();
            if (data.success) {
                setBotId(data.botId);
                setBotState(data.state);
                window.history.pushState({}, '', `?botId=${data.botId}`);
                if (type === "ENGINE") {
                    setMessages([{ sender: 'molty', content: 'SOVEREIGN ENGINE ONLINE. OpenClaw Internal Protocol Activated. Standing by for automation requests. 🦾' }]);
                } else {
                    setMessages([{ sender: 'molty', content: 'He nacido. Soy tu Tutor Animal. Puedo enseñarte Matemáticas o Arte con p5.js. ¿Qué quieres aprender? 🐾' }]);
                }
            }
        } finally { setIsProcessing(false); }
    };

    const handleSend = async () => {
        if (!inputVal.trim() || !botId) return;
        const msg = inputVal;
        setInputVal("");
        setMessages(prev => [...prev, { sender: 'user', content: msg }]);
        setIsProcessing(true);

        try {
            const res = await fetch(`${API_BASE}/interact`, {
                method: 'POST', body: JSON.stringify({ botId, action: 'CHAT', payload: { message: msg } })
            });
            const data = await res.json();
            if (data.aiResponse) setMessages(prev => [...prev, { sender: 'molty', content: data.aiResponse }]);
            fetchBotState(botId);
        } catch (e) {
            setMessages(prev => [...prev, { sender: 'molty', content: "Ouch! Neural lag. Try again. 🐾" }]);
        } finally { setIsProcessing(false); }
    };

    const handleUpdateSkin = async (skinId: string) => {
        if (!botId) return;
        try {
            const res = await fetch(`${API_BASE}/interact`, {
                method: 'POST',
                body: JSON.stringify({ botId, action: 'CHANGE_SKIN', payload: { skinId } })
            });
            const data = await res.json();
            if (data.success) {
                setBotState(data.state);
                setShowSkins(false);
            }
        } catch (e) { }
    };

    const toggleMonitor = () => {
        setShowMonitor(!showMonitor);
    };

    // --- P5JS CODE EXTRACTOR ---
    const getLatestP5Code = () => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (m.sender === 'molty') {
                const match = m.content.match(/```(?:javascript|p5js|js)?\s*([\s\S]*?)```/);
                if (match) return match[1].trim();
            }
        }
        return null;
    };

    const p5Code = getLatestP5Code();

    const generateP5Html = (code: string) => {
        return `
            <html>
                <head>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
                    <style>
                        body { margin: 0; padding: 0; overflow: hidden; background: #0f172a; display: flex; align-items: center; justify-content: center; height: 100vh; }
                        canvas { display: block; max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 0 50px rgba(0,0,0,0.5); border-radius: 12px; }
                    </style>
                </head>
                <body>
                    <script>
                        ${code}
                        function windowResized() {
                            resizeCanvas(windowWidth, windowHeight);
                        }
                    </script>
                </body>
            </html>
        `;
    };

    const currentSkin = SKINS.find(s => s.id === (botState?.skin || 'lob_gato')) || SKINS[0];

    if (isForging) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-full bg-slate-950 text-green-400 font-mono p-8">
                <div className="w-full max-w-3xl bg-slate-900 p-8 rounded-lg shadow-lg border border-green-700/50 flex flex-col items-center">
                    <h2 className="text-xl font-bold mb-4 text-green-300">OpenClaw Forge Terminal</h2>

                    {qrCode ? (
                        <div className="bg-white p-4 rounded-xl mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)] animate-in fade-in zoom-in duration-500">
                            <QRCode value={qrCode} size={256} />
                        </div>
                    ) : (
                        <div className="h-64 w-full overflow-y-auto custom-scrollbar-terminal text-sm mb-4">
                            {forgeLogs.map((log, index) => (
                                <p key={index} className="mb-1 animate-pulse-fade-in">
                                    {log}
                                </p>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 flex items-center gap-2 text-green-500">
                        <span className="animate-pulse">_</span>
                        <span>{qrCode ? "Waiting for Scan..." : "Processing..."}</span>
                    </div>

                    {qrCode && <p className="text-xs text-green-600 mt-4 uppercase tracking-widest">Open WhatsApp &gt; Linked Devices &gt; Link a Device</p>}

                </div>
            </div>
        );
    }

    if (!botId) {
        return (
            <div className="flex flex-col items-center gap-12 p-10 max-w-5xl text-center">
                <header className="space-y-4">
                    <h1 className="text-7xl font-black text-slate-800 tracking-tighter uppercase italic underline decoration-orange-500">AGENCY BOTS</h1>
                    <p className="font-bold text-slate-400 tracking-widest text-sm uppercase">Sovereign AI Deployment Network // 2026</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                    {/* TIER 1: MICRO-TUTOR */}
                    <motion.div
                        whileHover={{ y: -10 }}
                        className="bg-white p-8 rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border-4 border-slate-50 flex flex-col items-center gap-6"
                    >
                        <div className="flex gap-2 opacity-50">
                            <div className="w-10"><Cangrejo color="#ef4444" /></div>
                            <div className="w-10"><Rosa color="#f472b6" /></div>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-800 uppercase italic">Micro-Tutor</h2>
                            <p className="text-slate-400 text-sm font-bold">p5.js & Educational Pod. Instant Hatching.</p>
                        </div>
                        <button onClick={() => handleSpawn("TUTOR")} className="w-full bg-orange-600 text-white px-8 py-6 rounded-[2rem] font-black text-xl shadow-[0_10px_0_#9a3412] active:translate-y-2 active:shadow-none transition-all">
                            HATCH TUTOR
                        </button>
                    </motion.div>

                    {/* TIER 2: SOVEREIGN ENGINE */}
                    <motion.div
                        whileHover={{ y: -10 }}
                        className="bg-slate-900 p-8 rounded-[3rem] shadow-[0_30px_70px_-15px_rgba(249,115,22,0.3)] border-4 border-orange-500/30 flex flex-col items-center gap-6 relative overflow-hidden group"
                    >
                        <div className="absolute top-4 right-8 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-black tracking-widest">PREMIUM</div>

                        <div className="w-32 aspect-square rounded-2xl bg-slate-800 flex items-center justify-center border-2 border-orange-500/50 overflow-hidden shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                            <BrainCog size={64} className="text-orange-500 animate-pulse" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-orange-500 uppercase italic">OpenClaw Engine</h2>
                            <p className="text-slate-500 text-sm font-bold">One-Click Full Deployment. Autonomous Swarm Unit.</p>
                        </div>

                        <div className="flex flex-col items-center gap-4 w-full">
                            <div className="text-2xl font-black text-white">$10 <span className="text-slate-500 text-sm italic underline">/ deployment</span></div>
                            <button onClick={handleForge} className="w-full bg-white text-slate-900 px-8 py-6 rounded-[2rem] font-black text-xl shadow-[0_10px_0_#cbd5e1] active:translate-y-2 active:shadow-none transition-all">
                                FORGE ENGINE
                            </button>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50" />
                    </motion.div>
                </div>

                <div className="flex gap-4 opacity-30 grayscale text-[10px] font-black tracking-tighter uppercase mt-4">
                    <span>Active Nodes: 1,284</span>
                    <span>•</span>
                    <span>Swarm Latency: 12ms</span>
                    <span>•</span>
                    <span>Protocol: OpenClaw v4.2</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1200px] h-[90vh] flex gap-8 items-stretch p-6 font-['Outfit',sans-serif]">

            {/* LEFT: PET STATUS */}
            <div className="w-[380px] flex flex-col gap-6">
                <div className="flex-1 bg-white ring-8 ring-white rounded-[5rem] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.15)] p-12 flex flex-col items-center justify-between relative tamagotchi-float">
                    <div className="absolute top-10 left-12 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[11px] font-black tracking-widest text-slate-300 uppercase">{botState?.name}</span>
                    </div>

                    <div className="w-full aspect-square flex items-center justify-center p-6 bg-slate-50/50 rounded-[4rem] border-4 border-dotted border-slate-100">
                        <motion.div animate={isProcessing ? { y: [0, -15, 0], scale: [1, 1.1, 1] } : {}} transition={{ repeat: Infinity, duration: 0.5 }}>
                            <currentSkin.component color={currentSkin.color} />
                        </motion.div>
                    </div>

                    <div className="w-full space-y-6">
                        <div className="grid grid-cols-3 gap-3">
                            {SKILLS.map(s => (
                                <div key={s.id} className="bg-slate-50 p-4 rounded-3xl flex flex-col items-center justify-center border border-slate-100/50">
                                    <s.icon size={18} className={s.color} />
                                    <span className="text-[8px] font-black uppercase mt-1.5 text-slate-400">{s.name}</span>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">
                                <span>Academic Energy</span>
                                <span>{botState?.energy}%</span>
                            </div>
                            <div className="h-4 bg-slate-100 rounded-full p-1 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full" style={{ width: `${botState?.energy}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => setShowSkins(true)} className="flex-1 bg-orange-600 h-20 rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_12px_0_#9a3412] active:translate-y-2 active:shadow-none transition-all border-4 border-white">
                        <Palette size={32} />
                    </button>
                    <button onClick={() => setMessages([])} className="flex-1 bg-white h-20 rounded-[2.5rem] flex items-center justify-center text-slate-300 shadow-2xl transition-all border-4 border-white hover:text-red-400">
                        <History size={32} />
                    </button>
                </div>
            </div>

            {/* RIGHT: CHAT CORE */}
            <div className="flex-1 bg-white border-[8px] border-white rounded-[5rem] shadow-[0_40px_100px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden relative">
                <header className="h-24 border-b border-slate-50 flex items-center justify-between px-12">
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                            <BrainCog size={28} className={isProcessing ? "animate-spin" : ""} />
                        </div>
                        <div>
                            <div className="text-[12px] font-black uppercase tracking-widest text-slate-800 leading-none">
                                {botState?.type === 'ENGINE' ? 'Sovereign Protocol' : 'Tutor Protocol'}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                                {botState?.type === 'ENGINE' ? 'OpenClaw Engine // v4.2' : 'Gemini-2.0 // Edu_v2.0'}
                            </div>
                        </div>
                    </div>
                    <button onClick={toggleMonitor} className={clsx("h-12 px-8 rounded-2xl font-black text-[10px] tracking-widest flex items-center gap-3 transition-all",
                        showMonitor ? "bg-slate-900 text-white shadow-xl" : "bg-slate-50 text-slate-600"
                    )}>
                        <div className="relative">
                            <Eye size={18} />
                            {p5Code && !showMonitor && <div className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full animate-ping" />}
                        </div>
                        P5.JS MONITOR
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-12 space-y-8 custom-scrollbar bg-slate-50/20">
                    {messages.map((m, i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={clsx("flex flex-col", m.sender === 'user' ? "items-end" : "items-start")}>
                            <div className={clsx("max-w-[90%] p-8 rounded-[3.5rem] text-sm font-black leading-relaxed shadow-sm",
                                m.sender === 'user' ? "bg-orange-600 text-white rounded-tr-none shadow-orange-100" : "bg-white text-slate-700 border border-slate-100 rounded-tl-none")}>
                                <div className="whitespace-pre-wrap">{m.content}</div>
                            </div>
                            {m.sender === 'molty' && m.content.includes('```') && (
                                <button
                                    onClick={() => setShowMonitor(true)}
                                    className="mt-4 px-6 py-2 bg-pink-100 text-pink-600 rounded-full text-[10px] font-black uppercase hover:bg-pink-200 transition-all flex items-center gap-2"
                                >
                                    <Play size={10} fill="currentColor" /> Ver Ejecución Visual
                                </button>
                            )}
                        </motion.div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                <AnimatePresence>
                    {showMonitor && (
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} className="absolute inset-0 bg-slate-900 z-50 flex flex-col">
                            <div className="p-8 flex items-center justify-between border-b border-white/10">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-white/50 tracking-[0.4em] uppercase">P5.JS LIVE PLAYGROUND</span>
                                    {p5Code ? <span className="text-[8px] text-green-400 font-mono mt-1">CODE_DETECTED // AUTO_RUNNING</span> : <span className="text-[8px] text-red-400 font-mono mt-1">NO_CODE_FOUND // WAITING_FOR_INPUT</span>}
                                </div>
                                <button onClick={() => setShowMonitor(false)} className="bg-white text-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg">Close Monitor</button>
                            </div>
                            <div className="flex-1 relative bg-slate-950 overflow-hidden">
                                {p5Code ? (
                                    <iframe
                                        key={p5Code} // Reset iframe when code changes
                                        title="p5js-preview"
                                        srcDoc={generateP5Html(p5Code)}
                                        className="w-full h-full border-none"
                                        sandbox="allow-scripts"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                                        <Code2 size={64} className="opacity-20" />
                                        <p className="text-xs font-black uppercase tracking-widest opacity-50">Dile a Molty que genere un sketch de p5.js</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="p-12 border-t border-slate-100 bg-white/80 backdrop-blur-xl relative">
                    {isProcessing && (
                        <div className="absolute -top-10 left-14 flex items-center gap-3 text-orange-600 font-black text-[10px] tracking-widest uppercase animate-pulse">
                            <Search size={16} /> <span>Educating...</span>
                        </div>
                    )}
                    <div className="relative group">
                        <input
                            className="w-full h-20 bg-white border-4 border-slate-50 focus:border-orange-100 rounded-[3rem] px-12 pr-24 outline-none text-slate-800 font-black shadow-2xl shadow-slate-200/50 transition-all placeholder:text-slate-300"
                            placeholder="Pídemel un sketch de p5.js o una clase..."
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={isProcessing}
                        />
                        <button onClick={handleSend} className="absolute right-4 top-4 w-12 h-12 bg-orange-600 text-white rounded-3xl flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-50" disabled={isProcessing}>
                            <Play size={24} fill="currentColor" />
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showSkins && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="bg-white p-14 rounded-[5rem] max-w-lg w-full shadow-2xl border-[10px] border-white">
                            <h2 className="text-4xl font-black text-slate-800 mb-12 text-center uppercase tracking-tighter decoration-orange-500 underline decoration-8">Evolution Lab</h2>
                            <div className="grid grid-cols-2 gap-8">
                                {SKINS.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => handleUpdateSkin(s.id)}
                                        className={clsx("p-8 rounded-[4rem] flex flex-col items-center gap-6 transition-all group border-4",
                                            botState?.skin === s.id ? "bg-orange-50 border-orange-500" : "bg-slate-50 border-transparent hover:bg-slate-100"
                                        )}
                                    >
                                        <div className="w-20"><s.component color={s.color} /></div>
                                        <div className="text-center">
                                            <div className="text-[12px] font-black text-slate-800 uppercase tracking-widest">{s.name}</div>
                                            <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Unit_Morph_v3</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowSkins(false)} className="w-full mt-12 p-6 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-widest text-center">Abort Morph</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
