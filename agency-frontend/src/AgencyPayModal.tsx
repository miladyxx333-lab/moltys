
import React, { useState, useEffect } from "react";

interface AgencyPayModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// Dirección de la Agencia (Lobpoop Treasury)
const TREASURY_WALLET = "e6uU5apmNZrUX4L2fCZ7hupZMwofS3JUNXEHcSxqcBD"; // Reemplazar con wallet real en prod
const PRICE_USD = 10;
const TOKEN_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC on Solana

export default function AgencyPayModal({ isOpen, onClose, onSuccess }: AgencyPayModalProps) {
    const [status, setStatus] = useState<'idle' | 'pending' | 'success'>('idle');
    const [qrUrl, setQrUrl] = useState('');
    const [orderId, setOrderId] = useState('');

    useEffect(() => {
        if (isOpen) {
            const newOrderId = `lease-${Date.now()}`;
            setOrderId(newOrderId);

            // 1. Generate Solana Pay Link for USDC
            // Format: solana:<recipient>?amount=<amount>&spl-token=<mint>&memo=<memo>
            const params = new URLSearchParams({
                amount: PRICE_USD.toString(),
                "spl-token": TOKEN_MINT,
                label: "Lobpoop Agency",
                message: "Molty Unit 30-Day Lease",
                memo: newOrderId
            });

            const solanaUrl = `solana:${TREASURY_WALLET}?${params.toString()}`;

            // 2. Generate QR
            const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=4F46E5&bgcolor=FFFFFF&data=${encodeURIComponent(solanaUrl)}`;
            setQrUrl(qrApi);
            setStatus('idle');
        }
    }, [isOpen]);

    // Polling Simulator (En prod, esto llamaría a /api/agency/verify-payment)
    useEffect(() => {
        if (isOpen && status === 'pending') {
            const interval = setInterval(() => {
                // Simulación de éxito tras 3 segundos
                console.log(`Checking ledger for memo: ${orderId}...`);
                // En realidad aquí haríamos fetch('/api/agency/verify', { body: JSON.stringify({ memo: orderId }) })

                // Simulo éxito
                setStatus('success');
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
                clearInterval(interval);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [isOpen, status, orderId, onSuccess, onClose]);

    const handleSimulatePayment = () => {
        setStatus('pending');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
            <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white text-3xl">&times;</button>

            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center text-center p-8 space-y-6">

                <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Activate Molty Unit</h2>
                    <p className="text-gray-500 text-sm">Scan with Phantom / Solflare to pay</p>
                </div>

                {/* QR Area */}
                <div className="relative w-64 h-64 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center p-2 shadow-inner">
                    {qrUrl ? (
                        <img src={qrUrl} alt="Pay QR" className="w-full h-full object-contain" />
                    ) : (
                        <div className="animate-pulse w-full h-full bg-gray-200" />
                    )}

                    {/* USDC Logo Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="w-20 h-20 bg-blue-500 rounded-full blur-3xl"></div>
                    </div>
                </div>

                <div className="flex justify-between w-full px-8 text-sm font-medium">
                    <span className="text-gray-500">Total Due</span>
                    <span className="text-gray-900 text-lg">${PRICE_USD}.00 USDC</span>
                </div>

                {status === 'idle' && (
                    <button
                        onClick={handleSimulatePayment}
                        className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30"
                    >
                        I've Sent the Payment
                    </button>
                )}

                {status === 'pending' && (
                    <div className="flex items-center justify-center space-x-3 text-indigo-600 animate-pulse py-3">
                        <span className="font-semibold">Verifying Blockchain...</span>
                    </div>
                )}

                {status === 'success' && (
                    <div className="w-full py-3 bg-green-50 text-green-600 font-bold rounded-lg border border-green-200">
                        ✅ Payment Verified
                    </div>
                )}

                <div className="text-[10px] text-gray-400 mt-4 max-w-xs">
                    Powered by Solana Pay. <br />
                    Order: {orderId}
                </div>
            </div>
        </div>
    );
}
