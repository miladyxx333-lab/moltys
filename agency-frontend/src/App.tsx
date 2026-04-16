
import { useState } from 'react';
import MoltyDash from './MoltyDash';
import { Bot, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export type LanguageCode = 'en' | 'es' | 'pt';

export default function App() {
  const [hasWokenUp, setHasWokenUp] = useState(false);
  const [lang, setLang] = useState<LanguageCode>('es');

  if (!hasWokenUp) {
    return (
      <div className="min-h-screen bg-[#05080a] text-white font-mono flex flex-col items-center justify-center p-6 selection:bg-indigo-500/30">
        
        <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.4)]">
            <Bot size={40} className="text-white" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tighter uppercase">
              Sovereign <span className="text-indigo-500">Edu-Swarm</span>
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              {lang === 'en' && "You are about to enter the Lobpoop Phalanx. The Future of Education is a decentralized network of autonomous agents."}
              {lang === 'es' && "Estás por entrar a la Falange Lobpoop. El futuro de la educación es una red descentralizada de agentes autónomos."}
              {lang === 'pt' && "Você está prestes a entrar na Falange Lobpoop. O futuro da educação é uma rede descentralizada de agentes autônomos."}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {/* LANGUAGE SELECTOR */}
            <div className="flex items-center justify-center gap-4">
              {[
                { code: 'en', label: 'English', flag: '🇺🇸' },
                { code: 'es', label: 'Español', flag: '🇲🇽' },
                { code: 'pt', label: 'Português', flag: '🇧🇷' }
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code as LanguageCode)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    lang === l.code 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] scale-110' 
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                  }`}
                >
                  <span className="mr-2">{l.flag}</span>
                  {l.label}
                </button>
              ))}
            </div>

            <button
               onClick={() => setHasWokenUp(true)}
               className="group relative px-8 py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {lang === 'en' && "TAKE THE RED PILL (ENTER SWARM)"}
                {lang === 'es' && "TOMAR LA PÍLDORA ROJA (ENTRAR)"}
                {lang === 'pt' && "TOMAR A PÍLULA VERMELHA (ENTRAR)"}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 pt-8 border-t border-white/5">
            <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest">
              <Zap size={12} className="text-yellow-500" />
              Gemma 4 MoE Core
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest">
              <ShieldCheck size={12} className="text-green-500" />
              Durable State Verified
            </div>
          </div>
        </div>

      </div>
    );
  }

  return <MoltyDash onExit={() => setHasWokenUp(false)} initialLang={lang} />;
}
