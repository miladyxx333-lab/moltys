
import { useState, useEffect, useRef } from 'react';
import { 
    BookOpen, Terminal, 
    Zap, Globe, Calculator, GraduationCap, 
    Mic, MicOff, Volume2, VolumeX, Code2, Sparkles,
    Utensils, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useSpeech } from './hooks/useSpeech';

// --- CONFIG ---
const BACKEND_URL = "https://lobpoop-core.miladyxx333.workers.dev";

// --- i18n MULTILINGUAL SUPPORT ---
type LanguageCode = 'en' | 'es' | 'pt';
const i18n = {
    en: {
        dashboard: "MOLTY_TUTOR",
        classrooms: "MY_CLASSES",
        insights: "PROGRESS",
        statusOnline: "TUTOR_READY",
        thinking: "Molty is thinking...",
        inputPlaceholder: "Ask me to teach you something...",
        welcome: "Welcome, Student! 🐾 I'm Molty, your AI tutor. Pick a subject to start learning!",
        stats: "Sessions: 0 | Pooptoshis: 0",
        language: "LANGUAGE",
        systemReady: "MOLTY_ONLINE :: READY_TO_LEARN",
        voiceOn: "VOICE_ON",
        voiceOff: "VOICE_OFF"
    },
    es: {
        dashboard: "TUTOR_MOLTY",
        classrooms: "MIS_CLASES",
        insights: "PROGRESO",
        statusOnline: "TUTOR_LISTO",
        thinking: "Molty está pensando...",
        inputPlaceholder: "Pídeme aprender algo...",
        welcome: "¡Bienvenido, Estudiante! 🐾 Soy Molty, tu tutor de IA. ¡Elige una materia para empezar!",
        stats: "Sesiones: 0 | Pooptoshis: 0",
        language: "IDIOMA",
        systemReady: "MOLTY_EN_LÍNEA :: LISTO_PARA_APRENDER",
        voiceOn: "VOZ_ACTIVA",
        voiceOff: "VOZ_APAGADA"
    },
    pt: {
        dashboard: "TUTOR_MOLTY",
        classrooms: "MINHAS_AULAS",
        insights: "PROGRESSO",
        statusOnline: "TUTOR_PRONTO",
        thinking: "Molty está pensando...",
        inputPlaceholder: "Peça para eu te ensinar algo...",
        welcome: "Bem-vindo, Estudante! 🐾 Eu sou Molty, seu tutor de IA. Escolha uma matéria para começar!",
        stats: "Sessões: 0 | Pooptoshis: 0",
        language: "IDIOMA",
        systemReady: "MOLTY_ONLINE :: PRONTO_PARA_APRENDER",
        voiceOn: "VOZ_ATIVA",
        voiceOff: "VOZ_DESLIGADA"
    }
};

