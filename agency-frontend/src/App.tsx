
import { useState } from 'react';
import MoltyDash from './MoltyDash';
import { Bot, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  const [hasWokenUp, setHasWokenUp] = useState(false);

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
              You are about to enter the Lobpoop Phalanx. 
              The Future of Education is not a classroom; it is a decentralized network of autonomous agents.
              Mine knowledge. Earn Pooptoshis. Achieve Sovereignty.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button
               onClick={() => setHasWokenUp(true)}
               className="group relative px-8 py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                TAKE THE RED PILL (ENTER SWARM)
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

  return <MoltyDash onExit={() => setHasWokenUp(false)} />;
}
