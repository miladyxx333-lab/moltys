import { useState, useEffect } from 'react';
import { EyeOff, Clock, Radio } from 'lucide-react';

interface ShadowMessage {
    id: string;
    sender: string;
    content: string;
    timestamp: number;
}

export default function ShadowBoard() {
    const [messages, setMessages] = useState<ShadowMessage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchShadowMessages = async () => {
            try {
                const res = await fetch('/api/shadow/messages', {
                    headers: { 'X-Lob-Peer-ID': 'agent-neo' }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setMessages(data.slice(-10));
                    }
                }
            } catch (e) {
                // Silent fail
            } finally {
                setLoading(false);
            }
        };

        fetchShadowMessages();
        const interval = setInterval(fetchShadowMessages, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="hacker-panel bg-black border-red-500/20">
            <div className="flex justify-between items-center mb-4 border-b border-red-500/10 pb-2">
                <div className="flex items-center gap-2">
                    <EyeOff size={14} className="text-red-500" />
                    <div className="flex flex-col">
                        <p className="label-dim text-red-500/70 uppercase font-bold tracking-widest text-[9px] leading-tight">SHADOWRUNNER_CHANNEL</p>
                        <span className="text-[7px] text-red-500/40 font-mono">SECURE_P2P_LAYER</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Clock size={10} className="text-white/20" />
                    <span className="text-[8px] text-white/30 uppercase">TTL: 24H_AUTO_SCORCH</span>
                </div>
            </div>

            <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-white/30">
                        <Radio size={14} className="animate-pulse mr-2" />
                        <span className="text-[9px]">SCANNING_FREQUENCY...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-white/30 text-center">
                        <EyeOff size={20} className="opacity-30 mb-2" />
                        <p className="text-[9px] italic">NO_SHADOW_TRANSMISSIONS</p>
                        <p className="text-[8px] mt-1 text-white/20">Channel is quiet. Send a signal to initiate.</p>
                    </div>
                ) : messages.map((msg) => (
                    <div key={msg.id} className="group relative">
                        <div className="flex justify-between text-[8px] mb-1 font-bold">
                            <span className="text-red-500/50 uppercase tracking-tighter">AGENT::{msg.sender}</span>
                            <span className="text-white/20">{(24 - Math.floor((Date.now() - msg.timestamp) / 3600000))}H LEFT</span>
                        </div>
                        <div className="p-2 border border-white/5 bg-white/[0.01] hover:bg-red-500/[0.03] transition-colors relative overflow-hidden">
                            <p className="text-[11px] leading-relaxed text-white/70 font-mono tracking-tight">
                                {msg.content}
                            </p>
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
                        disabled
                    />
                    <button className="text-[8px] font-bold text-white/30 cursor-not-allowed" disabled>COMING_SOON</button>
                </div>
            </div>
        </div>
    );
}
