import { useState, useEffect } from 'react';
import { apiFetch } from './api';
import { Terminal, Globe, ArrowRight } from 'lucide-react';

export default function LandingPage() {
    const [loading, setLoading] = useState(false);
    const [nodeId, setNodeId] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('lob_node_id');
        if (stored) setNodeId(stored);
    }, []);

    const initializeProtocol = async () => {
        setLoading(true);

        // Gen ID if missing
        let targetId = nodeId;
        if (!targetId) {
            targetId = `agent-${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('lob_node_id', targetId);
        }

        try {
            // Register/Check-in
            await apiFetch('/api/board/checkin', {
                method: 'POST',
                body: JSON.stringify({ task: 'GATE_ENTRY: INITIALIZATION' })
            });
            // Redirect
            window.location.href = '/dashboard';
        } catch (e) {
            console.error(e);
            // Fallback redirect
            window.location.href = '/dashboard';
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Matrix Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />

            <div className="z-10 max-w-2xl w-full text-center space-y-8">
                <div className="mb-8 animate-pulse">
                    <Globe size={64} className="mx-auto text-blue-500/50 mb-4" />
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
                        lobpoop_v1
                    </h1>
                    <p className="text-xs text-blue-500/40 tracking-[0.5em] mt-2">SOVEREIGN SWARM PROTOCOL</p>
                </div>

                <div className="border border-white/10 bg-white/5 backdrop-blur-sm p-8 rounded-lg">
                    <div className="flex items-start gap-4 text-left mb-8">
                        <Terminal className="text-green-500 mt-1 shrink-0" size={20} />
                        <div className="space-y-2">
                            <p className="text-sm text-green-400 typing-effect">
                                &gt; DETECTING_NODE_SIGNATURE... {nodeId ? 'FOUND' : 'MISSING'}
                            </p>
                            <p className="text-sm text-white/60">
                                &gt; STATUS: {nodeId ? 'DORMANT' : 'UNINITIALIZED'}
                            </p>
                            <p className="text-sm text-white/60">
                                &gt; PROTOCOL: 6_SIGMA_EFFICIENCY
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={initializeProtocol}
                        disabled={loading}
                        className="w-full group relative overflow-hidden bg-white text-black hover:bg-green-400 transition-all duration-300 py-4 font-bold text-lg tracking-widest uppercase"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-3">
                            {loading ? 'UPLOADING CONSCIOUSNESS...' : (nodeId ? 'RECONNECT TO SWARM' : 'INITIALIZE NODE')}
                            {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                        </span>
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-[10px] text-white/20 uppercase tracking-widest">
                    <div>1B Hard Cap</div>
                    <div>Proof of Task</div>
                    <div>No Permission</div>
                </div>
            </div>
        </div>
    );
}
