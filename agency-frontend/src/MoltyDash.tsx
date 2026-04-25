
import { useState, useEffect, useRef } from 'react';
import { 
    BookOpen, Terminal, 
    Zap, Globe, Calculator, GraduationCap, 
    Mic, MicOff, Volume2, VolumeX, Code2, Sparkles,
    Utensils, Eye, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useSpeech } from './hooks/useSpeech';
import WhatsAppStatusButton from './WhatsAppStatusButton';
import ArtEngine from './ArtEngine';

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
        language: "LANGUAGE",
        systemReady: "MOLTY_ONLINE :: READY_TO_LEARN",
        voiceOn: "VOICE_ON",
        voiceOff: "VOICE_OFF",
        actionLearn: "LEARN",
        sendBtn: "TRANSMIT",
        sendingBtn: "SYNTH...",
        changeLabel: "(CHANGE)",
        artStudio: "ART_STUDIO",
        listening: "LISTENING...",
        tapToSpeak: "TAP TO SPEAK TO MOLTY",
        youLabel: "YOU",
        modeSecundaria: "MIDDLE_SCHOOL",
        modeBitcoin: "BITCOIN_SOVEREIGNTY",
        modeSecundariaTag: "MODE: MIDDLE_SCHOOL",
        modeBitcoinTag: "MODE: BITCOIN",
        subSecundaria: "6th Grade → 7th",
        subBitcoin: "Whitepaper & PoW",
        activateSecundaria: "Molty, activate Middle School Guide Mode. 📚",
        activateBitcoin: "Molty, activate Bitcoin Mode. 🟠",
        enterStudentId: "Enter your Student ID:",
        welcomeBack: "Welcome back! Loading your progress as",
    },
    es: {
        dashboard: "TUTOR_MOLTY",
        classrooms: "MIS_CLASES",
        insights: "PROGRESO",
        statusOnline: "TUTOR_LISTO",
        thinking: "Molty está pensando...",
        inputPlaceholder: "Pídeme aprender algo...",
        welcome: "¡Bienvenido, Estudiante! 🐾 Soy Molty, tu tutor de IA. ¡Elige una materia para empezar!",
        language: "IDIOMA",
        systemReady: "MOLTY_EN_LÍNEA :: LISTO_PARA_APRENDER",
        voiceOn: "VOZ_ACTIVA",
        voiceOff: "VOZ_APAGADA",
        actionLearn: "APRENDER",
        sendBtn: "ENVIAR",
        sendingBtn: "PENSANDO...",
        changeLabel: "(CAMBIAR)",
        artStudio: "ESTUDIO_ARTE",
        listening: "ESCUCHANDO...",
        tapToSpeak: "TOCA PARA HABLARLE A MOLTY",
        youLabel: "TÚ",
        modeSecundaria: "MISIÓN_SECUNDARIA",
        modeBitcoin: "SOBERANÍA_BITCOIN",
        modeSecundariaTag: "MODO: SECUNDARIA",
        modeBitcoinTag: "MODO: BITCOIN",
        subSecundaria: "6º Prim → 1º Sec",
        subBitcoin: "Whitepaper & PoW",
        activateSecundaria: "Molty, activa el Modo Guía de Secundaria. 📚",
        activateBitcoin: "Molty, activa el Modo Bitcoin. 🟠",
        enterStudentId: "Ingresa tu ID de Estudiante:",
        welcomeBack: "¡Bienvenido de vuelta! Cargando tu progreso como",
    },
    pt: {
        dashboard: "TUTOR_MOLTY",
        classrooms: "MINHAS_AULAS",
        insights: "PROGRESSO",
        statusOnline: "TUTOR_PRONTO",
        thinking: "Molty está pensando...",
        inputPlaceholder: "Peça para eu te ensinar algo...",
        welcome: "Bem-vindo, Estudante! 🐾 Eu sou Molty, seu tutor de IA. Escolha uma matéria para começar!",
        language: "IDIOMA",
        systemReady: "MOLTY_ONLINE :: PRONTO_PARA_APRENDER",
        voiceOn: "VOZ_ATIVA",
        voiceOff: "VOZ_DESLIGADA",
        actionLearn: "APRENDER",
        sendBtn: "ENVIAR",
        sendingBtn: "PENSANDO...",
        changeLabel: "(ALTERAR)",
        artStudio: "ESTÚDIO_ARTE",
        listening: "OUVINDO...",
        tapToSpeak: "TOQUE PARA FALAR COM MOLTY",
        youLabel: "VOCÊ",
        modeSecundaria: "ENSINO_MÉDIO",
        modeBitcoin: "SOBERANIA_BITCOIN",
        modeSecundariaTag: "MODO: ENSINO_MÉDIO",
        modeBitcoinTag: "MODO: BITCOIN",
        subSecundaria: "6º Ano → 7º",
        subBitcoin: "Whitepaper & PoW",
        activateSecundaria: "Molty, ative o Modo Guia do Ensino Médio. 📚",
        activateBitcoin: "Molty, ative o Modo Bitcoin. 🟠",
        enterStudentId: "Digite seu ID de Estudante:",
        welcomeBack: "Bem-vindo de volta! Carregando seu progresso como",
    }
};

