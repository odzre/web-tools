'use client';

import { useState, useEffect, useRef } from 'react';

interface DepositHistory {
    id: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string | null;
    createdAt: string;
}

interface ActiveDeposit {
    trxId: string;
    amount: number;
    uniqueCode: number;
    totalAmount: number;
    qrImage: string | null;
    expiresAt: string;
}

export default function DepositPage() {
    const [saldo, setSaldo] = useState(0);
    const [history, setHistory] = useState<DepositHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [depositLoading, setDepositLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeDeposit, setActiveDeposit] = useState<ActiveDeposit | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'expired'>('pending');
    const [timeLeft, setTimeLeft] = useState(0);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/deposit');
            const data = await res.json();
            if (data.status === 'success') {
                setHistory(data.data);
                setSaldo(data.saldo || 0);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        setDepositLoading(true);
        setError('');

        const numAmount = parseInt(amount);
        if (!numAmount || numAmount < 5000) {
            setError('Minimal deposit Rp 5.000');
            setDepositLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: numAmount }),
            });
            const data = await res.json();

            if (data.status !== 'success') {
                setError(data.message);
                return;
            }

            setActiveDeposit(data.data);
            setPaymentStatus('pending');

            // Start countdown
            const expiresAt = new Date(data.data.expiresAt).getTime();
            timerRef.current = setInterval(() => {
                const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
                setTimeLeft(diff);
                if (diff <= 0) {
                    setPaymentStatus('expired');
                    if (timerRef.current) clearInterval(timerRef.current);
                    if (pollingRef.current) clearInterval(pollingRef.current);
                }
            }, 1000);

            // Start polling payment status
            pollingRef.current = setInterval(async () => {
                try {
                    // Check if transaction is paid by polling callback
                    const statusRes = await fetch('/api/deposit/callback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ trxId: data.data.trxId }),
                    });
                    const statusData = await statusRes.json();
                    if (statusData.status === 'success' && statusData.message?.includes('berhasil')) {
                        setPaymentStatus('paid');
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        if (timerRef.current) clearInterval(timerRef.current);
                        fetchData(); // Refresh saldo
                        setTimeout(() => {
                            setActiveDeposit(null);
                            setAmount('');
                        }, 3000);
                    }
                } catch { /* ignore */ }
            }, 5000);
        } catch {
            setError('Koneksi gagal');
        } finally {
            setDepositLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const closeDeposit = () => {
        setActiveDeposit(null);
        setAmount('');
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">Deposit Saldo</h1>
                    <p className="text-[#94a3b8] text-sm mt-1">Top up saldo untuk menggunakan tools</p>
                </div>
                <div className="glass rounded-xl px-5 py-3">
                    <span className="text-[#64748b] text-sm">Saldo Anda:</span>
                    <span className="ml-2 text-2xl text-[#a78bfa] font-bold">{saldo.toLocaleString('id-ID')}P</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Deposit Form */}
                <div className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4">💰 Deposit</h2>

                    {error && (
                        <div className="bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] px-4 py-3 rounded-xl text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {!activeDeposit ? (
                        <form onSubmit={handleDeposit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Jumlah Deposit (Rp)</label>
                                <input type="number" value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="5000" min="5000" required />
                                <p className="text-[10px] text-[#64748b] mt-1">Minimal Rp 5.000</p>
                            </div>

                            {/* Quick amounts */}
                            <div className="grid grid-cols-3 gap-2">
                                {[5000, 10000, 25000, 50000, 100000, 250000].map((a) => (
                                    <button key={a} type="button"
                                        onClick={() => setAmount(a.toString())}
                                        className={`glass rounded-lg py-2 text-sm transition hover:border-[#a78bfa]/30 ${amount === a.toString() ? 'border-[#a78bfa]/50 text-[#a78bfa]' : 'text-[#94a3b8]'}`}>
                                        {(a / 1000).toFixed(0)}K
                                    </button>
                                ))}
                            </div>

                            <div className="glass rounded-xl p-3 text-sm">
                                <div className="flex justify-between text-[#94a3b8]">
                                    <span>Jumlah deposit</span>
                                    <span className="text-white">{amount ? `Rp ${parseInt(amount).toLocaleString('id-ID')}` : '-'}</span>
                                </div>
                                <div className="flex justify-between text-[#94a3b8] mt-1">
                                    <span>Saldo yang didapat</span>
                                    <span className="text-[#a78bfa] font-bold">{amount ? `${parseInt(amount).toLocaleString('id-ID')}P` : '-'}</span>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary w-full py-3" disabled={depositLoading}>
                                {depositLoading ? <span className="spinner" /> : 'Deposit Sekarang'}
                            </button>
                        </form>
                    ) : (
                        /* Active Deposit - QR Payment */
                        <div className="text-center space-y-4">
                            {paymentStatus === 'paid' ? (
                                <div className="py-6">
                                    <div className="text-5xl mb-4">✅</div>
                                    <p className="text-[#34d399] text-xl font-bold">Pembayaran Berhasil!</p>
                                    <p className="text-[#94a3b8] text-sm mt-2">Saldo +{activeDeposit.amount.toLocaleString('id-ID')}P</p>
                                </div>
                            ) : paymentStatus === 'expired' ? (
                                <div className="py-6">
                                    <div className="text-5xl mb-4">⏰</div>
                                    <p className="text-[#f87171] text-xl font-bold">Deposit Expired</p>
                                    <button onClick={closeDeposit} className="btn btn-outline mt-4">Buat Deposit Baru</button>
                                </div>
                            ) : (
                                <>
                                    <div className="text-sm text-[#94a3b8]">Scan QRIS untuk membayar</div>
                                    {activeDeposit.qrImage && (
                                        <div className="bg-white rounded-2xl p-4 inline-block">
                                            <img src={activeDeposit.qrImage} alt="QRIS" className="w-56 h-56" />
                                        </div>
                                    )}
                                    <div className="glass rounded-xl p-3 text-sm max-w-xs mx-auto">
                                        <div className="flex justify-between">
                                            <span className="text-[#64748b]">Jumlah</span>
                                            <span className="text-white font-bold">Rp {activeDeposit.totalAmount.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-[#64748b]">Kode Unik</span>
                                            <span className="text-[#fbbf24]">{activeDeposit.uniqueCode}</span>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-[#64748b]">Waktu</span>
                                            <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-[#f87171]' : 'text-[#34d399]'}`}>
                                                {formatTime(timeLeft)}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-[#64748b]">Status akan otomatis diperbarui setelah pembayaran</p>
                                    <button onClick={closeDeposit} className="text-sm text-[#64748b] hover:text-[#94a3b8]">
                                        Batalkan
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* History */}
                <div className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4">📋 Riwayat Deposit</h2>
                    {history.length === 0 ? (
                        <p className="text-[#64748b] text-sm text-center py-8">Belum ada riwayat deposit</p>
                    ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {history.map((h) => (
                                <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0f172a]/50">
                                    <div>
                                        <p className="text-white text-sm font-medium">+{h.amount.toLocaleString('id-ID')}P</p>
                                        <p className="text-[#64748b] text-xs">{h.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[#34d399] text-sm font-mono">{h.balanceAfter.toLocaleString('id-ID')}P</p>
                                        <p className="text-[#64748b] text-xs">{new Date(h.createdAt).toLocaleDateString('id-ID')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
