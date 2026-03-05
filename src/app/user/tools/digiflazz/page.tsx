'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface DigiflazzAccount {
    id: string;
    email: string;
    connected: boolean;
    lastUsedAt: string | null;
    createdAt: string;
}

interface LogEntry {
    id: number;
    text: string;
    time: string;
}

export default function DigiflazzPage() {
    const [account, setAccount] = useState<DigiflazzAccount | null>(null);
    const [saldo, setSaldo] = useState(0);
    const [loading, setLoading] = useState(true);

    // Login state
    const [loginStep, setLoginStep] = useState<'idle' | 'logging_in' | 'need_2fa' | 'connected'>('idle');
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [a2fCode, setA2fCode] = useState('');
    const [tempCookies, setTempCookies] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Config state
    const [config, setConfig] = useState({
        kategori: '', brand: '', type: '',
        autoKodeProduk: true, autoHargaMax: true,
        pilihTermurah: true, sellerRandom: false,
        ratingMinimal: 0, blockedSellers: '',
    });

    // Terminal state
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [running, setRunning] = useState(false);
    const logIdRef = useRef(0);
    const terminalRef = useRef<HTMLDivElement>(null);

    const addLog = useCallback((text: string) => {
        const id = ++logIdRef.current;
        const time = new Date().toLocaleTimeString('id-ID');
        setLogs(prev => [...prev, { id, text, time }]);
    }, []);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    const fetchAccount = async () => {
        try {
            const res = await fetch('/api/digiflazz/account');
            const data = await res.json();
            if (data.status === 'success') {
                setAccount(data.data);
                setSaldo(data.saldo || 0);
                if (data.data?.connected) setLoginStep('connected');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAccount(); }, []);

    // ─── Login ───
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');
        setLoginStep('logging_in');

        try {
            const res = await fetch('/api/digiflazz/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginForm),
            });
            const data = await res.json();

            if (data.logs) data.logs.forEach((l: string) => addLog(l));

            if (data.status !== 'success') {
                setLoginError(data.message);
                setLoginStep('idle');
                return;
            }

            if (data.data?.need2fa) {
                setTempCookies(data.data.tempCookies);
                setLoginStep('need_2fa');
            } else {
                setLoginStep('connected');
                fetchAccount();
            }
        } catch {
            setLoginError('Koneksi gagal');
            setLoginStep('idle');
        } finally {
            setLoginLoading(false);
        }
    };

    // ─── Verify 2FA ───
    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');

        try {
            const res = await fetch('/api/digiflazz/verify-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tempCookies, code: a2fCode, email: loginForm.email }),
            });
            const data = await res.json();
            if (data.logs) data.logs.forEach((l: string) => addLog(l));

            if (data.status !== 'success') {
                setLoginError(data.message);
                return;
            }
            setLoginStep('connected');
            fetchAccount();
        } catch {
            setLoginError('Koneksi gagal');
        } finally {
            setLoginLoading(false);
        }
    };

    // ─── Disconnect ───
    const handleDisconnect = async () => {
        if (!confirm('Disconnect akun Digiflazz?')) return;
        await fetch('/api/digiflazz/account', { method: 'DELETE' });
        setAccount(null);
        setLoginStep('idle');
    };

    // ─── Run Automation (SSE) ───
    const handleStart = async () => {
        if (running) return;
        if (saldo < 15) { addLog('❌ Saldo tidak cukup (min 15P)'); return; }

        setRunning(true);
        setLogs([]);
        addLog('🚀 Memulai automation...');

        try {
            const res = await fetch('/api/digiflazz/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...config,
                    blockedSellers: config.blockedSellers.split(',').map(s => s.trim()).filter(Boolean),
                    ratingMinimal: parseFloat(config.ratingMinimal.toString()) || 0,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                addLog(`❌ Error: ${err.message}`);
                setRunning(false);
                return;
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) { addLog('❌ Stream tidak tersedia'); setRunning(false); return; }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);
                const lines = text.split('\n\n').filter(Boolean);

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'log') addLog(data.message);
                        if (data.type === 'done') {
                            addLog(`\n✅ Selesai! ${data.processed} berhasil, ${data.skipped} skip`);
                            if (data.stopped) addLog('⚠️ Dihentikan karena saldo habis');
                        }
                        if (data.type === 'error') addLog(`❌ Error: ${data.message}`);
                    } catch { /* ignore parse errors */ }
                }
            }
        } catch (err) {
            addLog(`❌ Error: ${err instanceof Error ? err.message : 'Unknown'}`);
        } finally {
            setRunning(false);
            fetchAccount(); // refresh saldo
        }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">Digiflazz Seller Tools</h1>
                    <p className="text-[#94a3b8] text-sm mt-1">Otomasi pemilihan seller di Digiflazz</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="glass rounded-xl px-4 py-2 text-sm">
                        <span className="text-[#64748b]">Saldo:</span>
                        <span className="ml-2 text-[#a78bfa] font-bold">{saldo}P</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${loginStep === 'connected' ? 'bg-[#34d399]/20 text-[#34d399]' : 'bg-[#f87171]/20 text-[#f87171]'}`}>
                        {loginStep === 'connected' ? '● Connected' : '○ Disconnected'}
                    </div>
                </div>
            </div>

            {/* ═══ Login Section ═══ */}
            {loginStep !== 'connected' && (
                <div className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4">🔐 Login Digiflazz</h2>

                    {loginError && (
                        <div className="bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] px-4 py-3 rounded-xl text-sm mb-4">
                            {loginError}
                        </div>
                    )}

                    {(loginStep === 'idle' || loginStep === 'logging_in') && (
                        <form onSubmit={handleLogin} className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Email Digiflazz</label>
                                <input type="email" value={loginForm.email}
                                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                                    placeholder="email@example.com" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Password</label>
                                <input type="password" value={loginForm.password}
                                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                    placeholder="••••••••" required />
                            </div>
                            <button type="submit" className="btn btn-primary w-full py-3" disabled={loginLoading}>
                                {loginLoading ? <span className="spinner" /> : 'Login ke Digiflazz'}
                            </button>
                        </form>
                    )}

                    {loginStep === 'need_2fa' && (
                        <form onSubmit={handleVerify2FA} className="space-y-4 max-w-md">
                            <div className="bg-[#a78bfa]/10 border border-[#a78bfa]/20 rounded-xl px-4 py-3">
                                <p className="text-sm text-[#a78bfa] font-medium">🔐 Verifikasi A2F/2FA</p>
                                <p className="text-xs text-[#94a3b8] mt-1">Masukkan kode dari authenticator app</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Kode A2F</label>
                                <input type="text" value={a2fCode}
                                    onChange={(e) => setA2fCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="text-center text-2xl tracking-[0.5em] font-mono"
                                    style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid #334155', borderRadius: '10px', padding: '12px', color: '#e2e8f0', width: '100%', outline: 'none' }}
                                    maxLength={6} required autoFocus />
                            </div>
                            <button type="submit" className="btn btn-primary w-full py-3" disabled={loginLoading || a2fCode.length < 6}>
                                {loginLoading ? <span className="spinner" /> : 'Verifikasi'}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* ═══ Connected: Config + Terminal ═══ */}
            {loginStep === 'connected' && (
                <>
                    {/* Account info */}
                    <div className="glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#34d399]/20 flex items-center justify-center text-lg">🟢</div>
                            <div>
                                <p className="text-white font-medium">{account?.email || 'Digiflazz'}</p>
                                <p className="text-[#64748b] text-xs">
                                    Last used: {account?.lastUsedAt ? new Date(account.lastUsedAt).toLocaleString('id-ID') : 'Belum pernah'}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleDisconnect} className="btn btn-outline text-sm text-[#f87171] border-[#f87171]/30 hover:bg-[#f87171]/10">
                            Disconnect
                        </button>
                    </div>

                    {/* Config Form */}
                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">⚙️ Pengaturan Automation</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Kategori *</label>
                                <input type="text" value={config.kategori}
                                    onChange={(e) => setConfig({ ...config, kategori: e.target.value })}
                                    placeholder="Games" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Brand *</label>
                                <input type="text" value={config.brand}
                                    onChange={(e) => setConfig({ ...config, brand: e.target.value })}
                                    placeholder="MOBILE LEGENDS" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Type</label>
                                <input type="text" value={config.type}
                                    onChange={(e) => setConfig({ ...config, type: e.target.value })}
                                    placeholder="Umum" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Rating Minimal</label>
                                <input type="number" value={config.ratingMinimal} step="0.1" min="0" max="5"
                                    onChange={(e) => setConfig({ ...config, ratingMinimal: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Blacklist Seller</label>
                                <input type="text" value={config.blockedSellers}
                                    onChange={(e) => setConfig({ ...config, blockedSellers: e.target.value })}
                                    placeholder="BTU, SellerX, SellerY (pisahkan koma)" />
                            </div>
                        </div>

                        {/* Toggle switches */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            {[
                                { key: 'autoKodeProduk', label: 'Auto Kode Produk' },
                                { key: 'autoHargaMax', label: 'Auto Harga Max' },
                                { key: 'pilihTermurah', label: 'Pilih Termurah' },
                                { key: 'sellerRandom', label: 'Seller Random' },
                            ].map(({ key, label }) => (
                                <label key={key} className="flex items-center gap-2 cursor-pointer glass rounded-xl px-3 py-2">
                                    <input
                                        type="checkbox"
                                        checked={config[key as keyof typeof config] as boolean}
                                        onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                                        className="w-4 h-4 rounded accent-[#a78bfa]"
                                    />
                                    <span className="text-sm text-[#94a3b8]">{label}</span>
                                </label>
                            ))}
                        </div>

                        {/* START button */}
                        <div className="mt-6 flex items-center gap-4">
                            <button
                                onClick={handleStart}
                                disabled={running || !config.kategori || !config.brand || saldo < 15}
                                className={`btn py-3 px-8 font-bold text-lg ${running ? 'bg-[#f59e0b] text-black' : 'btn-primary'}`}
                            >
                                {running ? (
                                    <span className="flex items-center gap-2"><span className="spinner" /> RUNNING...</span>
                                ) : (
                                    '▶ START'
                                )}
                            </button>
                            {saldo < 15 && (
                                <span className="text-[#f87171] text-sm">Saldo tidak cukup (min 15P)</span>
                            )}
                            <span className="text-[#64748b] text-xs ml-auto">15P per seller berhasil</span>
                        </div>
                    </div>

                    {/* Terminal */}
                    <div className="glass rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1e293b]">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-[#f87171]" />
                                <div className="w-3 h-3 rounded-full bg-[#fbbf24]" />
                                <div className="w-3 h-3 rounded-full bg-[#34d399]" />
                            </div>
                            <span className="text-xs text-[#64748b] font-mono ml-2">Terminal — Digiflazz Automation</span>
                            {running && <span className="ml-auto text-xs text-[#f59e0b] animate-pulse">● Live</span>}
                        </div>
                        <div
                            ref={terminalRef}
                            className="p-4 font-mono text-sm overflow-y-auto bg-[#0a0a0f]"
                            style={{ height: '350px', scrollBehavior: 'smooth' }}
                        >
                            {logs.length === 0 ? (
                                <p className="text-[#334155]">Klik START untuk menjalankan automation...</p>
                            ) : (
                                logs.map((log) => (
                                    <div key={log.id} className="flex gap-2 mb-1">
                                        <span className="text-[#334155] shrink-0">[{log.time}]</span>
                                        <span className="text-[#e2e8f0] whitespace-pre-wrap">{log.text}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