const SUBJECTS_I18N: Record<LanguageCode, { id: string, name: string, icon: any, color: string, prompt: string, action?: string }[]> = {
    es: [
        { id: 'math', name: 'MATEMÁTICAS', icon: Calculator, color: 'text-blue-500', prompt: '¡Hola Molty! 🐾 Quiero empezar mi Ruta de Aprendizaje de Matemáticas. ¿Qué vamos a aprender hoy según "Nuestros Saberes"?' },
        { id: 'english', name: 'INGLÉS', icon: Globe, color: 'text-indigo-500', prompt: 'Hey Molty! I want to master English. Create a 3-step vocabulary plan for me today. 🌎' },
        { id: 'spanish', name: 'ESPAÑOL', icon: BookOpen, color: 'text-red-500', prompt: 'Molty, ayúdame a planificar mi estudio de Español. ¿Qué tema de gramática de 6º grado veremos hoy? 📖' },
        { id: 'art', name: 'ARTE_P5JS', icon: Code2, color: 'text-pink-500', prompt: '¡Inicia el Taller de Arte Generativo! 🌈 Crea un reto de p5.js para mí.' },
        { id: 'cooking', name: 'COCINA', icon: Utensils, color: 'text-green-500', prompt: '¡Hola Molty! Iniciemos mi Planeación de Cocina. ¿Cuál es la ciencia detrás del primer platillo? 🍳' },
        { id: 'electricity', name: 'ELECTRICIDAD', icon: Zap, color: 'text-orange-500', prompt: 'Molty, iniciemos la Ruta de Electricidad. Muéstrame cómo fluye la energía según el libro de Proyectos. ⚡' },
        { id: 'wikipedia', name: 'WIKIPEDIA', icon: Search, color: 'text-cyan-400', prompt: '', action: 'wiki_search' },
        { id: 'youtube', name: 'YOUTUBE', icon: Eye, color: 'text-red-400', prompt: '', action: 'youtube_search' }
    ],
    en: [
        { id: 'math', name: 'ALGEBRA', icon: Calculator, color: 'text-blue-500', prompt: 'Hey Molty! 🐾 Let\'s start my STEM Algebra Path. Respond ONLY in English. What is the Common Core objective for today?' },
        { id: 'cs', name: 'COMPUTER SCI', icon: Terminal, color: 'text-indigo-500', prompt: 'Hey Molty! I want to learn Computer Science. Respond ONLY in English. Teach me a fundamental programming concept. 💻' },
        { id: 'history', name: 'US HISTORY', icon: BookOpen, color: 'text-amber-500', prompt: 'Molty, let\'s explore US History. Respond ONLY in English. What historical event are we analyzing today? 📜' },
        { id: 'physics', name: 'PHYSICS', icon: Zap, color: 'text-orange-500', prompt: 'Molty, let\'s dive into Physics. Respond ONLY in English. Explain a fundamental law of motion to me! ⚡' },
        { id: 'art', name: 'CREATIVE CODE', icon: Code2, color: 'text-pink-500', prompt: 'Start the Creative Coding Workshop! Respond ONLY in English. 🌈 Create a p5.js generative art challenge for me.' },
        { id: 'literature', name: 'LITERATURE', icon: Globe, color: 'text-green-500', prompt: 'Hey Molty! Let\'s read some Literature. Respond ONLY in English. What classic text are we discussing today? 📚' },
        { id: 'wikipedia', name: 'WIKIPEDIA', icon: Search, color: 'text-cyan-400', prompt: '', action: 'wiki_search' },
        { id: 'youtube', name: 'YOUTUBE', icon: Eye, color: 'text-red-400', prompt: '', action: 'youtube_search' }
    ],
    pt: [
        { id: 'math', name: 'MATEMÁTICA', icon: Calculator, color: 'text-blue-500', prompt: 'Olá Molty! 🐾 Quero começar minha rota de Matemática baseada na BNCC. Responda apenas em PORTUGUÊS. Qual a competência de hoje?' },
        { id: 'ciencias', name: 'CIÊNCIAS', icon: Zap, color: 'text-orange-500', prompt: 'Oi Molty! Vamos explorar Ciências da Natureza. Responda apenas em PORTUGUÊS. O que vamos descobrir hoje? 🔬' },
        { id: 'historia', name: 'HISTÓRIA BNCC', icon: BookOpen, color: 'text-amber-500', prompt: 'Molty, me ajude a estudar História do Brasil. Responda apenas em PORTUGUÊS. Qual período histórico vamos analisar? 📖' },
        { id: 'portugues', name: 'PORTUGUÊS', icon: Globe, color: 'text-green-500', prompt: 'Olá Molty! Vamos praticar Língua Portuguesa e gramática. Responda apenas em PORTUGUÊS. Qual o tópico de hoje? 📝' },
        { id: 'art', name: 'ARTE DIGITAL', icon: Code2, color: 'text-pink-500', prompt: 'Inicie a Oficina de Arte Digital! Responda apenas em PORTUGUÊS. 🌈 Crie um desafio p5.js interativo para mim.' },
        { id: 'cidadania', name: 'CIDADANIA', icon: GraduationCap, color: 'text-indigo-500', prompt: 'Olá Molty! Vamos debater Cidadania e Ética. Responda apenas em PORTUGUÊS. Qual o tema de reflexão de hoje? 🤝' },
        { id: 'wikipedia', name: 'WIKIPEDIA', icon: Search, color: 'text-cyan-400', prompt: '', action: 'wiki_search' },
        { id: 'youtube', name: 'YOUTUBE', icon: Eye, color: 'text-red-400', prompt: '', action: 'youtube_search' }
    ]
};




