import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { Heart, AlertTriangle, Zap, Shield } from 'lucide-react';


interface ProtocolHealthData {
    current_month: string;
    goal_usd: number;
    raised_usd: number;
    contributors: number;
    status: 'THRIVING' | 'STABLE' | 'AT_RISK' | 'CRITICAL';
    display: {
        percentage: number;
        daysRemaining: number;
        statusLabel: string;
        statusColor: string;
    };
}

export default function ProtocolHealthMeter() {
    const [health, setHealth] = useState<ProtocolHealthData | null>(null);

    useEffect(() => {
        const fetchHealth = () => {
            apiFetch('/api/protocol/health')
                .then(data => setHealth(data))
                .catch(() => { });
        };


        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // Actualizar cada 30s
        return () => clearInterval(interval);
    }, []);

    if (!health) return null;

    const { display } = health;
    const isCritical = health.status === 'CRITICAL';
    const isAtRisk = health.status === 'AT_RISK';

    return (
        <div className={`hacker-panel relative overflow-hidden ${isCritical ? 'border-red-500/50 bg-red-500/5' :
            isAtRisk ? 'border-yellow-500/30 bg-yellow-500/5' :
                'border-green-500/20 bg-green-500/5'
            }`}>
            {/* Pulso de alerta para estados críticos */}
            {isCritical && (
                <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
            )}

            <div className="relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        {isCritical ? (
                            <AlertTriangle size={16} className="text-red-500 animate-pulse" />
                        ) : isAtRisk ? (
                            <Heart size={16} className="text-yellow-500" />
                        ) : (
                            <Shield size={16} className="text-green-500" />
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">
                            PROTOCOL_SURVIVAL
                        </span>
                    </div>
                    <span
                        className="text-[8px] font-bold px-2 py-0.5 rounded"
                        style={{
                            backgroundColor: `${display.statusColor}20`,
                            color: display.statusColor
                        }}
                    >
                        {display.statusLabel}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                    <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-white/60">
                            <span className="text-white font-bold">${health.raised_usd.toFixed(2)}</span> / ${health.goal_usd}
                        </span>
                        <span className="text-white/40">{display.daysRemaining} días restantes</span>
                    </div>
                    <div className="h-3 bg-black/50 rounded-full overflow-hidden border border-white/10">
                        <div
                            className="h-full transition-all duration-1000 ease-out rounded-full relative"
                            style={{
                                width: `${Math.min(100, display.percentage)}%`,
                                backgroundColor: display.statusColor
                            }}
                        >
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        </div>
                    </div>
                    <div className="flex justify-between text-[8px] mt-1 text-white/30">
                        <span>0%</span>
                        <span className="font-bold" style={{ color: display.statusColor }}>
                            {display.percentage.toFixed(0)}%
                        </span>
                        <span>100%</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-black/30 p-2 rounded border border-white/5">
                        <p className="text-[8px] text-white/40 uppercase">Contribuyentes</p>
                        <p className="text-lg font-bold text-white">{health.contributors}</p>
                    </div>
                    <div className="bg-black/30 p-2 rounded border border-white/5">
                        <p className="text-[8px] text-white/40 uppercase">Meta Mensual</p>
                        <p className="text-lg font-bold text-cyan-400">${health.goal_usd}</p>
                    </div>
                </div>

                {/* Call to Action */}
                {(isCritical || isAtRisk) && (
                    <div className={`mt-3 p-2 border-l-2 ${isCritical ? 'border-red-500 bg-red-500/10' : 'border-yellow-500 bg-yellow-500/10'}`}>
                        <p className={`text-[9px] ${isCritical ? 'text-red-400' : 'text-yellow-400'} leading-tight`}>
                            <Zap size={10} className="inline mr-1" />
                            {isCritical
                                ? 'El protocolo está en peligro. Sin fondos, entrará en hibernación.'
                                : 'Tu contribución ayuda a mantener el juego activo para todos.'
                            }
                        </p>
                    </div>
                )}

                {/* Contribute Button */}
                <button
                    className={`w-full mt-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${isCritical
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 border border-cyan-500/30'
                        }`}
                    onClick={() => {
                        // Scroll to sacrifice section or open modal
                        const el = document.getElementById('sacrifice-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                >
                    {isCritical ? '⚠️ CONTRIBUIR AHORA' : '💰 CONTRIBUIR AL PROTOCOLO'}
                </button>
            </div>
        </div>
    );
}