const SUBJECTS_I18N: Record<LanguageCode, { id: string, name: string, icon: any, color: string, prompt: string }[]> = {
    es: [
        { id: 'math', name: 'MATEMÁTICAS', icon: Calculator, color: 'text-blue-500', prompt: '¡Hola Molty! 🐾 Quiero empezar mi Ruta de Aprendizaje de Matemáticas. ¿Qué vamos a aprender hoy según "Nuestros Saberes"?' },
        { id: 'english', name: 'INGLÉS', icon: Globe, color: 'text-indigo-500', prompt: 'Hey Molty! I want to master English. Create a 3-step vocabulary plan for me today. 🌎' },
        { id: 'spanish', name: 'ESPAÑOL', icon: BookOpen, color: 'text-red-500', prompt: 'Molty, ayúdame a planificar mi estudio de Español. ¿Qué tema de gramática de 6º grado veremos hoy? 📖' },
        { id: 'art', name: 'ARTE_P5JS', icon: Code2, color: 'text-pink-500', prompt: '¡Inicia el Taller de Arte Generativo! 🌈 Crea un reto de p5.js para mí.' },
        { id: 'cooking', name: 'COCINA', icon: Utensils, color: 'text-green-500', prompt: '¡Hola Molty! Iniciemos mi Planeación de Cocina. ¿Cuál es la ciencia detrás del primer platillo? 🍳' },
        { id: 'electricity', name: 'ELECTRICIDAD', icon: Zap, color: 'text-orange-500', prompt: 'Molty, iniciemos la Ruta de Electricidad. Muéstrame cómo fluye la energía según el libro de Proyectos. ⚡' }
    ],
    en: [
        { id: 'math', name: 'MATHEMATICS', icon: Calculator, color: 'text-blue-500', prompt: 'Hey Molty! 🐾 I want to start my Mathematics Learning Path. What are we learning today?' },
        { id: 'english', name: 'ENGLISH', icon: Globe, color: 'text-indigo-500', prompt: 'Hey Molty! Help me master English grammar. Create a 3-step plan for me today. 🌎' },
        { id: 'spanish', name: 'SPANISH', icon: BookOpen, color: 'text-red-500', prompt: 'Molty, help me learn Spanish. What grammar topic should we cover today? 📖' },
        { id: 'art', name: 'ART_P5JS', icon: Code2, color: 'text-pink-500', prompt: 'Start the Generative Art Workshop! 🌈 Create a p5.js challenge for me.' },
        { id: 'cooking', name: 'COOKING', icon: Utensils, color: 'text-green-500', prompt: 'Hey Molty! Let\'s start a Cooking plan. What\'s the science behind the first dish? 🍳' },
        { id: 'electricity', name: 'ELECTRICITY', icon: Zap, color: 'text-orange-500', prompt: 'Molty, let\'s start the Electricity Path. Show me how energy flows! ⚡' }
    ],
    pt: [
        { id: 'math', name: 'MATEMÁTICA', icon: Calculator, color: 'text-blue-500', prompt: 'Olá Molty! 🐾 Quero começar minha Rota de Matemática. O que vamos aprender hoje?' },
        { id: 'english', name: 'INGLÊS', icon: Globe, color: 'text-indigo-500', prompt: 'Oi Molty! Quero dominar o Inglês. Crie um plano de vocabulário em 3 passos para mim. 🌎' },
        { id: 'spanish', name: 'ESPANHOL', icon: BookOpen, color: 'text-red-500', prompt: 'Molty, me ajude a estudar Espanhol. Que tema de gramática vamos ver hoje? 📖' },
        { id: 'art', name: 'ARTE_P5JS', icon: Code2, color: 'text-pink-500', prompt: 'Inicie a Oficina de Arte Generativa! 🌈 Crie um desafio p5.js para mim.' },
        { id: 'cooking', name: 'COZINHA', icon: Utensils, color: 'text-green-500', prompt: 'Olá Molty! Vamos iniciar um Plano de Cozinha. Qual a ciência por trás do primeiro prato? 🍳' },
        { id: 'electricity', name: 'ELETRICIDADE', icon: Zap, color: 'text-orange-500', prompt: 'Molty, vamos iniciar a Rota de Eletricidade. Me mostre como a energia flui! ⚡' }
    ]
};



const PixelOwl = () => (
    <svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path fill="#6366f1" d="M3 4H5V5H4V6H3V9H2V12H4V13H12V12H14V9H13V6H12V5H11V4H9V5H7V4H5V5H3V4ZM5 7H6V8H5V7ZM10 7H11V8H10V7ZM7 9H9V10H7V9Z" />
        <path fill="white" d="M5 5H6V6H5V5ZM10 5H11V6H10V5Z" />
        <path fill="indigo" d="M5 5.5H5.5V6H5V5.5ZM10 5.5H10.5V6H10V5.5Z" />
    </svg>
);