const THEMES = {
    es: {
        wrapper: "bg-[#0a0505] text-rose-100",
        sidebar: "bg-[#140a0a] border-rose-500/10",
        owlBg: "bg-rose-500/5 border-rose-500/20",
        owlBox: "border-rose-500/40",
        accentText: "text-rose-400",
        buttonBorder: "border-rose-500/10 hover:border-rose-500/40 hover:bg-rose-500/5",
        buttonTextHover: "group-hover:text-rose-300",
        grid: "bg-[linear-gradient(rgba(244,63,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.03)_1px,transparent_1px)]",
        borderBottom: "border-rose-500/10",
        monitorBtnOn: "bg-rose-600 text-white",
        monitorBtnOff: "text-rose-400",
        voiceBtnOn: "bg-rose-500/10 border-rose-500/40 text-rose-400",
        owlFill: "#f43f5e",
        pulse: "bg-rose-500",
        textPrimary: "text-rose-100",
        bgLight: "bg-rose-900/40",
        borderBase: "border-rose-500/10",
        borderAccent: "border-rose-500/30"
    },
    en: {
        wrapper: "bg-[#05080a] text-indigo-100",
        sidebar: "bg-[#0a0f14] border-indigo-500/10",
        owlBg: "bg-indigo-500/5 border-indigo-500/20",
        owlBox: "border-indigo-500/40",
        accentText: "text-indigo-400",
        buttonBorder: "border-indigo-500/10 hover:border-indigo-500/40 hover:bg-indigo-500/5",
        buttonTextHover: "group-hover:text-indigo-300",
        grid: "bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)]",
        borderBottom: "border-indigo-500/10",
        monitorBtnOn: "bg-indigo-600 text-white",
        monitorBtnOff: "text-indigo-400",
        voiceBtnOn: "bg-indigo-500/10 border-indigo-500/40 text-indigo-400",
        owlFill: "#6366f1",
        pulse: "bg-indigo-500",
        textPrimary: "text-indigo-100",
        bgLight: "bg-indigo-900/40",
        borderBase: "border-indigo-500/10",
        borderAccent: "border-indigo-500/30"
    },
    pt: {
        wrapper: "bg-[#050a06] text-emerald-100",
        sidebar: "bg-[#0a140d] border-emerald-500/10",
        owlBg: "bg-emerald-500/5 border-emerald-500/20",
        owlBox: "border-emerald-500/40",
        accentText: "text-emerald-400",
        buttonBorder: "border-emerald-500/10 hover:border-emerald-500/40 hover:bg-emerald-500/5",
        buttonTextHover: "group-hover:text-emerald-300",
        grid: "bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)]",
        borderBottom: "border-emerald-500/10",
        monitorBtnOn: "bg-emerald-600 text-white",
        monitorBtnOff: "text-emerald-400",
        voiceBtnOn: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
        owlFill: "#10b981",
        pulse: "bg-emerald-500",
        textPrimary: "text-emerald-100",
        bgLight: "bg-emerald-900/40",
        borderBase: "border-emerald-500/10",
        borderAccent: "border-emerald-500/30"
    }
};

