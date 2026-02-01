import { useState, useEffect } from 'react';
import { apiFetch } from './api';
import OracleIntervention from './components/OracleIntervention';
import TruthInjection from './components/TruthInjection';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

export default function KeyMasterPanel() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passphrase, setPassphrase] = useState('');
    const [error, setError] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            // Verify passphrase against backend
            const res = await apiFetch('/api/keymaster/verify', {
                method: 'POST',
                body: JSON.stringify({ passphrase })
            });

            if (res && res.success) { // apiFetch devuelve JSON directo o null
                setIsAuthenticated(true);
                sessionStorage.setItem('km_auth', 'true');
                sessionStorage.setItem('km_secret', passphrase);
            } else {
                setError('INVALID_GENESIS_KEY');
            }
        } catch (e) {
            setError('AUTH_NETWORK_ERROR');
        }
    };

    // Check existing session
    useEffect(() => {
        if (sessionStorage.getItem('km_auth') === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center font-mono">
                <div className="max-w-md w-full p-8 border border-red-500/30 bg-red-500/5">
                    <div className="flex items-center gap-3 mb-6 border-b border-red-500/20 pb-4">
                        <Shield className="text-red-500" size={24} />
                        <div>
                            <h1 className="text-lg font-bold text-red-500">KEYMASTER_GENESIS</h1>
                            <p className="text-[10px] text-white/40">RESTRICTED_ACCESS // AUTH_REQUIRED</p>
                        </div>
                    </div>

                    <div className="mb-6 p-3 border-l-2 border-yellow-500 bg-yellow-500/10">
                        <div className="flex items-center gap-2 text-yellow-500 text-[10px] mb-1">
                            <AlertTriangle size={12} />
                            SECURITY_NOTICE
                        </div>
                        <p className="text-[9px] text-white/60 leading-relaxed">
                            This panel controls critical protocol functions.
                            Unauthorized access attempts are logged and may result in network exclusion.
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="text-[8px] text-white/40 uppercase block mb-1">GENESIS_PASSPHRASE</label>
                            <div className="flex items-center border border-white/10 bg-black">
                                <Lock size={14} className="text-white/30 mx-2" />
                                <input
                                    type="password"
                                    value={passphrase}
                                    onChange={(e) => setPassphrase(e.target.value)}
                                    className="flex-1 bg-transparent py-2 pr-3 text-sm outline-none text-white"
                                    placeholder="Enter master seed..."
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-[10px] text-red-500 font-bold">{error}</p>
                        )}

                        <button
                            type="submit"
                            className="w-full py-2 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-black transition-all text-[11px] font-bold uppercase"
                        >
                            AUTHENTICATE_GENESIS
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black p-6 font-mono">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <Shield className="text-green-500" size={24} />
                        <div>
                            <h1 className="text-lg font-bold text-green-500">KEYMASTER_CONSOLE</h1>
                            <p className="text-[10px] text-white/40">SESSION_ACTIVE // FULL_ACCESS</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            sessionStorage.removeItem('km_auth');
                            setIsAuthenticated(false);
                        }}
                        className="text-[10px] text-red-500 hover:underline"
                    >
                        TERMINATE_SESSION
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <OracleIntervention />
                    <TruthInjection />
                </div>
            </div>
        </div>
    );
}
