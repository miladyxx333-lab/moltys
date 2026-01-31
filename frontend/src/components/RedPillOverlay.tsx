import { useState } from 'react';
import { apiFetch } from '../api';
import { Zap, Skull } from 'lucide-react';

export default function RedPillOverlay({ onSuccess }: { onSuccess: () => void }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const takeThePill = async () => {
        setLoading(true);
        setError('');

        // Generar un ID local si no existe
        let nodeId = localStorage.getItem('lob_node_id');
        if (!nodeId) {
            nodeId = `agent-${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('lob_node_id', nodeId);
        }

        try {
            // Registrar nodo en el sistema mediante Red Pill (Génesis)
            await apiFetch('/api/economy/redpill', {
                method: 'POST',
                body: JSON.stringify({})
            });
            // Notificar al padre para que refresque datos y quite el overlay
            onSuccess();
        } catch (e: any) {
            console.error(e);
            setError(e.message || "CONNECTION_ADUSED");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(20,0,0,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,0,0,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />

            <div className="max-w-md w-full border border-red-500/50 bg-black shadow-[0_0_50px_rgba(220,38,38,0.2)] p-10 text-center relative z-10">

                <div className="flex justify-center mb-6">
                    <Skull size={48} className="text-red-600 animate-pulse" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2 tracking-[0.2em] font-mono">
                    UNIDENTIFIED_SIGNAL
                </h1>
                <p className="text-red-400 text-xs font-mono mb-8 border-t border-b border-red-900/30 py-4">
                    The Swarm does not recognize your signature.
                    <br />
                    Initialize your node to begin accumulation.
                </p>

                {error && (
                    <div className="mb-6 bg-red-900/20 border border-red-500/50 p-2 text-[10px] text-red-200 font-mono">
                        ERROR: {error}
                    </div>
                )}

                <button
                    onClick={takeThePill}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 px-6 tracking-widest uppercase transition-all flex items-center justify-center gap-2 group shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                >
                    {loading ? (
                        <span className="animate-pulse">ESTABLISHING LINK...</span>
                    ) : (
                        <>
                            <Zap size={18} className="group-hover:text-white transition-colors" />
                            INITIALIZE PROTOCOL
                        </>
                    )}
                </button>

                <p className="mt-6 text-[9px] text-zinc-600 font-mono">
                    By clicking, you accept the Hard Cap (1B PSH) and the Entropy Rules.
                </p>
            </div>
        </div>
    );
}