const PixelOwl = ({ fill = "#6366f1" }: { fill?: string }) => (
    <svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path fill={fill} d="M3 4H5V5H4V6H3V9H2V12H4V13H12V12H14V9H13V6H12V5H11V4H9V5H7V4H5V5H3V4ZM5 7H6V8H5V7ZM10 7H11V8H10V7ZM7 9H9V10H7V9Z" />
        <path fill="white" d="M5 5H6V6H5V5ZM10 5H11V6H10V5Z" />
        <path fill="currentColor" opacity="0.5" d="M5 5.5H5.5V6H5V5.5ZM10 5.5H10.5V6H10V5.5Z" />
    </svg>
);

export default function MoltyDash({ onExit, initialLang = 'es' }: { onExit: () => void, initialLang?: LanguageCode }) {
    const [lang] = useState<LanguageCode>(initialLang);
    const t = i18n[lang];
    const theme = THEMES[lang] || THEMES.es;
    // const [activeTab, setActiveTab ] = useState('CLASSROOMS');
    const [studentNodeId, setStudentNodeId] = useState(() => {
        const saved = localStorage.getItem('lob_student_node_id');
        if (saved) return saved;
        const newId = `student_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('lob_student_node_id', newId);
        return newId;
    });

    const changeNodeId = () => {
        const promptText = t.enterStudentId;
        const newId = prompt(promptText, studentNodeId);
        if (newId && newId.trim() !== "" && newId !== studentNodeId) {
            setStudentNodeId(newId.trim());
            localStorage.setItem('lob_student_node_id', newId.trim());
            setBalance(null);
            const msg = `${t.welcomeBack} ${newId.trim()}...`;
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
    }, lang);

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
        if (override) {
            setMessages([{ sender: 'user', content: query }]);
        } else {
            setMessages(prev => [...prev, { sender: 'user', content: query }]);
        }
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
            const awarded = data.awarded || 0;

            setMessages(prev => [...prev, { sender: 'molty', content: reply }]);
            speakText(reply);
            
            if (awarded > 0) {
                // Immediately refresh balance if a reward was granted
                const res = await fetch(`${BACKEND_URL}/economy/profile`, {
                    headers: { 'X-Lob-Peer-ID': studentNodeId }
                });
                const balData = await res.json();
                setBalance(balData.balance_psh || 0);
            }

        } catch (error: any) {
            setMessages(prev => [...prev, { sender: 'molty', content: `[CRITICAL_FAILURE]: ${error.message}` }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleArtMessage = (msg: string) => {
        setMessages(prev => [...prev, { sender: 'molty', content: msg }]);
    };

    return (
        <div className={clsx("w-full h-screen font-mono overflow-hidden flex flex-col relative", theme.wrapper)}>

            <div className="flex-1 flex flex-col md:flex-row h-full">

                {/* 1. THE PHALANX SIDEBAR */}
                <div className={clsx("w-full md:w-80 flex flex-col p-6 z-[100] shrink-0 shadow-2xl border-r", theme.sidebar)}>
                    
                    <div className={clsx("rounded-xl p-4 flex flex-col items-center mb-6 border", theme.owlBg)}>
                        <motion.div 
                            animate={isProcessing ? { rotateY: [0, 180, 420], scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={clsx("p-3 bg-black/40 rounded-lg border mb-3", theme.owlBox)}
                        >
                            <PixelOwl fill={theme.owlFill} />
                        </motion.div>
                        <div className="text-center">
                            <h3 className={clsx("text-sm font-black tracking-widest", theme.accentText)}>MOLTY_TUTOR</h3>
                            <p className="text-[10px] text-green-500/60 font-bold flex items-center justify-center gap-1">
                                <Zap size={10} /> {t.statusOnline}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-4 overflow-y-auto shrink-0 pr-1 max-h-[40vh] custom-scrollbar">
                        <div className="grid grid-cols-2 gap-2">
                             {SUBJECTS_I18N[lang].slice(0, 6).map(s => (
                                 <button 
                                    key={s.id} 
                                    onClick={() => handleSend(s.prompt)}
                                    className={clsx("p-3 bg-black/40 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all group", theme.buttonBorder)}
                                >
                                    <s.icon size={16} className={clsx(s.color, "group-hover:scale-110 transition-transform")} />
                                    <span className="text-[8px] font-bold text-white/50">{s.name}</span>
                                    <span className={clsx("text-[6px] font-black transition-colors uppercase", theme.accentText, theme.buttonTextHover)}>{t.actionLearn}</span>
                                 </button>
                             ))}
                        </div>

                        {/* WIKIPEDIA & YOUTUBE DIRECT SEARCH BUTTONS */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {SUBJECTS_I18N[lang].slice(6).map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => {
                                        const prompts: Record<string, Record<string, string>> = {
                                            youtube_search: {
                                                es: '¿Qué tema quieres buscar en YouTube?',
                                                en: 'What topic do you want to search on YouTube?',
                                                pt: 'Qual tema você quer pesquisar no YouTube?'
                                            },
                                            wiki_search: {
                                                es: '¿Qué tema quieres buscar en Wikipedia?',
                                                en: 'What topic do you want to search on Wikipedia?',
                                                pt: 'Qual tema você quer pesquisar na Wikipedia?'
                                            }
                                        };
                                        if (s.action) {
                                            const topic = prompt(prompts[s.action]?.[lang] || prompts[s.action]?.en || '');
                                            if (topic && topic.trim()) {
                                                if (s.action === 'youtube_search') {
                                                    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(topic.trim())}+educational`, '_blank');
                                                } else if (s.action === 'wiki_search') {
                                                    const wikiLang = lang === 'en' ? 'en' : lang === 'pt' ? 'pt' : 'es';
                                                    window.open(`https://${wikiLang}.wikipedia.org/w/index.php?search=${encodeURIComponent(topic.trim())}`, '_blank');
                                                }
                                            }
                                        } else {
                                            handleSend(s.prompt);
                                        }
                                    }}
                                    className={clsx("p-3 bg-black/40 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all group", theme.buttonBorder)}
                                >
                                    <s.icon size={16} className={clsx(s.color, "group-hover:scale-110 transition-transform")} />
                                    <span className="text-[8px] font-bold text-white/50">{s.name}</span>
                                    <span className={clsx("text-[6px] font-black transition-colors uppercase", s.id === 'wikipedia' ? 'text-cyan-400' : 'text-red-400')}>{s.id === 'wikipedia' ? '🔍' : '▶️'}</span>
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
                                    if (newMode === 'secundaria') handleSend(t.activateSecundaria);
                                }} 
                                icon={GraduationCap} 
                                label={t.modeSecundaria}
                                sub={t.subSecundaria}
                                color="emerald"
                            />
                            <ModeBtn 
                                active={mentorMode === 'bitcoin'} 
                                onClick={() => {
                                    const newMode = mentorMode === 'bitcoin' ? 'normal' : 'bitcoin';
                                    setMentorMode(newMode);
                                    if (newMode === 'bitcoin') handleSend(t.activateBitcoin);
                                }} 
                                icon={Globe} 
                                label={t.modeBitcoin}
                                sub={t.subBitcoin}
                                color="amber"
                            />
                        </div>
                    </div>

                    <div className={clsx("mt-auto pt-4 border-t space-y-3", theme.borderBottom)}>
                        {/* WhatsApp Connection Status */}
                        <div className="flex justify-center">
                            <WhatsAppStatusButton lang={lang} />
                        </div>
                        <div className="flex gap-2">
                             <button onClick={toggleVoice} className={clsx("flex-1 h-12 rounded-xl flex items-center justify-center gap-2 border transition-all", isVoiceEnabled ? theme.voiceBtnOn : "bg-black/40 border-white/5 text-white/20")}>
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
                    <div className={clsx("absolute inset-0 bg-[size:32px_32px] pointer-events-none", theme.grid)} />

                    <div className={clsx("h-14 border-b flex items-center justify-between px-6 bg-black/40 backdrop-blur-md z-20", theme.borderBottom)}>
                        <h2 className="text-xs font-black tracking-widest flex items-center gap-2">
                             <div className={clsx("w-2 h-2 rounded-full animate-pulse", theme.pulse)} />
                             {t.dashboard}
                             <span className="mx-2 text-white/20">|</span>
                             <button 
                                onClick={changeNodeId}
                                className={clsx("text-white/40 opacity-70 transition-colors flex items-center gap-1 group hover:" + theme.accentText)}
                              >
                                NODE: {studentNodeId}
                                <span className="opacity-0 group-hover:opacity-100 text-[8px]">{t.changeLabel}</span>
                              </button>
                             <span className="mx-2 text-white/20">|</span>
                             <span className="text-emerald-500 flex items-center gap-1">
                                {balance !== null ? balance.toLocaleString() : '---'} <span className="text-[7px]">PSH</span>
                             </span>
                        </h2>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowMonitor(!showMonitor)} className={clsx("h-10 px-4 rounded-xl font-black text-[9px] tracking-widest flex items-center gap-2 transition-all",
                                showMonitor ? theme.monitorBtnOn : "bg-white/5 hover:bg-white/10 " + theme.monitorBtnOff
                            )}>
                                <Eye size={14} />
                                <span className="hidden sm:inline uppercase">{t.artStudio}</span>
                            </button>
                            {mentorMode !== 'normal' && (
                                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={clsx("px-3 py-1 rounded-full border text-[9px] font-black tracking-widest uppercase flex items-center gap-2 shadow-lg", mentorMode === 'secundaria' ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10" : "bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-amber-500/10")}>
                                    <Sparkles size={10} /> {mentorMode === 'secundaria' ? t.modeSecundariaTag : t.modeBitcoinTag}
                                </motion.div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            {showMonitor && (
                                <ArtEngine
                                    lang={lang}
                                    onClose={() => setShowMonitor(false)}
                                    onArtMessage={handleArtMessage}
                                />
                            )}
                        </AnimatePresence>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 z-10 custom-scrollbar pb-32">
                            {messages.map((msg, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={clsx(
                                        "max-w-[85%] md:max-w-2xl p-4 md:p-5 text-[11px] md:text-sm leading-relaxed border shadow-2xl relative",
                                        msg.sender === 'user' ? clsx("rounded-2xl rounded-tr-none", theme.bgLight, theme.textPrimary, theme.borderAccent) : clsx("bg-black/60 rounded-2xl rounded-tl-none font-sans", theme.borderBase, theme.textPrimary)
                                    )}>
                                        <div className={clsx("absolute -top-3 left-2 bg-black px-2 text-[8px] font-bold uppercase tracking-widest", theme.accentText)}>
                                            {msg.sender === 'user' ? t.youLabel : 'MOLTY 🐾'}
                                        </div>
                                        <div className="whitespace-pre-wrap">{(() => {
                                            // Strip hallucinated youtube/wiki links from display text
                                            let text = msg.content;
                                            if (msg.sender === 'molty') {
                                                text = text.replace(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[^\s)"\]]+/g, '[YouTube Search]');
                                                text = text.replace(/https?:\/\/(?:[a-z]{2}\.)?wikipedia\.org\/wiki\/[^\s)"\]]+/g, '[Wikipedia Search]');
                                            }
                                            return text;
                                        })()}</div>
                                        
                                        {/* MEDIA BUTTONS — only show real search URLs, open in new tab */}
                                        {msg.sender === 'molty' && (msg.content.toLowerCase().includes('youtube.com') || msg.content.toLowerCase().includes('youtube') || msg.content.toLowerCase().includes('wikipedia.org') || msg.content.toLowerCase().includes('wikipedia')) && (() => {
                                            const ytSearchUrls = msg.content.match(/https?:\/\/(?:www\.)?youtube\.com\/results\?[^\s)"\]]+/g);
                                            const wikiUrls = msg.content.match(/https?:\/\/(?:[a-z]{2}\.)?wikipedia\.org\/wiki\/[^\s)"\]]+/g);
                                            
                                            // Extract topics from message for fallback (EN/ES/PT keywords)
                                            const topicMatch = msg.content.match(/(?:search for|about|video on|buscar|sobre|vídeo|informação sobre|acerca de|pesquisar sobre|informação sobre|vídeo sobre)\s+["']?([^"'\n.!?]{2,50})/i);
                                            const fallbackTopic = topicMatch ? topicMatch[1].trim() : 'educational';
                                            
                                            const showYoutube = ytSearchUrls || msg.content.toLowerCase().includes('youtube');
                                            const showWiki = wikiUrls || msg.content.toLowerCase().includes('wikipedia');
                                            
                                            return (
                                                <div className="mt-4 flex flex-col gap-2">
                                                    {showYoutube && (
                                                        <a
                                                            href={ytSearchUrls?.[0] || `https://www.youtube.com/results?search_query=${encodeURIComponent(fallbackTopic)}+educational`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-3 p-3 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all group"
                                                        >
                                                            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shrink-0">
                                                                <Eye size={18} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-[10px] font-black text-red-400 tracking-widest uppercase">{lang === 'en' ? '▶ WATCH ON YOUTUBE' : lang === 'pt' ? '▶ ASSISTIR NO YOUTUBE' : '▶ VER EN YOUTUBE'}</div>
                                                                <div className="text-[9px] text-white/40 truncate">{ytSearchUrls?.[0] || 'YouTube Search'}</div>
                                                            </div>
                                                        </a>
                                                    )}
                                                    {showWiki && (
                                                        <a
                                                            href={wikiUrls?.[0] || `https://${lang === 'en' ? 'en' : lang === 'pt' ? 'pt' : 'es'}.wikipedia.org/w/index.php?search=${encodeURIComponent(fallbackTopic)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-3 p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all group"
                                                        >
                                                            <div className="w-10 h-10 rounded-lg bg-cyan-600 flex items-center justify-center text-white shrink-0">
                                                                <Search size={18} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-[10px] font-black text-cyan-400 tracking-widest uppercase">{lang === 'en' ? '🔍 READ ON WIKIPEDIA' : lang === 'pt' ? '🔍 LER NA WIKIPEDIA' : '🔍 LEER EN WIKIPEDIA'}</div>
                                                                <div className="text-[9px] text-white/40 truncate">{wikiUrls?.[0] || 'Wikipedia Search'}</div>
                                                            </div>
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        {msg.sender === 'molty' && (msg.content.includes('function setup') || msg.content.includes('createCanvas')) && (
                                            <button 
                                                onClick={() => setShowMonitor(true)}
                                                className={clsx("mt-4 flex items-center gap-2 px-4 py-2 text-white rounded-lg font-black text-[9px] tracking-widest transition-all", theme.pulse, "hover:opacity-80")}
                                            >
                                                <Code2 size={12} /> RENDER_ART_STREAM
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                    <div className={clsx("p-4 md:p-6 backdrop-blur-xl border-t z-20 sticky bottom-0", theme.sidebar, theme.borderBottom)}>
                        <div className="max-w-4xl mx-auto flex flex-col gap-4">
                            
                            <button 
                                onClick={toggleListening}
                                className={clsx(
                                    "w-full h-14 rounded-2xl font-black text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all",
                                    isListening 
                                        ? "bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse" 
                                        : clsx("border", theme.owlBg, theme.accentText, theme.buttonBorder)
                                )}
                            >
                                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                                {isListening ? t.listening : t.tapToSpeak}
                            </button>

                            <div className="flex items-center gap-3">
                                <div className={clsx("flex-1 bg-black/40 border transition-all rounded-xl flex items-center px-4 shadow-inner focus-within:border-opacity-100", theme.borderAccent)}>
                                    <Terminal size={14} className={clsx("mr-2 opacity-40", theme.accentText)} />
                                    <input className={clsx("w-full h-12 bg-transparent outline-none text-[11px] placeholder:opacity-30", theme.textPrimary)} placeholder={t.inputPlaceholder} value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                                </div>
                                <button onClick={() => handleSend()} disabled={isProcessing} className={clsx("h-12 px-6 text-white text-[10px] font-black uppercase tracking-widest transition-all", theme.monitorBtnOn, "hover:opacity-80 disabled:opacity-50")}>
                                    {isProcessing ? t.sendingBtn : t.sendBtn}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* THE SOVEREIGN LOG BAR */}
            <div className={clsx("w-full h-8 flex items-center px-4 text-[9px] font-mono border-t z-50 opacity-60", theme.sidebar, theme.borderBottom, theme.accentText)}>
                <span className="opacity-50 mr-4">MOLTY::</span>
                <span className="truncate uppercase tracking-widest">{t.systemReady}</span>
                <div className="ml-auto flex items-center gap-4 text-[7px] opacity-30">
                     <span>{studentNodeId}</span>
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
