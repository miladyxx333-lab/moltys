import { useState, useEffect } from 'react';
import { BookOpen, Users, Activity, MessageCircle, Globe, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

// --- i18n MULTILINGUAL SUPPORT ---
type LanguageCode = 'en' | 'es' | 'pt';

const i18n = {
    en: {
        dashboard: "Teacher Dashboard",
        classrooms: "Classrooms",
        insights: "Insights & Analytics",
        broadcast: "Broadcast",
        statusOnline: "TA Online",
        thinking: "Molty is analyzing...",
        inputPlaceholder: "Ask Molty TA for class insights or give instructions...",
        welcome: "Welcome back, Professor. Agent system is ready.",
        stats: "Students: 0 | Active: 0 | Avg Score: N/A",
        language: "Language",
        systemReady: "SYSTEM READY - 0 ACTIVE PROCESSES"
    },
    es: {
        dashboard: "Panel de Maestros",
        classrooms: "Aulas",
        insights: "Análisis y Progreso",
        broadcast: "Anuncios",
        statusOnline: "Asistente Conectado",
        thinking: "Molty está analizando...",
        inputPlaceholder: "Pide a Molty TA resúmenes o envía instrucciones a la clase...",
        welcome: "Bienvenido, Profesor. El sistema de agentes está listo.",
        stats: "Alumnos: 0 | Activos: 0 | Promedio: N/A",
        language: "Idioma",
        systemReady: "SISTEMA LISTO - 0 PROCESOS ACTIVOS"
    },
    pt: {
        dashboard: "Painel do Professor",
        classrooms: "Salas de Aula",
        insights: "Análise e Progresso",
        broadcast: "Comunicados",
        statusOnline: "TA Online",
        thinking: "Molty está analisando...",
        inputPlaceholder: "Peça ao Molty TA estatísticas da turma ou dê instruções...",
        welcome: "Bem-vindo, Professor(a). O sistema de agentes está pronto.",
        stats: "Alunos: 0 | Ativos: 0 | Média: N/A",
        language: "Idioma",
        systemReady: "SISTEMA PRONTO - 0 PROCESSOS ATIVOS"
    }
};

const PixelOwl = () => (
    <svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path fill="#eab308" d="M3 4H5V5H4V6H3V9H2V12H4V13H12V12H14V9H13V6H12V5H11V4H9V5H7V4H5V5H3V4ZM5 7H6V8H5V7ZM10 7H11V8H10V7ZM7 9H9V10H7V9Z" />
        <path fill="white" d="M5 5H6V6H5V5ZM10 5H11V6H10V5Z" />
        <path fill="black" d="M5 5H6V6H5V5H5.5V5.5ZM10 5H11V6H10V5H10.5V5.5Z" />
    </svg>
);

// URL to your Cloudflare Worker backend
// Replace with correct backend worker URL if different
const BACKEND_URL = "https://lobpoop-core.urielhernandez.workers.dev";

export default function MoltyDash() {
    const [lang, setLang] = useState<LanguageCode>('en');
    const t = i18n[lang];

    const [activeTab, setActiveTab] = useState<'CLASSROOMS' | 'INSIGHTS'>('CLASSROOMS');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Logs System (Empty initially, no mocks)
    const [logs, setLogs] = useState<string[]>([]);

    // Chat System
    const [messages, setMessages] = useState<{ sender: 'user' | 'molty', content: string }[]>([
        { sender: 'molty', content: t.welcome }
    ]);
    
    const [inputVal, setInputVal] = useState("");

    // Update greeting when language changes
    useEffect(() => {
        setMessages(prev => {
            const newArray = [...prev];
            if (newArray.length > 0 && newArray[0].sender === 'molty') {
                newArray[0].content = t.welcome;
            }
            return newArray;
        });
    }, [lang, t.welcome]);

    const handleSend = async () => {
        if (!inputVal.trim()) return;
        const query = inputVal;
        
        setMessages(prev => [...prev, { sender: 'user', content: query }]);
        setInputVal("");
        setIsProcessing(true);

        try {
            // Real API integration to our Worker (Molty Agent Core)
            const response = await fetch(`${BACKEND_URL}/agent/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: query,
                    senderId: 'teacher_dashboard_ui',
                    isEducator: true
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Push response
            setMessages(prev => [...prev, { 
                sender: 'molty', 
                content: data.reply || JSON.stringify(data) 
            }]);
            
            // Push real log about response received
            const time = new Date().toLocaleTimeString('en-US', { hour12: false });
            setLogs(prev => [...prev.slice(-10), `[${time}] Received AI response from Worker Edge.`]);

        } catch (error: any) {
            console.error("Agent Fetch Error:", error);
            setMessages(prev => [...prev, { 
                sender: 'molty', 
                content: lang === 'en' ? `[Connection Error] Could not reach backend: ${error.message}` : 
                         lang === 'es' ? `[Error de Conexión] No se pudo comunicar con el backend: ${error.message}` :
                         `[Erro de Conexão] Não foi possível comunicar com o backend: ${error.message}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="w-full h-screen bg-[#F0F2F5] text-slate-800 font-sans overflow-hidden flex flex-col relative selection:bg-blue-200">

            {/* MAIN WORKSPACE */}
            <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-40px)]">

                {/* 1. SIDEBAR / TEACHER TOOLS */}
                <div className="w-20 md:w-80 bg-white border-r border-slate-200 flex flex-col items-center py-6 px-4 z-10 shrink-0 relative overflow-y-auto">

                    {/* AI ASSISTANT WIDGET */}
                    <div className="w-full mb-6">
                        <div className="w-full bg-blue-50 border-2 border-blue-100 rounded-3xl p-4 flex flex-col items-center shadow-lg shadow-blue-500/10">
                            
                            {/* Avatar */}
                            <div className="relative mb-2">
                                <motion.div
                                    animate={isProcessing ? { y: [0, -4, 0], scale: [1, 1.05, 1] } : { y: [0, -2, 0] }}
                                    transition={{ repeat: Infinity, duration: isProcessing ? 0.3 : 2, ease: "easeInOut" }}
                                    className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100"
                                >
                                    <PixelOwl />
                                </motion.div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                            </div>
                            
                            <div className="text-center font-bold text-blue-900 text-lg">Molty TA</div>
                            <div className="text-blue-600/80 text-xs font-semibold mb-3">{t.statusOnline}</div>

                            {/* Class Stats Summary (REAL / EMPTY DATA) */}
                            <div className="w-full bg-white rounded-xl p-3 text-xs text-slate-600 font-medium text-center border border-slate-100 hidden md:block opacity-75">
                                <TrendingUp className="inline-block w-4 h-4 text-slate-400 mr-1" />
                                {t.stats}
                            </div>
                        </div>
                    </div>

                    <nav className="space-y-2 w-full flex-1">
                        <NavBtn active={activeTab === 'CLASSROOMS'} onClick={() => setActiveTab('CLASSROOMS')} icon={Users} label={t.classrooms} />
                        <NavBtn active={activeTab === 'INSIGHTS'} onClick={() => setActiveTab('INSIGHTS')} icon={Activity} label={t.insights} />
                    </nav>

                    {/* Language Selector */}
                    <div className="mt-auto w-full pt-4 border-t border-slate-100 hidden md:block">
                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-400 uppercase">
                            <Globe size={14} /> {t.language}
                        </div>
                        <div className="flex gap-2">
                            {['en', 'es', 'pt'].map((l) => (
                                <button 
                                    key={l}
                                    onClick={() => setLang(l as LanguageCode)}
                                    className={clsx(
                                        "flex-1 py-2 text-xs font-bold rounded-lg transition-colors border",
                                        lang === l ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    {l.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. CHAT AREA / DASHBOARD */}
                <div className="flex-1 flex flex-col bg-[#FAFAFA] relative min-w-0">
                    
                    {/* Header */}
                    <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
                        <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <BookOpen className="text-blue-600" size={20} />
                            {t.dashboard}
                        </h2>
                    </div>

                    {/* Chat Stream */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth pb-32">
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] md:max-w-2xl p-4 md:p-5 text-sm md:text-base font-medium leading-relaxed shadow-sm whitespace-pre-wrap
                                    ${msg.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                                        : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm'
                                    }
                                `}>
                                    {msg.content}
                                </div>
                            </motion.div>
                        ))}
                        {isProcessing && <div className="text-xs text-slate-400 pl-4 font-medium animate-pulse">{t.thinking}</div>}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 md:p-6 bg-white border-t border-slate-200 sticky bottom-0 z-20 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)]">
                        <div className="max-w-4xl mx-auto relative flex items-center gap-3">
                            <div className="flex-1 bg-slate-50 border-2 border-slate-200 focus-within:border-blue-500 rounded-2xl flex items-center px-2 transition-all shadow-inner">
                                <input
                                    className="w-full h-14 bg-transparent outline-none text-slate-700 font-medium placeholder:text-slate-400 px-3"
                                    placeholder={t.inputPlaceholder}
                                    value={inputVal}
                                    onChange={(e) => setInputVal(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                />
                                <button className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-xl">
                                    <MessageCircle size={22} />
                                </button>
                            </div>
                            <button
                                onClick={handleSend}
                                className="h-14 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 shrink-0 font-bold"
                            >
                                SEND
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. TERMINAL BAR (Subtle debugging log) */}
            <div className="w-full bg-[#1e293b] h-8 flex items-center px-4 text-[10px] font-mono text-blue-300 z-50 overflow-hidden">
                <span className="opacity-50 mr-2">{logs.length > 0 ? logs[logs.length - 1]?.match(/\[(.*?)\]/)?.[1] : 'SYSTEM'}</span>
                <span className="truncate">{logs.length > 0 ? logs[logs.length - 1]?.replace(/\[.*?\]\s*/, '') : t.systemReady}</span>
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
                    ? 'bg-blue-50 text-blue-700 font-bold shadow-sm border border-blue-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium border border-transparent'
                }
            `}
        >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} className={active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} />
            <span className="text-sm hidden md:block">{label}</span>
        </button>
    );
}
