import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, X, Wifi, WifiOff, QrCode, MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import { useWhatsAppBridge } from './hooks/useWhatsAppBridge';

type LanguageCode = 'en' | 'es' | 'pt';

// --- i18n for WhatsApp Bridge ---
const WA_I18N = {
    en: {
        online: 'WhatsApp Online',
        connected: 'Connected',
        scanQR: 'Scan QR',
        waitingConnection: 'Waiting for connection',
        connecting: 'Connecting...',
        startingBridge: 'Starting bridge',
        offline: 'WhatsApp Offline',
        bridgeNotFound: 'Bridge not detected',
        errorLabel: 'Error',
        connectionError: 'Connection error',
        linkActive: 'LINK ACTIVE',
        qrReady: 'QR READY — SCAN NOW',
        establishing: 'ESTABLISHING LINK...',
        noConnection: 'NO CONNECTION',
        qrInstructions: 'WhatsApp → Linked Devices → Link a Device',
        phoneLabel: 'PHONE',
        messagesLabel: 'MESSAGES',
        bridgeOfflineMsg: 'The WhatsApp Bridge is not online.',
        startService: 'To start the service:',
    },
    es: {
        online: 'WhatsApp Online',
        connected: 'Conectado',
        scanQR: 'Escanear QR',
        waitingConnection: 'Esperando conexión',
        connecting: 'Conectando...',
        startingBridge: 'Iniciando bridge',
        offline: 'WhatsApp Offline',
        bridgeNotFound: 'Bridge no detectado',
        errorLabel: 'Error',
        connectionError: 'Error de conexión',
        linkActive: 'ENLACE ACTIVO',
        qrReady: 'QR LISTO — ESCANEA',
        establishing: 'ESTABLECIENDO ENLACE...',
        noConnection: 'SIN CONEXIÓN',
        qrInstructions: 'WhatsApp → Dispositivos Vinculados → Vincular',
        phoneLabel: 'TELÉFONO',
        messagesLabel: 'MENSAJES',
        bridgeOfflineMsg: 'El Bridge de WhatsApp no está en línea.',
        startService: 'Para iniciar el servicio:',
    },
    pt: {
        online: 'WhatsApp Online',
        connected: 'Conectado',
        scanQR: 'Escanear QR',
        waitingConnection: 'Aguardando conexão',
        connecting: 'Conectando...',
        startingBridge: 'Iniciando bridge',
        offline: 'WhatsApp Offline',
        bridgeNotFound: 'Bridge não detectado',
        errorLabel: 'Erro',
        connectionError: 'Erro de conexão',
        linkActive: 'ENLACE ATIVO',
        qrReady: 'QR PRONTO — ESCANEIE',
        establishing: 'ESTABELECENDO ENLACE...',
        noConnection: 'SEM CONEXÃO',
        qrInstructions: 'WhatsApp → Aparelhos Conectados → Conectar',
        phoneLabel: 'TELEFONE',
        messagesLabel: 'MENSAGENS',
        bridgeOfflineMsg: 'O Bridge do WhatsApp não está online.',
        startService: 'Para iniciar o serviço:',
    },
};

