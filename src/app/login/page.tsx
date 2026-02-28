'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SiteSettingsProvider, SiteLogo } from '@/components/SiteSettingsProvider';

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
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

    return (
        <SiteSettingsProvider>
            <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
                {/* Background effects */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-[-200px] right-[-200px] w-[500px] h-[500px] bg-[#38bdf8] rounded-full opacity-[0.04] blur-[100px]" />
                    <div className="absolute bottom-[-200px] left-[-200px] w-[500px] h-[500px] bg-[#a78bfa] rounded-full opacity-[0.04] blur-[100px]" />
                </div>

                <div className="w-full max-w-md relative z-10 animate-slide-up">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-2 mb-4">
                            <SiteLogo size="lg" />
                        </Link>
                        <h1 className="text-2xl font-bold text-white mb-2">Selamat Datang</h1>
                        <p className="text-[#94a3b8] text-sm">Masuk ke akun Anda untuk melanjutkan</p>
                    </div>

                    {/* Form */}
                    <div className="glass rounded-2xl p-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] px-4 py-3 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}

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
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Password</label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <button type="submit" className="btn btn-primary w-full py-3" disabled={loading}>
                                {loading ? <span className="spinner" /> : 'Masuk'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <span className="text-[#64748b] text-sm">Belum punya akun? </span>
                            <Link href="/register" className="text-[#0ea5e9] hover:text-[#38bdf8] text-sm font-medium transition">
                                Daftar Sekarang
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </SiteSettingsProvider>
    );
}
