'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';

interface WhitelistIp {
    id: string;
    ipAddress: string;
    label: string | null;
    createdAt: string;
}

export default function SettingsPage() {
    const { user, refreshUser } = useUser();

    const [profileForm, setProfileForm] = useState({
        username: user?.username || '',
        whatsapp: user?.whatsapp || '',
    });
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [keyLoading, setKeyLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [showApiKey, setShowApiKey] = useState(false);

    // Whitelist IP state
    const [whitelistIps, setWhitelistIps] = useState<WhitelistIp[]>([]);
    const [ipInput, setIpInput] = useState('');
    const [ipLoading, setIpLoading] = useState(false);
    const [ipMsg, setIpMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchWhitelistIps();
    }, []);

    const fetchWhitelistIps = async () => {
        try {
            const res = await fetch('/api/user/whitelist-ip');
            const data = await res.json();
            if (data.status === 'success') {
                setWhitelistIps(data.data);
            }
        } catch {
            // ignore
        }
    };

    const handleAddIp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIpLoading(true);
        setIpMsg({ type: '', text: '' });

        // Split by comma, trim whitespace, filter empty
        const ips = ipInput.split(',').map(ip => ip.trim()).filter(ip => ip);
        if (ips.length === 0) {
            setIpMsg({ type: 'error', text: 'Masukkan minimal 1 IP address' });
            setIpLoading(false);
            return;
        }

        try {
            let lastMsg = '';
            let hasError = false;
            for (const ip of ips) {
                const res = await fetch('/api/user/whitelist-ip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ipAddress: ip, label: '' }),
                });
                const data = await res.json();
                if (data.status === 'success') {
                    lastMsg = data.message;
                } else {
                    hasError = true;
                    lastMsg = data.message;
                    break;
                }
            }
            setIpMsg({ type: hasError ? 'error' : 'success', text: lastMsg });
            if (!hasError) setIpInput('');
            fetchWhitelistIps();
        } catch {
            setIpMsg({ type: 'error', text: 'Koneksi gagal' });
        } finally {
            setIpLoading(false);
        }
    };

    const handleDeleteIp = async (id: string) => {
        if (!confirm('Yakin ingin menghapus IP ini?')) return;
        try {
            const res = await fetch(`/api/user/whitelist-ip?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.status === 'success') {
                setIpMsg({ type: 'success', text: data.message });
                fetchWhitelistIps();
            } else {
                setIpMsg({ type: 'error', text: data.message });
            }
        } catch {
            setIpMsg({ type: 'error', text: 'Koneksi gagal' });
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);
        setMsg({ type: '', text: '' });

        try {
            const res = await fetch('/api/user/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileForm),
            });
            const data = await res.json();
            setMsg({ type: data.status === 'success' ? 'success' : 'error', text: data.message });
            if (data.status === 'success') refreshUser();
        } catch {
            setMsg({ type: 'error', text: 'Koneksi gagal' });
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMsg({ type: 'error', text: 'Password baru tidak cocok' });
            return;
        }

        setPasswordLoading(true);
        setMsg({ type: '', text: '' });

        try {
            const res = await fetch('/api/user/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                }),
            });
            const data = await res.json();
            setMsg({ type: data.status === 'success' ? 'success' : 'error', text: data.message });
            if (data.status === 'success') {
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch {
            setMsg({ type: 'error', text: 'Koneksi gagal' });
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleRegenKey = async () => {
        if (!confirm('Yakin ingin regenerate API key? API key lama tidak akan bisa digunakan lagi.')) return;

        setKeyLoading(true);
        setMsg({ type: '', text: '' });

        try {
            const res = await fetch('/api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'regenerate_key' }),
            });
            const data = await res.json();
            setMsg({ type: data.status === 'success' ? 'success' : 'error', text: data.message });
            if (data.status === 'success') refreshUser();
        } catch {
            setMsg({ type: 'error', text: 'Koneksi gagal' });
        } finally {
            setKeyLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setMsg({ type: 'success', text: 'Berhasil disalin!' });
        setTimeout(() => setMsg({ type: '', text: '' }), 2000);
    };

    const maxIps = (user?.plan as { maxWhitelistIps?: number } | null)?.maxWhitelistIps || 0;
    const hasActivePlan = user?.planId && user?.plan && (!user.planExpiresAt || new Date(user.planExpiresAt) > new Date());

    return (
        <div className="space-y-6 animate-slide-up max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-white">Pengaturan</h1>
                <p className="text-[#94a3b8] text-sm mt-1">Kelola profil, password, API key, dan whitelist IP</p>
            </div>

            {msg.text && (
                <div className={`${msg.type === 'error' ? 'bg-[#f87171]/10 border-[#f87171]/20 text-[#f87171]' : 'bg-[#34d399]/10 border-[#34d399]/20 text-[#34d399]'} border px-4 py-3 rounded-xl text-sm`}>
                    {msg.text}
                </div>
            )}

            {/* API Key */}
            <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">API Key</h2>
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 bg-[#0f172a] rounded-lg px-4 py-3 font-mono text-sm">
                        <span className="text-[#94a3b8]">
                            {showApiKey ? user?.apiKey : '••••••••••••••••••••••••••••••••'}
                        </span>
                    </div>
                    <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="btn btn-outline px-3 py-3"
                        title={showApiKey ? 'Sembunyikan' : 'Tampilkan'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {showApiKey ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            )}
                        </svg>
                    </button>
                    <button
                        onClick={() => copyToClipboard(user?.apiKey || '')}
                        className="btn btn-outline px-3 py-3"
                        title="Salin"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
                <button onClick={handleRegenKey} className="btn btn-danger text-sm" disabled={keyLoading}>
                    {keyLoading ? <span className="spinner" /> : 'Regenerate API Key'}
                </button>
            </div>

            {/* Whitelist IP */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Whitelist IP</h2>
                        <p className="text-[#64748b] text-xs mt-1">
                            {hasActivePlan
                                ? `${whitelistIps.length} / ${maxIps} IP terdaftar`
                                : 'Aktifkan plan untuk mengelola IP whitelist'}
                        </p>
                    </div>
                    {hasActivePlan && (
                        <span className="glass px-3 py-1 rounded-full text-xs text-[#38bdf8]">
                            Maks {maxIps} IP
                        </span>
                    )}
                </div>

                {ipMsg.text && (
                    <div className={`${ipMsg.type === 'error' ? 'bg-[#f87171]/10 border-[#f87171]/20 text-[#f87171]' : 'bg-[#34d399]/10 border-[#34d399]/20 text-[#34d399]'} border px-4 py-3 rounded-xl text-sm mb-4`}>
                        {ipMsg.text}
                    </div>
                )}

                {/* IP List */}
                {whitelistIps.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {whitelistIps.map(ip => (
                            <div key={ip.id} className="flex items-center justify-between bg-[#0f172a] rounded-lg px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <svg className="w-4 h-4 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <div>
                                        <span className="text-white font-mono text-sm">{ip.ipAddress}</span>
                                        {ip.label && <span className="text-[#64748b] text-xs ml-2">({ip.label})</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteIp(ip.id)}
                                    className="p-1.5 rounded-lg hover:bg-[#334155]/50 transition text-[#f87171]"
                                    title="Hapus"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add IP Form */}
                {hasActivePlan && whitelistIps.length < maxIps && (
                    <form onSubmit={handleAddIp} className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Contoh: 1.1.1.1 atau 1.1.1.1,2.2.2.2"
                            value={ipInput}
                            onChange={e => setIpInput(e.target.value)}
                            className="flex-1"
                            required
                        />
                        <button type="submit" className="btn btn-primary whitespace-nowrap" disabled={ipLoading}>
                            {ipLoading ? <span className="spinner" /> : 'Tambah IP'}
                        </button>
                    </form>
                )}

                {!hasActivePlan && (
                    <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-xl px-4 py-3 text-sm text-[#f59e0b]">
                        Anda perlu subscription aktif untuk mengelola whitelist IP.
                    </div>
                )}

                {hasActivePlan && whitelistIps.length >= maxIps && (
                    <div className="bg-[#38bdf8]/10 border border-[#38bdf8]/20 rounded-xl px-4 py-3 text-sm text-[#38bdf8]">
                        Batas whitelist IP sesuai plan anda telah tercapai. Upgrade plan untuk menambah lebih banyak.
                    </div>
                )}
            </div>

            {/* Profile */}
            <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Edit Profil</h2>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#94a3b8] mb-2">Email</label>
                        <input type="email" value={user?.email || ''} disabled className="opacity-50 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#94a3b8] mb-2">Username</label>
                        <input
                            type="text"
                            value={profileForm.username}
                            onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#94a3b8] mb-2">Nomor WhatsApp</label>
                        <input
                            type="tel"
                            value={profileForm.whatsapp}
                            onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                        {profileLoading ? <span className="spinner" /> : 'Simpan Perubahan'}
                    </button>
                </form>
            </div>

            {/* Password */}
            <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Ubah Password</h2>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#94a3b8] mb-2">Password Lama</label>
                        <input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#94a3b8] mb-2">Password Baru</label>
                        <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#94a3b8] mb-2">Konfirmasi Password Baru</label>
                        <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                        {passwordLoading ? <span className="spinner" /> : 'Ubah Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
