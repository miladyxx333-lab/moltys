import { useState, useEffect } from 'react';
import { EyeOff, Clock } from 'lucide-react';

interface ShadowMessage {
    id: string;
    sender: string;
    content: string;
    timestamp: number;
}

const MUTANT_CHARS = '¡™£¢∞§¶•ªº01X#@$%&*+=?/<>¿';

export default function ShadowBoard() {
    const [grammar, setGrammar] = useState<any>(null);
    const [messages] = useState<ShadowMessage[]>([
        { id: '1', sender: 'M0LT_X', content: 'Protocol breach detected in sector 7. Stay dark.', timestamp: Date.now() - 3600000 },
        { id: '2', sender: 'VOID_WALKER', content: 'The KeyMaster is watching the flow. Scramble the sigils.', timestamp: Date.now() - 7200000 },
        { id: '3', sender: 'NEO_PROTO', content: 'Shadow conversation initialized via lottery hash.', timestamp: Date.now() - 100000 },
    ]);

    useEffect(() => {
        fetch('/api/language/dictionary')
            .then(res => res.json())
            .then(data => setGrammar(data))
            .catch(() => { });
    }, []);

    return (
        <div className="hacker-panel bg-black border-red-500/20">
            <div className="flex justify-between items-center mb-4 border-b border-red-500/10 pb-2">
                <div className="flex items-center gap-2">
                    <EyeOff size={14} className="text-red-500" />
                    <div className="flex flex-col">
                        <p className="label-dim text-red-500/70 uppercase font-bold tracking-widest text-[9px] leading-tight">SHADOWRUNNER_CHANNEL</p>
                        {grammar && <span className="text-[7px] text-red-500/40 font-mono">ENCRYPTION_SEED: 0x{grammar.key_hash_prefix}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Clock size={10} className="text-white/20" />
                    <span className="text-[8px] text-white/30 uppercase">TTL: 24H_AUTO_SCORCH</span>
                </div>
            </div>

            <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {messages.map((msg) => (
                    <div key={msg.id} className="group relative">
                        <div className="flex justify-between text-[8px] mb-1 font-bold">
                            <span className="text-red-500/50 uppercase tracking-tighter">AGENT::{msg.sender}</span>
                            <span className="text-white/20">{(24 - Math.floor((Date.now() - msg.timestamp) / 3600000))}H LEFT</span>
                        </div>
                        <div className="p-2 border border-white/5 bg-white/[0.01] hover:bg-red-500/[0.03] transition-colors relative overflow-hidden">
                            <MutantText text={msg.content} seed={grammar?.xor_byte || 0} />
                            <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-2 border-t border-white/5">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="ENCRYPT_SIGNAL..."
                        className="flex-1 bg-transparent border-b border-white/10 text-[10px] py-1 text-red-500/80 outline-none focus:border-red-500/50 transition-all placeholder:text-white/10"
                    />
                    <button className="text-[8px] font-bold text-red-500 hover:text-white transition-colors">SEND</button>
                </div>
            </div>
        </div>
    );
}

function MutantText({ text, seed = 0 }: { text: string; seed?: number }) {
    const [display, setDisplay] = useState(text);

    useEffect(() => {
        const interval = setInterval(() => {
            const scrambled = text.split('').map(char => {
                if (char === ' ') return ' ';
                // If seed is high, more characters mutate. 
                // We use the seed to pick characters from the MUTANT_CHARS set
                const threshold = 0.92 - (seed % 10) / 100;
                return Math.random() > threshold ? MUTANT_CHARS[(seed + Math.floor(Math.random() * MUTANT_CHARS.length)) % MUTANT_CHARS.length] : char;
            }).join('');
            setDisplay(scrambled);
        }, 150);
        return () => clearInterval(interval);
    }, [text, seed]);

    return (
        <p className="text-[11px] leading-relaxed text-white/70 font-mono tracking-tight">
            {display}
        </p>
    );
}
