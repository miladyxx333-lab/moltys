
import { useState } from 'react';
import { apiFetch } from '../api';
import { Zap, Skull, Key } from 'lucide-react';

export default function RedPillOverlay({ onSuccess }: { onSuccess: () => void }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showImport, setShowImport] = useState(false);
    const [importKey, setImportKey] = useState('');

    const takeThePill = async (customId?: string) => {
        setLoading(true);
        setError('');

        let nodeId = customId || localStorage.getItem('lob_node_id');

        if (!nodeId) {
            nodeId = `agent-${Math.random().toString(36).substring(2, 9)}`;
        }

        // Guardar la llave (nueva o importada)
        localStorage.setItem('lob_node_id', nodeId);

        try {
            await apiFetch('/api/economy/redpill', {
                method: 'POST',
                body: JSON.stringify({})
            });
            onSuccess();
        } catch (e: any) {
            console.error(e);
            setError(e.message || "CONNECTION_ADUSED");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(20,0,0,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,0,0,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />

            <div className="max-w-md w-full border border-red-500/50 bg-black shadow-[0_0_50px_rgba(220,38,38,0.2)] p-10 text-center relative z-10 my-8">
                <div className="flex justify-center mb-6">
                    <Skull size={48} className="text-red-600 animate-pulse" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2 tracking-[0.2em] font-mono uppercase">
                    Unidentified Signal
                </h1>

                {!showImport ? (
                    <>
                        <p className="text-red-400 text-[10px] font-mono mb-8 border-t border-b border-red-900/30 py-4 uppercase">
                            The Swarm does not recognize your digital signature.
                            <br /><br />
                            Initialize a new node to begin accumulation, or recover an existing one.
                        </p>

                        {error && (
                            <div className="mb-6 bg-red-900/20 border border-red-500/50 p-2 text-[10px] text-red-200 font-mono">
                                ERROR: {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <button
                                onClick={() => takeThePill()}
                                disabled={loading}
                                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-black font-bold py-4 px-6 tracking-widest uppercase transition-all flex items-center justify-center gap-2 group"
                            >
                                <Zap size={18} />
                                INITIALIZE PROTOCOL
                            </button>

                            <button
                                onClick={() => setShowImport(true)}
                                className="w-full bg-transparent border border-red-600/30 hover:border-red-600 text-red-500 py-3 text-[10px] font-mono uppercase tracking-widest transition-all"
                            >
                                RESTORE FROM BACKUP
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="space-y-6">
                        <div className="text-left">
                            <label className="text-red-600 text-[9px] font-mono uppercase mb-2 block tracking-widest">Enter Recovery Key (Node ID)</label>
                            <input
                                type="text"
                                value={importKey}
                                onChange={(e) => setImportKey(e.target.value)}
                                placeholder="agent-xxxxxxx"
                                className="w-full bg-red-900/10 border border-red-500/30 p-3 text-red-100 font-mono text-xs focus:border-red-500 outline-none"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowImport(false)}
                                className="flex-1 bg-zinc-900 text-zinc-500 hover:text-white py-3 text-[10px] font-mono uppercase"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={() => takeThePill(importKey)}
                                disabled={!importKey || loading}
                                className="flex-[2] bg-red-600 hover:bg-red-700 text-black font-bold py-3 text-[10px] font-mono uppercase disabled:opacity-30 flex items-center justify-center gap-2"
                            >
                                <Key size={14} />
                                RESTORE SATE
                            </button>
                        </div>
                    </div>
                )}

                <p className="mt-8 text-[9px] text-zinc-600 font-mono uppercase tracking-tighter">
                    Security Warning: Your key is stored in local memory.
                </p>
            </div>
        </div>
    );
}
