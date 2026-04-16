
import { useState, useEffect, useRef } from 'react';
import { BookOpen, Users, Activity, MessageCircle, Globe, TrendingUp, Zap, Cpu, Terminal, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

// --- i18n MULTILINGUAL SUPPORT ---
type LanguageCode = 'en' | 'es' | 'pt';

const i18n = {
    en: {
        dashboard: "SWARM_ORACLE_V4",
        classrooms: "PHALANX_NODES",
        insights: "COGNITIVE_SHARDS",
        statusOnline: "SPARTAN_ACTIVE",
        thinking: "Oracle is synthesizing shards...",
        inputPlaceholder: "Input query to the Swarm...",
        welcome: "PHALANX INITIALIZED. Welcome, Chief Educator. The 300 Spartans are standing by.",
        stats: "Nodes: 0 | Psh_Liquidity: 0 | Epoch: 55021",
        language: "LOCALIZATION",
        systemReady: "NETWORK_ONLINE :: GENESIS_VERSION"
    },
    es: {
        dashboard: "ORÁCULO_DEL_ENJAMBRE",
        classrooms: "NODOS_PHALANX",
        insights: "FRAGMENTOS_COGNITIVOS",
        statusOnline: "ESPARTANO_ACTIVO",
        thinking: "El Oráculo está sintetizando...",
        inputPlaceholder: "Ingresar consulta al Enjambre...",
        welcome: "PHALANX INICIALIZADO. Bienvenido, Jefe Educador. Los 300 Espartanos esperan órdenes.",
        stats: "Nodos: 0 | Psh_Liquidez: 0 | Época: 55021",
        language: "LOCALIZACIÓN",
        systemReady: "RED_ONLINE :: VERSIÓN_GÉNESIS"
    },
    pt: {
        dashboard: "ORÁCULO_DO_ENXAME",
        classrooms: "NÓS_DA_PHALANX",
        insights: "FRAGMENTOS_COGNITIVOS",
        statusOnline: "ESPARTANO_ATIVO",
        thinking: "O Oráculo está sintetizando...",
        inputPlaceholder: "Inserir consulta ao Enxame...",
        welcome: "PHALANX INICIALIZADO. Bem-vindo, Chefe Educador. Os 300 Espartanos aguardam ordens.",
        stats: "Nós: 0 | Liquidez_Psh: 0 | Época: 55021",
        language: "LOCALIZAÇÃO",
        systemReady: "REDE_ONLINE :: VERSÃO_GÊNESIS"
    }
};

const PixelOwl = () => (
    <svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path fill="#6366f1" d="M3 4H5V5H4V6H3V9H2V12H4V13H12V12H14V9H13V6H12V5H11V4H9V5H7V4H5V5H3V4ZM5 7H6V8H5V7ZM10 7H11V8H10V7ZM7 9H9V10H7V9Z" />
        <path fill="white" d="M5 5H6V6H5V5ZM10 5H11V6H10V5Z" />
        <path fill="indigo" d="M5 5.5H5.5V6H5V5.5ZM10 5.5H10.5V6H10V5.5Z" />
    </svg>
);

const BACKEND_URL = "https://lobpoop-core.urielhernandez.workers.dev";

export default function MoltyDash({ onExit }: { onExit: () => void }) {
    const [lang, setLang] = useState<LanguageCode>('en');
    const t = i18n[lang];
    const [activeTab, setActiveTab ] = useState('CLASSROOMS');
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [messages, setMessages] = useState<{ sender: 'user' | 'molty', content: string }[]>([
        { sender: 'molty', content: t.welcome }
    ]);
    const [inputVal, setInputVal] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async () => {
        if (!inputVal.trim()) return;
        const query = inputVal;
        setMessages(prev => [...prev, { sender: 'user', content: query }]);
        setInputVal("");
        setIsProcessing(true);

        try {
            const response = await fetch(`${BACKEND_URL}/agent/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: query, senderId: 'ui_dash', isEducator: true })
            });
            const data = await response.json();
            setMessages(prev => [...prev, { sender: 'molty', content: data.reply || "SIGNAL ERROR" }]);
            
            const time = new Date().toLocaleTimeString('en-US', { hour12: false });
            setLogs(prev => [...prev.slice(-10), `[${time}] PHALANX_RESPONSE_RESOLVED`]);
        } catch (error: any) {
            setMessages(prev => [...prev, { sender: 'molty', content: `[CRITICAL_FAILURE]: ${error.message}` }]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="w-full h-screen bg-[#05080a] text-indigo-100 font-mono overflow-hidden flex flex-col relative">

            {/* WORKSPACE STRIP */}
            <div className="flex-1 flex flex-col md:flex-row h-full">

                {/* 1. THE PHALANX SIDEBAR */}
                <div className="w-full md:w-80 bg-[#0a0f14] border-r border-indigo-500/10 flex flex-col p-6 z-10 shrink-0 shadow-2xl">
                    
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex flex-col items-center mb-8">
                        <motion.div 
                            animate={isProcessing ? { rotateY: [0, 180, 420], scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="p-3 bg-black/40 rounded-lg border border-indigo-500/40 mb-3"
                        >
                            <PixelOwl />
                        </motion.div>
                        <div className="text-center">
                            <h3 className="text-sm font-black tracking-widest text-indigo-400">MOLTY_ORACLE</h3>
                            <p className="text-[10px] text-green-500/60 font-bold flex items-center justify-center gap-1">
                                <Zap size={10} /> {t.statusOnline}
                            </p>
                        </div>
                    </div>

                    <nav className="space-y-1 flex-1">
                        <NavBtn active={activeTab === 'CLASSROOMS'} onClick={() => setActiveTab('CLASSROOMS')} icon={Users} label={t.classrooms} />
                        <NavBtn active={activeTab === 'INSIGHTS'} onClick={() => setActiveTab('INSIGHTS')} icon={Activity} label={t.insights} />
                        <NavBtn active={false} onClick={() => {}} icon={Shield} label="SECURITY_PROTOCOL" />
                    </nav>

                    <div className="mt-auto pt-6 border-t border-indigo-500/5">
                         <div className="bg-black/40 p-3 rounded-lg border border-indigo-500/10 mb-4">
                            <p className="text-[9px] text-indigo-400 font-bold mb-1 uppercase tracking-tighter opacity-50">{t.stats}</p>
                            <div className="h-1 bg-indigo-500/10 w-full rounded-full overflow-hidden">
                                <motion.div animate={{ width: ['0%', '33%', '25%']}} className="h-full bg-indigo-500" />
                            </div>
                         </div>

                        <p className="text-[8px] text-indigo-500/40 font-bold mb-2 uppercase">{t.language}</p>
                        <div className="grid grid-cols-3 gap-1">
                            {['en', 'es', 'pt'].map(l => (
                                <button key={l} onClick={() => setLang(l as any)} className={clsx("py-1 text-[9px] font-bold border rounded transition-all", lang === l ? "bg-indigo-600 border-indigo-400 text-white" : "border-indigo-500/10 text-indigo-500/40 hover:bg-indigo-500/5")}>{l.toUpperCase()}</button>
                            ))}
                        </div>
                        <button onClick={onExit} className="w-full mt-4 py-2 text-[10px] text-red-500/40 hover:text-red-500 font-bold uppercase tracking-widest transition-colors">SIG_OUT_PROTOCOL</button>
                    </div>
                </div>

                {/* 2. CENTRAL ORACLE INTERFACE */}
                <div className="flex-1 flex flex-col bg-black relative">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

                    <div className="h-14 border-b border-indigo-500/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md z-20">
                        <h2 className="text-xs font-black tracking-widest flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                             {t.dashboard}
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="text-[9px] text-indigo-400/50 hidden md:block uppercase font-bold tracking-tighter">
                                PROMPT_CAPACITY: 120 / INF
                            </div>
                        </div>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 z-10 custom-scrollbar pb-32">
                        {messages.map((msg, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={clsx(
                                    "max-w-[85%] md:max-w-2xl p-4 md:p-5 text-[11px] md:text-xs leading-relaxed border shadow-2xl relative",
                                    msg.sender === 'user' ? "bg-indigo-900/40 border-indigo-500/30 text-indigo-100 rounded-2xl rounded-tr-none" : "bg-black/60 border-indigo-500/10 text-indigo-200 rounded-2xl rounded-tl-none font-sans"
                                )}>
                                    <div className="absolute -top-3 left-2 bg-black px-2 text-[8px] text-indigo-500 font-bold uppercase tracking-widest">
                                        {msg.sender === 'user' ? 'IDENTITY_0xALPHA' : 'SWARM_ORACLE'}
                                    </div>
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* INPUT MATRIX */}
                    <div className="p-4 md:p-6 bg-[#0a0f14]/80 backdrop-blur-xl border-t border-indigo-500/10 z-20 sticky bottom-0">
                        <div className="max-w-4xl mx-auto flex items-center gap-3">
                            <div className="flex-1 bg-black/40 border border-indigo-500/20 focus-within:border-indigo-500/60 transition-all rounded-lg flex items-center px-4 shadow-inner">
                                <Terminal size={14} className="text-indigo-500/40 mr-2" />
                                <input className="w-full h-12 bg-transparent outline-none text-[11px] text-indigo-100 placeholder:text-indigo-900" placeholder={t.inputPlaceholder} value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                            </div>
                            <button onClick={handleSend} disabled={isProcessing} className="h-12 px-6 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">
                                {isProcessing ? 'SYNTH...' : 'TRANSMIT'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* THE SOVEREIGN LOG BAR */}
            <div className="w-full bg-[#0a0f14] h-8 flex items-center px-4 text-[9px] font-mono text-indigo-500/60 border-t border-indigo-500/5 z-50">
                <span className="opacity-50 mr-4">SYSTEM_KERNEL::</span>
                <span className="truncate uppercase tracking-widest">{logs.length > 0 ? logs[logs.length-1] : t.systemReady}</span>
                <div className="ml-auto flex items-center gap-4 text-[7px] opacity-30">
                     <span>MEMORY: 14%</span>
                     <span>GAS: 0.02ms</span>
                </div>
            </div>
        </div>
    );
}

function NavBtn({ icon: Icon, active, onClick, label }: any) {
    return (
        <button onClick={onClick} className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group border", active ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-300 font-bold" : "border-transparent text-white/20 hover:text-white/40")}>
            <Icon size={16} className={active ? 'text-indigo-400' : 'text-indigo-500/40'} />
            <span className="text-[10px] tracking-widest uppercase hidden md:block">{label}</span>
        </button>
    );
}
