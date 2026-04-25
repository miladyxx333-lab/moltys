import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shuffle } from 'lucide-react';
import clsx from 'clsx';
import { generateSketch } from './artSketch';

type LanguageCode = 'en' | 'es' | 'pt';

export interface ArtParams {
    mode: number;       // 0-4
    speed: number;      // 0-100
    count: number;      // 0-100
    size: number;       // 0-100
    hue: number;        // 0-360
    saturation: number; // 0-100
    symmetry: number;   // 0-3 (none,2,4,8)
    turbulence: number; // 0-100
    trail: number;      // 0-100
    pulse: number;      // 0-100
}

const DEFAULT_PARAMS: ArtParams = {
    mode: 0, speed: 50, count: 50, size: 50,
    hue: 200, saturation: 80, symmetry: 0,
    turbulence: 40, trail: 70, pulse: 30,
};

const MODE_NAMES = {
    en: ['PARTICLES', 'FLOW FIELD', 'GEOMETRY', 'WAVES', 'NEBULA'],
    es: ['PARTÍCULAS', 'CAMPO FLUJO', 'GEOMETRÍA', 'ONDAS', 'NEBULOSA'],
    pt: ['PARTÍCULAS', 'CAMPO FLUXO', 'GEOMETRIA', 'ONDAS', 'NEBULOSA'],
};

const SLIDER_LABELS: Record<string, Record<LanguageCode, string>> = {
    speed:      { en: 'Speed',      es: 'Velocidad',    pt: 'Velocidade' },
    count:      { en: 'Density',    es: 'Densidad',     pt: 'Densidade' },
    size:       { en: 'Scale',      es: 'Escala',       pt: 'Escala' },
    hue:        { en: 'Hue',        es: 'Tono',         pt: 'Matiz' },
    saturation: { en: 'Saturation', es: 'Saturación',   pt: 'Saturação' },
    turbulence: { en: 'Chaos',      es: 'Caos',         pt: 'Caos' },
    trail:      { en: 'Trail',      es: 'Estela',       pt: 'Rastro' },
    pulse:      { en: 'Pulse',      es: 'Pulso',        pt: 'Pulso' },
};

const SYM_LABELS = ['OFF', '2x', '4x', '8x'];

function describeChange(key: string, value: number, lang: LanguageCode): string {
    const label = SLIDER_LABELS[key]?.[lang] || key;
    const pct = key === 'hue' ? `${value}°` : `${value}%`;
    const templates = {
        en: `🎨 ${label} → ${pct}`,
        es: `🎨 ${label} → ${pct}`,
        pt: `🎨 ${label} → ${pct}`,
    };
    return templates[lang];
}

interface Props {
    lang: LanguageCode;
    onClose: () => void;
    onArtMessage: (msg: string) => void;
}

