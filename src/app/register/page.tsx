'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { SiteSettingsProvider, SiteLogo } from '@/components/SiteSettingsProvider';

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState<'register' | 'otp'>('register');
    const [form, setForm] = useState({
        username: '',
        email: '',
        whatsapp: '',
        password: '',
        confirmPassword: '',
    });
    const [registrationData, setRegistrationData] = useState<{
        email: string;
        username: string;
        whatsapp: string;
        hashedPassword: string;
    } | null>(null);
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [countdown, setCountdown] = useState(0);

    // Countdown timer for resend OTP
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();
            if (data.status !== 'success') {
                setError(data.message);
                return;
            }

            // Store registration data for OTP verification
            setRegistrationData(data.data);
            setMessage(data.message);
            setStep('otp');
            setCountdown(60); // Start 60s cooldown
        } catch {
            setError('Koneksi gagal. Coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!registrationData) {
            setError('Data registrasi tidak ditemukan. Silakan daftar ulang.');
            setStep('register');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: registrationData.email,
                    otp,
                    username: registrationData.username,
                    whatsapp: registrationData.whatsapp,
                    hashedPassword: registrationData.hashedPassword,
                }),
            });

            const data = await res.json();
            if (data.status !== 'success') {
                setError(data.message);
                return;
            }

            router.push(data.data.redirect);
        } catch {
            setError('Koneksi gagal. Coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = useCallback(async () => {
        if (countdown > 0 || !registrationData) return;
        setResending(true);
        setError('');
        setMessage('');

        try {
            const res = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: registrationData.email }),
            });

            const data = await res.json();
            if (data.status !== 'success') {
                setError(data.message);
                return;
            }

            setMessage(data.message);
            setCountdown(60);
        } catch {
            setError('Gagal mengirim ulang OTP.');
        } finally {
            setResending(false);
        }
    }, [countdown, registrationData]);

    return (
        <SiteSettingsProvider>
            <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
                {/* Background effects */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] bg-[#a78bfa] rounded-full opacity-[0.04] blur-[100px]" />
                    <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-[#38bdf8] rounded-full opacity-[0.04] blur-[100px]" />
                </div>

                <div className="w-full max-w-md relative z-10 animate-slide-up">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-2 mb-4">
                            <SiteLogo size="lg" />
                        </Link>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            {step === 'register' ? 'Buat Akun Baru' : 'Verifikasi OTP'}
                        </h1>
                        <p className="text-[#94a3b8] text-sm">
                            {step === 'register'
                                ? 'Daftar untuk mulai menerima pembayaran'
                                : `Masukkan kode OTP yang dikirim ke ${form.email}`
                            }
                        </p>
                    </div>

                    <div className="glass rounded-2xl p-8">
                        {error && (
                            <div className="bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] px-4 py-3 rounded-xl text-sm mb-5">
                                {error}
                            </div>
                        )}

                        {message && step === 'otp' && (
                            <div className="bg-[#34d399]/10 border border-[#34d399]/20 text-[#34d399] px-4 py-3 rounded-xl text-sm mb-5">
                                {message}
                            </div>
                        )}

                        {step === 'register' ? (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Username</label>
                                    <input
                                        type="text"
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                        placeholder="johndoe"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="nama@email.com"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Nomor WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={form.whatsapp}
                                        onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                                        placeholder="628123456789"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Password</label>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder="Minimal 6 karakter"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Konfirmasi Password</label>
                                    <input
                                        type="password"
                                        value={form.confirmPassword}
                                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                        placeholder="Ulangi password"
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary w-full py-3 mt-2" disabled={loading}>
                                    {loading ? <span className="spinner" /> : 'Daftar'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Kode OTP</label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="text-center text-2xl tracking-[0.5em] font-mono"
                                        maxLength={6}
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary w-full py-3" disabled={loading}>
                                    {loading ? <span className="spinner" /> : 'Verifikasi'}
                                </button>

                                {/* Resend OTP button */}
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={countdown > 0 || resending}
                                    className="w-full text-center text-sm transition"
                                    style={{
                                        color: countdown > 0 ? '#64748b' : '#38bdf8',
                                        cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                                        background: 'none',
                                        border: 'none',
                                        padding: '8px',
                                    }}
                                >
                                    {resending
                                        ? 'Mengirim...'
                                        : countdown > 0
                                            ? `Kirim ulang OTP (${countdown}s)`
                                            : 'Kirim ulang OTP'
                                    }
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setStep('register'); setError(''); setMessage(''); }}
                                    className="btn btn-outline w-full"
                                >
                                    Kembali
                                </button>
                            </form>
                        )}

                        {step === 'register' && (
                            <div className="mt-6 text-center">
                                <span className="text-[#64748b] text-sm">Sudah punya akun? </span>
                                <Link href="/login" className="text-[#38bdf8] hover:text-[#7dd3fc] text-sm font-medium transition">
                                    Masuk
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SiteSettingsProvider>
    );
}
