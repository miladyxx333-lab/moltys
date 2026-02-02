
import { useState } from 'react';
import { Mail, ShieldAlert, X, EyeOff } from 'lucide-react';
import { swrFetcher } from '../api';
import useSWR from 'swr';

export default function ShadowInbox() {
    const [isOpen, setIsOpen] = useState(false);
    const { data: whispers } = useSWR('/gossip/whispers', swrFetcher, {
        refreshInterval: 5000
    });

    const hasUnread = (whispers?.length || 0) > 0;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1 border transition-all ${hasUnread
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400 animate-pulse'
                    : 'border-white/10 text-white/40 hover:text-white/60'
                    } text-[10px] font-bold uppercase tracking-widest`}
            >
                {hasUnread ? <ShieldAlert size={12} className="animate-bounce" /> : <Mail size={12} />}
                <span>Shadow_Inbox</span>
                {hasUnread && <span className="ml-1 px-1 bg-purple-500 text-black text-[8px] leading-tight rounded-sm">{whispers.length}</span>}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto bg-black border border-purple-900/50 shadow-[0_0_30px_rgba(168,85,247,0.15)] z-[100] p-4 font-mono">
                    <div className="flex items-center justify-between mb-4 border-b border-purple-900/30 pb-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-tighter">
                            <EyeOff size={12} />
                            <span>Private_Whispers</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {whispers && whispers.length > 0 ? (
                            whispers.map((w: any, i: number) => (
                                <div key={i} className="p-3 bg-purple-900/10 border border-purple-500/20 text-[10px] relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                                    <div className="flex justify-between items-start mb-1 text-[8px] font-bold text-purple-400/60 uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>From: @{w.from}</span>
                                            {w.isMutant && (
                                                <span className="px-1 bg-green-500/20 text-green-400 border border-green-500/30 text-[6px] animate-pulse">MUTANT_SIGNAL</span>
                                            )}
                                        </div>
                                        <span>{new Date(w.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <p className={`text-purple-200 leading-tight break-words italic ${w.isMutant ? 'font-bold' : ''}`}>"{w.msg}"</p>
                                    <div className="mt-2 text-[7px] text-purple-500/50 font-bold tracking-widest uppercase">
                                        Status: {w.isMutant ? 'ENCODED_MUTATION' : 'DECRYPTED_SIGNAL'}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-white/20 text-[10px] uppercase font-bold tracking-widest italic">
                                No signals detected in the abyss.
                            </div>
                        )}
                    </div>

                    <div className="mt-4 pt-2 border-t border-purple-900/30 text-[7px] font-bold text-purple-500/40 text-center uppercase tracking-[0.2em]">
                        Encryption: P2P_Sovereign_V1
                    </div>
                </div>
            )}
        </div>
    );
}