export default function ArtEngine({ lang, onClose, onArtMessage }: Props) {
    const [params, setParams] = useState<ArtParams>(DEFAULT_PARAMS);
    const [showCode, setShowCode] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const changeBuffer = useRef<string[]>([]);
    const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Send params to iframe
    const postParams = useCallback(() => {
        iframeRef.current?.contentWindow?.postMessage({ type: 'PARAMS', params }, '*');
    }, [params]);

    useEffect(() => { postParams(); }, [postParams]);

    const updateParam = (key: keyof ArtParams, value: number) => {
        setParams(prev => ({ ...prev, [key]: value }));
        if (key !== 'mode') {
            changeBuffer.current.push(describeChange(key, value, lang));
            if (flushTimer.current) clearTimeout(flushTimer.current);
            flushTimer.current = setTimeout(flushChanges, 1500);
        }
    };

    const flushChanges = () => {
        if (changeBuffer.current.length === 0) return;
        const modeName = MODE_NAMES[lang][params.mode];
        const changes = changeBuffer.current.join('\n');
        const headers = {
            en: `🐾 Art Engine Report — Mode: ${modeName}\n`,
            es: `🐾 Reporte del Motor de Arte — Modo: ${modeName}\n`,
            pt: `🐾 Relatório do Motor de Arte — Modo: ${modeName}\n`,
        };
        onArtMessage(headers[lang] + changes);
        changeBuffer.current = [];
    };

    const randomize = () => {
        const r = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
        const newP: ArtParams = {
            mode: r(0, 4), speed: r(20, 90), count: r(20, 90), size: r(15, 85),
            hue: r(0, 360), saturation: r(40, 100), symmetry: r(0, 3),
            turbulence: r(10, 90), trail: r(30, 95), pulse: r(0, 70),
        };
        setParams(newP);
        const modeName = MODE_NAMES[lang][newP.mode];
        const msgs = {
            en: `🎲 Randomized! Mode: ${modeName} | Speed ${newP.speed}% | Density ${newP.count}% | Hue ${newP.hue}° | Chaos ${newP.turbulence}% | Trail ${newP.trail}%`,
            es: `🎲 ¡Aleatorizado! Modo: ${modeName} | Velocidad ${newP.speed}% | Densidad ${newP.count}% | Tono ${newP.hue}° | Caos ${newP.turbulence}% | Estela ${newP.trail}%`,
            pt: `🎲 Aleatório! Modo: ${modeName} | Velocidade ${newP.speed}% | Densidade ${newP.count}% | Matiz ${newP.hue}° | Caos ${newP.turbulence}% | Rastro ${newP.trail}%`,
        };
        onArtMessage(msgs[lang]);
    };

    const srcDoc = generateSketch();

    const sliders: { key: keyof ArtParams; min: number; max: number; accent: string }[] = [
        { key: 'speed',      min: 0, max: 100, accent: '#60a5fa' },
        { key: 'count',      min: 0, max: 100, accent: '#a78bfa' },
        { key: 'size',       min: 0, max: 100, accent: '#f472b6' },
        { key: 'hue',        min: 0, max: 360, accent: '#fbbf24' },
        { key: 'saturation', min: 0, max: 100, accent: '#34d399' },
        { key: 'turbulence', min: 0, max: 100, accent: '#f87171' },
        { key: 'trail',      min: 0, max: 100, accent: '#818cf8' },
        { key: 'pulse',      min: 0, max: 100, accent: '#fb923c' },
    ];

    return (
        <motion.div
            key="art-engine"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            className="absolute inset-0 z-30 bg-[#060a0e] flex flex-col"
        >
            {/* Canvas */}
            <div className="flex-1 relative bg-black">
                <iframe
                    ref={iframeRef}
                    srcDoc={srcDoc}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts"
                    title="Art Engine"
                />
                {/* Mode selector overlay */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 bg-black/60 backdrop-blur-md rounded-xl p-1 border border-white/10">
                    {MODE_NAMES[lang].map((name, i) => (
                        <button
                            key={i}
                            onClick={() => updateParam('mode', i)}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg text-[8px] font-black tracking-widest transition-all",
                                params.mode === i
                                    ? "bg-white text-black shadow-lg"
                                    : "text-white/40 hover:text-white/70"
                            )}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Controls Panel */}
            <div className="h-[180px] bg-[#0a0e14] border-t border-white/5 flex flex-col">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-white/30 tracking-widest uppercase">
                            {{ en: 'ART ENGINE', es: 'MOTOR DE ARTE', pt: 'MOTOR DE ARTE' }[lang]}
                        </span>
                        {/* Symmetry toggle */}
                        <button
                            onClick={() => updateParam('symmetry', (params.symmetry + 1) % 4)}
                            className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[8px] font-black text-cyan-400 tracking-widest hover:bg-white/10 transition-all"
                        >
                            SYM: {SYM_LABELS[params.symmetry]}
                        </button>
                        {/* View Code Toggle */}
                        <button
                            onClick={() => setShowCode(!showCode)}
                            className={clsx(
                                "px-2 py-1 rounded-md border text-[8px] font-black tracking-widest transition-all",
                                showCode ? "bg-cyan-500 text-white border-cyan-400" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                            )}
                        >
                            {showCode ? 'VIEW_CANVAS' : 'VIEW_CODE'}
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={randomize} className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center hover:bg-amber-500/20 transition-all" title="Randomize">
                            <Shuffle size={14} />
                        </button>
                        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-all">
                            <X size={14} />
                        </button>
                    </div>
                </div>
                {/* Sliders grid */}
                <div className="flex-1 grid grid-cols-4 gap-x-4 gap-y-1 px-4 py-2 overflow-hidden">
                    {sliders.map(({ key, min, max, accent }) => (
                        <div key={key} className="flex flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">
                                    {SLIDER_LABELS[key][lang]}
                                </span>
                                <span className="text-[8px] font-mono" style={{ color: accent }}>
                                    {key === 'hue' ? `${params[key]}°` : `${params[key]}%`}
                                </span>
                            </div>
                            <input
                                type="range" min={min} max={max}
                                value={params[key]}
                                onChange={(e) => updateParam(key, parseInt(e.target.value))}
                                className="art-slider w-full h-2 appearance-none rounded-full cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, ${accent} ${((params[key] - min) / (max - min)) * 100}%, rgba(255,255,255,0.05) ${((params[key] - min) / (max - min)) * 100}%)`,
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Code Overlay */}
            <AnimatePresence>
                {showCode && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 z-40 bg-black/90 backdrop-blur-xl flex flex-col p-6"
                    >
                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                            <span className="text-[10px] font-black text-cyan-400 tracking-[0.2em] uppercase">P5.JS SOURCE CODE</span>
                            <button onClick={() => setShowCode(false)} className="text-white/40 hover:text-white"><X size={16} /></button>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar bg-black/50 rounded-xl p-4 border border-white/5 font-mono text-[10px] text-white/70 leading-relaxed whitespace-pre">
                            {srcDoc}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