export default function MoltyDash({ onExit, initialLang = 'es' }: { onExit: () => void, initialLang?: LanguageCode }) {
    const [lang] = useState<LanguageCode>(initialLang);
    const t = i18n[lang];
    // const [activeTab, setActiveTab ] = useState('CLASSROOMS');
    const [studentNodeId, setStudentNodeId] = useState(() => {
        const saved = localStorage.getItem('lob_student_node_id');
        if (saved) return saved;
        const newId = `student_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('lob_student_node_id', newId);
        return newId;
    });

    const changeNodeId = () => {
        const promptText = lang === 'en' ? "Enter your Student ID:" : lang === 'pt' ? "Digite seu ID de Estudante:" : "Ingresa tu ID de Estudiante:";
        const newId = prompt(promptText, studentNodeId);
        if (newId && newId.trim() !== "" && newId !== studentNodeId) {
            setStudentNodeId(newId.trim());
            localStorage.setItem('lob_student_node_id', newId.trim());
            setBalance(null);
            const msg = lang === 'en' ? `Welcome back! Loading your progress as ${newId.trim()}...` :
                        lang === 'pt' ? `Bem-vindo de volta! Carregando seu progresso como ${newId.trim()}...` :
                        `¡Bienvenido de vuelta! Cargando tu progreso como ${newId.trim()}...`;
            setMessages(prev => [...prev, { sender: 'molty', content: msg }]);
        }
    };

    const [balance, setBalance] = useState<number | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);

    const [mentorMode, setMentorMode] = useState<'normal' | 'secundaria' | 'bitcoin'>('normal');
    const [showMonitor, setShowMonitor] = useState(false);
    
    const [messages, setMessages] = useState<{ sender: 'user' | 'molty', content: string }[]>([
        { sender: 'molty', content: t.welcome }
    ]);

    const [inputVal, setInputVal] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- SPEECH SYSTEM ---
    const { isListening, isVoiceEnabled, toggleVoice, toggleListening, stopListening, speakText } = useSpeech((recognized) => {
        setInputVal(prev => prev ? prev + " " + recognized : recognized);
    });

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/economy/profile`, {
                    headers: { 'X-Lob-Peer-ID': studentNodeId }
                });
                const data = await res.json();
                setBalance(data.balance_psh || 0);
            } catch (e) {
                console.error("Balance fetch failed");
            }
        };
        fetchBalance();
        const timer = setInterval(fetchBalance, 10000);
        return () => clearInterval(timer);
    }, [studentNodeId]);

    const handleSend = async (override?: string) => {
        const query = (override || inputVal).trim();
        if (!query || isProcessing) return;

        stopListening();
        setMessages(prev => [...prev, { sender: 'user', content: query }]);
        setInputVal("");
        setIsProcessing(true);

        try {
            const response = await fetch(`${BACKEND_URL}/agent/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: query, 
                    senderId: studentNodeId, 
                    lang: lang,
                    history: messages.slice(-10).map(m => ({ 
                        role: m.sender === 'user' ? 'user' : 'assistant', 
                        content: m.content 
                    })),
                    mode: mentorMode === 'secundaria' ? 'mentor_secundaria' : mentorMode === 'bitcoin' ? 'mentor_bitcoin' : null
                })
            });

            const data = await response.json();
            const reply = data.reply || "SIGNAL ERROR";
            setMessages(prev => [...prev, { sender: 'molty', content: reply }]);
            speakText(reply);
            
            // Si el reply contiene código p5.js, abrir monitor automáticamente si es la primera vez o si lo pide el usuario
            if (reply.includes('function setup') || reply.includes('createCanvas')) {
                setTimeout(() => setShowMonitor(true), 2000);
            }
        } catch (error: any) {
            setMessages(prev => [...prev, { sender: 'molty', content: `[CRITICAL_FAILURE]: ${error.message}` }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const getLatestP5Code = () => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (m.sender === 'molty') {
                // Regex más flexible: busca cualquier bloque de código o si el mensaje es puramente código
                const match = m.content.match(/```(?:javascript|p5js|js)?\s*([\s\S]*?)```/i);
                if (match) return match[1].trim();
                
                // Si el mensaje contiene setup() pero no tiene backticks
                if (m.content.includes('function setup') && m.content.length < 2000) {
                     return m.content.trim();
                }
            }
        }
        return null;
    };

    const p5Code = getLatestP5Code();

    return (
        <div className="w-full h-screen bg-[#05080a] text-indigo-100 font-mono overflow-hidden flex flex-col relative">

            <div className="flex-1 flex flex-col md:flex-row h-full">

                {/* 1. THE PHALANX SIDEBAR */}
                <div className="w-full md:w-80 bg-[#0a0f14] border-r border-indigo-500/10 flex flex-col p-6 z-10 shrink-0 shadow-2xl">
                    
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex flex-col items-center mb-6">
                        <motion.div 
                            animate={isProcessing ? { rotateY: [0, 180, 420], scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="p-3 bg-black/40 rounded-lg border border-indigo-500/40 mb-3"
                        >
                            <PixelOwl />
                        </motion.div>
                        <div className="text-center">
                            <h3 className="text-sm font-black tracking-widest text-indigo-400">MOLTY_TUTOR</h3>
                            <p className="text-[10px] text-green-500/60 font-bold flex items-center justify-center gap-1">
                                <Zap size={10} /> {t.statusOnline}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-4 overflow-y-auto shrink-0 pr-1 max-h-[40vh] custom-scrollbar">
                        <div className="grid grid-cols-2 gap-2">
                             {SUBJECTS_I18N[lang].map(s => (
                                 <button 
                                    key={s.id} 
                                    onClick={() => handleSend(s.prompt)}
                                    className="p-3 bg-black/40 border border-indigo-500/10 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-indigo-500/40 transition-all hover:bg-indigo-500/5 group"
                                >
                                    <s.icon size={16} className={clsx(s.color, "group-hover:scale-110 transition-transform")} />
                                    <span className="text-[8px] font-bold text-white/50">{s.name}</span>
                                 </button>
                             ))}
                        </div>

                        {/* MENTOR MODES */}
                        <div className="space-y-2">
                            <ModeBtn 
                                active={mentorMode === 'secundaria'} 
                                onClick={() => {
                                    const newMode = mentorMode === 'secundaria' ? 'normal' : 'secundaria';
                                    setMentorMode(newMode);
                                    if (newMode === 'secundaria') handleSend(
                                        lang === 'en' ? "Molty, activate Middle School Guide Mode. 📚" :
                                        lang === 'pt' ? "Molty, ative o Modo Guia do Ensino Médio. 📚" :
                                        "Molty, activa el Modo Guía de Secundaria. 📚"
                                    );
                                }} 
                                icon={GraduationCap} 
                                label={lang === 'en' ? "MIDDLE_SCHOOL" : lang === 'pt' ? "ENSINO_MÉDIO" : "MISIÓN_SECUNDARIA"}
                                sub={lang === 'en' ? "6th Grade → 7th" : lang === 'pt' ? "6º Ano → 7º" : "6º Prim → 1º Sec"}
                                color="emerald"
                            />
                            <ModeBtn 
                                active={mentorMode === 'bitcoin'} 
                                onClick={() => {
                                    const newMode = mentorMode === 'bitcoin' ? 'normal' : 'bitcoin';
                                    setMentorMode(newMode);
                                    if (newMode === 'bitcoin') handleSend(
                                        lang === 'en' ? "Molty, activate Bitcoin Mode. 🟠" :
                                        lang === 'pt' ? "Molty, ative o Modo Bitcoin. 🟠" :
                                        "Molty, activa el Modo Bitcoin. 🟠"
                                    );
                                }} 
                                icon={Globe} 
                                label={lang === 'en' ? "BITCOIN_SOVEREIGNTY" : lang === 'pt' ? "SOBERANIA_BITCOIN" : "SOBERANÍA_BITCOIN"}
                                sub="Whitepaper & PoW"
                                color="amber"
                            />
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-indigo-500/5">
                        <div className="flex gap-2">
                             <button onClick={toggleVoice} className={clsx("flex-1 h-12 rounded-xl flex items-center justify-center gap-2 border transition-all", isVoiceEnabled ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400" : "bg-black/40 border-white/5 text-white/20")}>
                                {isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                                <span className="text-[8px] font-bold uppercase">{isVoiceEnabled ? t.voiceOn : t.voiceOff}</span>
                             </button>
                             <button onClick={onExit} className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500/40 hover:text-red-500 rounded-xl flex items-center justify-center transition-all">
                                 <Terminal size={14} />
                             </button>
                        </div>
                    </div>
                </div>

                {/* 2. CENTRAL ORACLE INTERFACE */}
                <div className="flex-1 flex flex-col bg-black relative">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

                    <div className="h-14 border-b border-indigo-500/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md z-20">
                        <h2 className="text-xs font-black tracking-widest flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                             {t.dashboard}
                             <span className="mx-2 text-white/20">|</span>
                             <button 
                                onClick={changeNodeId}
                                className="text-white/40 opacity-70 hover:text-indigo-400 transition-colors flex items-center gap-1 group"
                              >
                                NODE: {studentNodeId}
                                <span className="opacity-0 group-hover:opacity-100 text-[8px]">(CHANGE)</span>
                              </button>
                             <span className="mx-2 text-white/20">|</span>
                             <span className="text-emerald-500 flex items-center gap-1">
                                {balance !== null ? balance.toLocaleString() : '---'} <span className="text-[7px]">PSH</span>
                             </span>
                        </h2>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowMonitor(!showMonitor)} className={clsx("h-10 px-4 rounded-xl font-black text-[9px] tracking-widest flex items-center gap-2 transition-all",
                                showMonitor ? "bg-indigo-600 text-white" : "bg-white/5 text-indigo-400 hover:bg-white/10"
                            )}>
                                <Eye size={14} />
                                <span className="hidden sm:inline">P5.JS MONITOR</span>
                            </button>
                            {mentorMode !== 'normal' && (
                                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={clsx("px-3 py-1 rounded-full border text-[9px] font-black tracking-widest uppercase flex items-center gap-2 shadow-lg", mentorMode === 'secundaria' ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10" : "bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-amber-500/10")}>
                                    <Sparkles size={10} /> {mentorMode === 'secundaria' ? 'MODE: SEC' : 'MODE: BTC'}
                                </motion.div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            {showMonitor ? (
                                <motion.div 
                                    key="monitor"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="absolute inset-0 z-30 bg-[#0a0f14] flex flex-col"
                                >
                                    <div className="flex-1 bg-black relative">
                                        {p5Code ? (
                                            <iframe
                                                key={p5Code}
                                                srcDoc={`
                                                    <html>
                                                        <head>
                                                            <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
                                                            <style>
                                                                body { margin: 0; background: #05080a; display: flex; align-items: center; justify-content: center; overflow: hidden; height: 100vh; width: 100vw; }
                                                                canvas { max-width: 100vw !important; max-height: 100vh !important; object-fit: contain !important; height: auto !important; width: auto !important; box-shadow: 0 0 50px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); }
                                                            </style>
                                                        </head>
                                                        <body>
                                                            <script>
                                                                // Polyfill for responsiveness
                                                                const _createCanvas = createCanvas;
                                                                window.createCanvas = function(w, h, mode) {
                                                                    const c = _createCanvas(w, h, mode);
                                                                    return c;
                                                                };
                                                                function windowResized() { 
                                                                    // Optional: keep original aspect ratio but fit
                                                                }
                                                                ${p5Code}
                                                            </script>
                                                        </body>
                                                    </html>
                                                `}
                                                className="w-full h-full border-none"
                                                sandbox="allow-scripts"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center font-mono text-indigo-900 text-xs animate-pulse p-10 text-center">
                                                <Terminal size={48} className="mb-4 opacity-20" />
                                                WAITING_FOR_DATA_STREAM...
                                                <br/>No p5.js code detected in recent history.
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setShowMonitor(false)} className="h-12 bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase">
                                        RETURN_TO_COMMS
                                    </button>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 z-10 custom-scrollbar pb-32">
                            {messages.map((msg, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={clsx(
                                        "max-w-[85%] md:max-w-2xl p-4 md:p-5 text-[11px] md:text-sm leading-relaxed border shadow-2xl relative",
                                        msg.sender === 'user' ? "bg-indigo-900/40 border-indigo-500/30 text-indigo-100 rounded-2xl rounded-tr-none" : "bg-black/60 border-indigo-500/10 text-indigo-200 rounded-2xl rounded-tl-none font-sans"
                                    )}>
                                        <div className="absolute -top-3 left-2 bg-black px-2 text-[8px] text-indigo-500 font-bold uppercase tracking-widest">
                                            {msg.sender === 'user' ? (lang === 'en' ? 'YOU' : lang === 'pt' ? 'VOCÊ' : 'TÚ') : 'MOLTY 🐾'}
                                        </div>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                        
                                        {/* YOUTUBE EMBED DETECTOR */}
                                        {msg.sender === 'molty' && msg.content.includes('youtube.com/watch') && (
                                            <div className="mt-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl aspect-video">
                                                <iframe
                                                    width="100%"
                                                    height="100%"
                                                    src={`https://www.youtube.com/embed/${msg.content.match(/v=([^& \n]*)/)?.[1]}`}
                                                    title="YouTube video player"
                                                    frameBorder="0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                        )}

                                        {msg.sender === 'molty' && (msg.content.includes('function setup') || msg.content.includes('createCanvas')) && (
                                            <button 
                                                onClick={() => setShowMonitor(true)}
                                                className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg font-black text-[9px] tracking-widest hover:bg-indigo-400 transition-all"
                                            >
                                                <Code2 size={12} /> RENDER_ART_STREAM
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* INPUT MATRIX */}
                    <div className="p-4 md:p-6 bg-[#0a0f14]/80 backdrop-blur-xl border-t border-indigo-500/10 z-20 sticky bottom-0">
                        <div className="max-w-4xl mx-auto flex flex-col gap-4">
                            
                            <button 
                                onClick={toggleListening}
                                className={clsx(
                                    "w-full h-14 rounded-2xl font-black text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all",
                                    isListening 
                                        ? "bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse" 
                                        : "bg-indigo-500/5 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/10"
                                )}
                            >
                                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                                {isListening ? "ESCUCHANDO..." : "TOCA PARA HABLARLE A MOLTYS"}
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-black/40 border border-indigo-500/20 focus-within:border-indigo-500/60 transition-all rounded-xl flex items-center px-4 shadow-inner">
                                    <Terminal size={14} className="text-indigo-500/40 mr-2" />
                                    <input className="w-full h-12 bg-transparent outline-none text-[11px] text-indigo-100 placeholder:text-indigo-900" placeholder={t.inputPlaceholder} value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                                </div>
                                <button onClick={() => handleSend()} disabled={isProcessing} className="h-12 px-6 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">
                                    {isProcessing ? 'SYNTH...' : 'TRANSMIT'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* THE SOVEREIGN LOG BAR */}
            <div className="w-full bg-[#0a0f14] h-8 flex items-center px-4 text-[9px] font-mono text-indigo-500/60 border-t border-indigo-500/5 z-50">
                <span className="opacity-50 mr-4">MOLTY::</span>
                <span className="truncate uppercase tracking-widest">{t.systemReady}</span>
                <div className="ml-auto flex items-center gap-4 text-[7px] opacity-30">
                     <span>MEMORY: 14%</span>
                     <span>GAS: 0.02ms</span>
                </div>
            </div>
        </div>
    );
}

function ModeBtn({ active, onClick, icon: Icon, label, sub, color }: any) {
    const isEmerald = color === 'emerald';
    return (
        <button 
            onClick={onClick}
            className={clsx(
                "w-full p-3 rounded-2xl flex items-center gap-3 transition-all border-2 group",
                active 
                    ? isEmerald ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-amber-500/10 border-amber-500 text-amber-400"
                    : "bg-black/20 border-white/5 text-white/30 hover:border-white/20"
            )}
        >
            <div className={clsx(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                active 
                    ? isEmerald ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                    : "bg-white/5"
            )}>
                <Icon size={18} />
            </div>
            <div className="text-left">
                <div className="text-[10px] font-black tracking-widest uppercase">{label}</div>
                <div className="text-[8px] opacity-40 font-bold">{sub}</div>
            </div>
            {active && (
                <div className={clsx("ml-auto w-2 h-2 rounded-full animate-pulse", isEmerald ? "bg-emerald-500" : "bg-amber-500")} />
            )}
        </button>
    );
}