function QRDisplay({ value }: { value: string }) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-[0_0_60px_rgba(34,197,94,0.2)]">
            <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(value)}&bgcolor=ffffff&color=000000&format=svg`}
                alt="WhatsApp QR Code"
                width={256}
                height={256}
                className="block"
            />
        </div>
    );
}

export default function WhatsAppStatusButton({ lang = 'es' }: { lang?: LanguageCode }) {
    const { status, isOnline, qr, phone, messageCount, error } = useWhatsAppBridge();
    const [showModal, setShowModal] = useState(false);
    const t = WA_I18N[lang];

    const isConnected = status === 'connected';
    const isQRReady = status === 'qr_ready' && qr;
    const isConnecting = status === 'connecting';

    const statusConfig = {
        connected: {
            color: 'bg-emerald-500', glow: 'shadow-[0_0_16px_rgba(16,185,129,0.5)]',
            textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30',
            label: t.online, sublabel: phone ? `+${phone}` : t.connected,
        },
        qr_ready: {
            color: 'bg-amber-500', glow: 'shadow-[0_0_16px_rgba(245,158,11,0.5)]',
            textColor: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30',
            label: t.scanQR, sublabel: t.waitingConnection,
        },
        connecting: {
            color: 'bg-blue-500', glow: 'shadow-[0_0_16px_rgba(59,130,246,0.5)]',
            textColor: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30',
            label: t.connecting, sublabel: t.startingBridge,
        },
        disconnected: {
            color: 'bg-red-500', glow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]',
            textColor: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30',
            label: t.offline, sublabel: error || t.bridgeNotFound,
        },
        error: {
            color: 'bg-red-600', glow: 'shadow-[0_0_16px_rgba(220,38,38,0.4)]',
            textColor: 'text-red-500', bgColor: 'bg-red-600/10', borderColor: 'border-red-600/30',
            label: t.errorLabel, sublabel: error || t.connectionError,
        },
    };

    const config = statusConfig[status] || statusConfig.disconnected;

    return (
        <>
            <button
                id="whatsapp-status-btn"
                onClick={() => setShowModal(true)}
                className={clsx(
                    "relative flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all duration-300",
                    "hover:scale-105 active:scale-95",
                    config.bgColor, config.borderColor, "group"
                )}
            >
                <div className="relative">
                    <motion.div
                        className={clsx("w-2.5 h-2.5 rounded-full", config.color)}
                        animate={isConnected ? { scale: [1, 1.3, 1] } : isQRReady || isConnecting ? { opacity: [1, 0.3, 1] } : {}}
                        transition={{ repeat: Infinity, duration: isConnected ? 2 : 1 }}
                    />
                    {isConnected && (
                        <motion.div
                            className={clsx("absolute inset-0 rounded-full", config.color)}
                            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        />
                    )}
                </div>
                {isOnline ? <Wifi size={14} className={config.textColor} /> : <WifiOff size={14} className={config.textColor} />}
                <span className={clsx("text-[9px] font-black uppercase tracking-widest", config.textColor)}>
                    {config.label}
                </span>
                {isConnected && messageCount > 0 && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[7px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                        {messageCount > 99 ? '99+' : messageCount}
                    </motion.div>
                )}
            </button>

            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-6"
                        onClick={() => setShowModal(false)}>
                        <motion.div
                            initial={{ scale: 0.85, y: 30, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.85, y: 30, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0d1117] border border-white/10 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
                            
                            {/* Header */}
                            <div className="p-6 pb-0 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", config.bgColor, "border", config.borderColor)}>
                                        <Smartphone size={20} className={config.textColor} />
                                    </div>
                                    <div>
                                        <h3 className="text-white text-sm font-black tracking-wide">WhatsApp Bridge</h3>
                                        <p className={clsx("text-[10px] font-bold uppercase tracking-widest", config.textColor)}>{config.sublabel}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Status Bar */}
                            <div className="px-6 py-4">
                                <div className={clsx("flex items-center gap-3 p-4 rounded-2xl border", config.bgColor, config.borderColor)}>
                                    <motion.div className={clsx("w-3 h-3 rounded-full", config.color, config.glow)}
                                        animate={isConnected ? { scale: [1, 1.2, 1] } : { opacity: [1, 0.4, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }} />
                                    <span className={clsx("text-xs font-black uppercase tracking-widest", config.textColor)}>
                                        {status === 'connected' ? t.linkActive :
                                         status === 'qr_ready' ? t.qrReady :
                                         status === 'connecting' ? t.establishing :
                                         t.noConnection}
                                    </span>
                                </div>
                            </div>

                            {/* QR Code */}
                            {isQRReady && qr && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6 pb-4 flex flex-col items-center gap-4">
                                    <QRDisplay value={qr} />
                                    <div className="flex items-center gap-2 text-amber-400">
                                        <QrCode size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">{t.qrInstructions}</span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Connected Info */}
                            {isConnected && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pb-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                                            <div className="text-emerald-400 text-lg font-black">{phone ? `+${phone}` : '—'}</div>
                                            <div className="text-[8px] text-white/30 font-bold uppercase tracking-widest">{t.phoneLabel}</div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                                            <div className="text-emerald-400 text-lg font-black flex items-center justify-center gap-1">
                                                <MessageCircle size={14} /> {messageCount}
                                            </div>
                                            <div className="text-[8px] text-white/30 font-bold uppercase tracking-widest">{t.messagesLabel}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Disconnected Help */}
                            {status === 'disconnected' && !isOnline && (
                                <div className="px-6 pb-4">
                                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 space-y-2">
                                        <p className="text-red-400 text-[11px] font-bold">{t.bridgeOfflineMsg}</p>
                                        <div className="text-white/30 text-[10px] font-mono space-y-1">
                                            <p>{t.startService}</p>
                                            <code className="block bg-black/40 px-3 py-2 rounded-lg text-emerald-400/70">
                                                cd moltys-bridge && npm start
                                            </code>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest">MOLTY::BRIDGE v2.0</span>
                                <div className={clsx("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-red-500")} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
