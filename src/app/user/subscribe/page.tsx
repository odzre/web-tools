'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Plan {
    id: string;
    name: string;
    price: number;
    durationDays: number;
    maxMerchants: number;
    maxWhitelistIps: number;
    prioritySupport: boolean;
}

interface PaymentData {
    id: string;
    trx_id: string;
    amount: number;
    unique_code: number;
    total_amount: number;
    payment_status: string;
    expires_at: string;
    qr_string: string;
    qr_image: string;
}

export default function SubscribePage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);

    // Payment state
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<string>('');
    const [timeLeft, setTimeLeft] = useState(0);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetch('/api/plans')
            .then(r => r.json())
            .then(data => {
                if (data.status === 'success' && data.data.length > 0) {
                    setPlans(data.data);
                } else {
                    setPlans([]);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const formatRupiah = (amount: number) => {
        if (amount === 0) return 'Gratis';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    }, []);

    const closePayment = useCallback(() => {
        stopPolling();
        setPaymentData(null);
        setPaymentStatus('');
        setSelectedPlan(null);
        setTimeLeft(0);
    }, [stopPolling]);

    const checkStatus = useCallback(async (orderId: string) => {
        try {
            const res = await fetch(`/api/user/subscribe/status?id=${orderId}`);
            const data = await res.json();
            if (data.status === 'success') {
                const status = data.data.payment_status;
                setPaymentStatus(status);
                if (status === 'paid' || status === 'expired' || status === 'failed') {
                    stopPolling();
                }
            }
        } catch (err) {
            console.error('Polling error:', err);
        }
    }, [stopPolling]);

    const startPolling = useCallback((orderId: string, expiresAt: string) => {
        // Countdown timer
        const expiryTime = new Date(expiresAt).getTime();
        const updateCountdown = () => {
            const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) {
                setPaymentStatus('expired');
                stopPolling();
            }
        };
        updateCountdown();
        countdownRef.current = setInterval(updateCountdown, 1000);

        // Status polling every 5 seconds
        pollingRef.current = setInterval(() => checkStatus(orderId), 5000);
    }, [checkStatus, stopPolling]);

    // Cleanup on unmount
    useEffect(() => {
        return () => stopPolling();
    }, [stopPolling]);

    const handleSubscribe = async (plan: Plan) => {
        if (plan.price === 0) {
            // Free plan
            setSubscribing(true);
            try {
                const res = await fetch('/api/user/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId: plan.id }),
                });
                const data = await res.json();
                if (data.status === 'success') {
                    setPaymentStatus('paid');
                    setSelectedPlan(plan);
                    // Show success briefly then reload
                    setTimeout(() => window.location.href = '/user/dashboard', 2000);
                } else {
                    alert(data.message);
                }
            } catch {
                alert('Koneksi gagal');
            } finally {
                setSubscribing(false);
            }
            return;
        }

        setSubscribing(true);
        setSelectedPlan(plan);

        try {
            const res = await fetch('/api/user/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: plan.id }),
            });
            const data = await res.json();

            if (data.status !== 'success') {
                alert(data.message);
                setSelectedPlan(null);
                return;
            }

            setPaymentData(data.data);
            setPaymentStatus('pending');
            startPolling(data.data.id, data.data.expires_at);
        } catch {
            alert('Koneksi gagal');
            setSelectedPlan(null);
        } finally {
            setSubscribing(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;
    }

    // Payment success view
    if (paymentStatus === 'paid' && !paymentData) {
        return (
            <div className="flex flex-col items-center justify-center h-64 animate-slide-up">
                <div className="w-16 h-16 rounded-full bg-[#34d399]/20 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Plan Berhasil Diaktifkan!</h2>
                <p className="text-[#94a3b8] text-sm mt-1">Mengalihkan ke dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-slide-up">
            <div>
                <h1 className="text-2xl font-bold text-white">Subscribe</h1>
                <p className="text-[#94a3b8] text-sm mt-1">Pilih paket yang sesuai dengan kebutuhan bisnis Anda</p>
            </div>

            {plans.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <svg className="w-16 h-16 text-[#64748b] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <p className="text-[#94a3b8] text-lg font-medium">Belum ada plan tersedia</p>
                    <p className="text-[#64748b] text-sm mt-1">Silahkan hubungi admin untuk informasi lebih lanjut</p>
                </div>
            ) : (
                <div className={`grid gap-6 ${plans.length === 1 ? 'max-w-md mx-auto' : plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
                    {plans.map((plan, i) => (
                        <div key={plan.id} className={`pricing-card ${plans.length >= 3 && i === 1 ? 'popular' : ''}`}>
                            {plans.length >= 3 && i === 1 && (
                                <div className="absolute top-0 right-0 bg-gradient-to-r from-[#38bdf8] to-[#a78bfa] text-white text-xs font-bold px-4 py-1 rounded-bl-xl rounded-tr-2xl">
                                    POPULER
                                </div>
                            )}
                            <h3 className="text-[#94a3b8] font-medium text-sm uppercase tracking-wider mb-4">{plan.name}</h3>
                            <div className="mb-2">
                                <span className="text-4xl font-bold text-white">{formatRupiah(plan.price)}</span>
                            </div>
                            <p className="text-[#64748b] text-sm mb-6">per {plan.durationDays} hari</p>

                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-3 text-sm text-[#cbd5e1]">
                                    <svg className="w-4 h-4 text-[#34d399] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Maks {plan.maxMerchants} Merchant
                                </li>
                                <li className="flex items-center gap-3 text-sm text-[#cbd5e1]">
                                    <svg className="w-4 h-4 text-[#34d399] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {plan.maxWhitelistIps} Whitelist IP
                                </li>
                                <li className="flex items-center gap-3 text-sm text-[#cbd5e1]">
                                    <svg className="w-4 h-4 text-[#34d399] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Tanpa Limitasi API Request
                                </li>
                                <li className="flex items-center gap-3 text-sm text-[#cbd5e1]">
                                    <svg className="w-4 h-4 text-[#34d399] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Masa Aktif {plan.durationDays} Hari
                                </li>
                                <li className={`flex items-center gap-3 text-sm ${plan.prioritySupport ? 'text-[#cbd5e1]' : 'text-[#475569] line-through'}`}>
                                    <svg className={`w-4 h-4 shrink-0 ${plan.prioritySupport ? 'text-[#34d399]' : 'text-[#475569]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {plan.prioritySupport ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        )}
                                    </svg>
                                    Priority Support
                                </li>
                            </ul>

                            <button
                                onClick={() => handleSubscribe(plan)}
                                disabled={subscribing}
                                className={`btn w-full ${plans.length >= 3 && i === 1 ? 'btn-primary' : 'btn-outline'}`}
                            >
                                {subscribing && selectedPlan?.id === plan.id ? <span className="spinner" /> : 'Pilih Paket'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Payment Modal */}
            {paymentData && (
                <div className="modal-overlay" onClick={() => paymentStatus !== 'pending' && closePayment()}>
                    <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white">Pembayaran QRIS</h2>
                            {paymentStatus === 'pending' ? (
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-bold ${timeLeft <= 60 ? 'bg-[#f87171]/20 text-[#f87171]' : 'bg-[#38bdf8]/20 text-[#38bdf8]'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatTime(timeLeft)}
                                </div>
                            ) : (
                                <button onClick={closePayment} className="p-1 rounded hover:bg-[#334155]/50">
                                    <svg className="w-5 h-5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Paid */}
                        {paymentStatus === 'paid' && (
                            <div className="text-center py-8">
                                <div className="w-20 h-20 rounded-full bg-[#34d399]/20 flex items-center justify-center mx-auto mb-4 animate-bounce">
                                    <svg className="w-10 h-10 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-[#34d399] mb-2">Pembayaran Berhasil!</h3>
                                <p className="text-[#94a3b8] text-sm">Plan <span className="text-white font-semibold">{selectedPlan?.name}</span> telah aktif</p>
                                <button onClick={() => window.location.href = '/user/dashboard'} className="btn btn-primary mt-6 px-8">
                                    Ke Dashboard
                                </button>
                            </div>
                        )}

                        {/* Expired */}
                        {paymentStatus === 'expired' && (
                            <div className="text-center py-8">
                                <div className="w-20 h-20 rounded-full bg-[#f87171]/20 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-[#f87171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-[#f87171] mb-2">Pembayaran Kadaluarsa</h3>
                                <p className="text-[#94a3b8] text-sm">Waktu pembayaran habis. Silakan coba lagi.</p>
                                <button onClick={closePayment} className="btn btn-outline mt-6 px-8">
                                    Tutup
                                </button>
                            </div>
                        )}

                        {/* Pending - show QR */}
                        {paymentStatus === 'pending' && (
                            <div className="space-y-5">
                                {/* Plan info */}
                                <div className="bg-[#0f172a] rounded-xl p-4">
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-[#64748b]">Paket</span>
                                        <span className="text-white font-semibold">{selectedPlan?.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-[#64748b]">Harga</span>
                                        <span className="text-white">{formatRupiah(paymentData.amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-[#64748b]">Kode Unik</span>
                                        <span className="text-[#fbbf24]">+{paymentData.unique_code}</span>
                                    </div>
                                    <div className="border-t border-[#334155]/50 my-2" />
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white font-semibold">Total Bayar</span>
                                        <span className="text-[#38bdf8] font-bold text-lg">{formatRupiah(paymentData.total_amount)}</span>
                                    </div>
                                </div>

                                {/* QR Code */}
                                <div className="flex flex-col items-center">
                                    <div className="bg-white rounded-2xl p-4 mb-3">
                                        <img
                                            src={paymentData.qr_image}
                                            alt="QRIS"
                                            className="w-52 h-52"
                                        />
                                    </div>
                                    <p className="text-[#64748b] text-xs text-center">Scan QR code diatas menggunakan aplikasi e-wallet atau m-banking Anda</p>
                                </div>

                                {/* Polling indicator */}
                                <div className="flex items-center justify-center gap-2 text-[#64748b] text-xs">
                                    <div className="spinner w-3 h-3" />
                                    <span>Menunggu pembayaran...</span>
                                </div>

                                {/* TRX ID */}
                                <div className="text-center">
                                    <span className="text-[#475569] text-[10px] font-mono">TRX: {paymentData.trx_id}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
