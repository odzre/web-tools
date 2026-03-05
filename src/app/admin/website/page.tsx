'use client';

import { useState, useEffect, useRef } from 'react';

export default function AdminWebsitePage() {
    const [form, setForm] = useState({ siteTitle: '', favicon: '', logo: '', qrisApiKey: '', qrisProject: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [msg, setMsg] = useState({ type: '', text: '' });
    const logoRef = useRef<HTMLInputElement>(null);
    const faviconRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(r => r.json())
            .then(data => {
                if (data.status === 'success') {
                    setForm({
                        siteTitle: data.data.siteTitle || '',
                        favicon: data.data.favicon || '',
                        logo: data.data.logo || '',
                        qrisApiKey: data.data.qrisApiKey || '',
                        qrisProject: data.data.qrisProject || '',
                    });
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const handleUpload = async (file: File, type: 'logo' | 'favicon') => {
        setUploading(type);
        setMsg({ type: '', text: '' });

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);

            const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.status === 'success') {
                setForm(prev => ({ ...prev, [type]: data.data.url }));
                setMsg({ type: 'success', text: `${type === 'logo' ? 'Logo' : 'Favicon'} berhasil diupload!` });
            } else {
                setMsg({ type: 'error', text: data.message });
            }
        } catch {
            setMsg({ type: 'error', text: 'Upload gagal' });
        } finally {
            setUploading(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMsg({ type: '', text: '' });

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            setMsg({ type: data.status === 'success' ? 'success' : 'error', text: data.message });
        } catch {
            setMsg({ type: 'error', text: 'Koneksi gagal' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;
    }

    return (
        <div className="space-y-6 animate-slide-up max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-white">Kelola Website</h1>
                <p className="text-[#94a3b8] text-sm mt-1">Atur logo, favicon, dan nama website</p>
            </div>

            {msg.text && (
                <div className={`${msg.type === 'error' ? 'bg-[#f87171]/10 border-[#f87171]/20 text-[#f87171]' : 'bg-[#34d399]/10 border-[#34d399]/20 text-[#34d399]'} border px-4 py-3 rounded-xl text-sm`}>
                    {msg.text}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                {/* Site Title */}
                <div className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Nama Website
                    </h2>
                    <input
                        type="text"
                        value={form.siteTitle}
                        onChange={(e) => setForm({ ...form, siteTitle: e.target.value })}
                        placeholder="MyCash Payment Gateway"
                    />
                    <p className="text-xs text-[#64748b] mt-2">Nama ini akan ditampilkan di browser tab dan header website.</p>
                </div>

                {/* Logo Upload */}
                <div className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Logo Website
                    </h2>

                    <div className="flex items-start gap-6">
                        {/* Preview */}
                        <div className="w-24 h-24 rounded-2xl bg-[#0f172a] border-2 border-dashed border-[#334155] flex items-center justify-center overflow-hidden shrink-0">
                            {form.logo ? (
                                <img src={form.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <svg className="w-8 h-8 text-[#334155]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            )}
                        </div>

                        <div className="flex-1 space-y-3">
                            <input
                                ref={logoRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUpload(file, 'logo');
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => logoRef.current?.click()}
                                disabled={uploading === 'logo'}
                                className="btn btn-outline text-sm flex items-center gap-2"
                            >
                                {uploading === 'logo' ? <span className="spinner" /> : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                )}
                                Upload Logo
                            </button>

                            <div>
                                <label className="block text-xs font-medium text-[#64748b] mb-1">Atau masukkan URL:</label>
                                <input
                                    type="text"
                                    value={form.logo}
                                    onChange={(e) => setForm({ ...form, logo: e.target.value })}
                                    placeholder="https://example.com/logo.png"
                                    className="text-sm"
                                />
                            </div>
                            <p className="text-[10px] text-[#64748b]">Format: PNG, JPEG, WebP, SVG. Max 2MB.</p>
                        </div>
                    </div>
                </div>

                {/* Favicon Upload */}
                <div className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#f472b6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        Favicon Website
                    </h2>

                    <div className="flex items-start gap-6">
                        {/* Preview */}
                        <div className="w-16 h-16 rounded-xl bg-[#0f172a] border-2 border-dashed border-[#334155] flex items-center justify-center overflow-hidden shrink-0">
                            {form.favicon ? (
                                <img src={form.favicon} alt="Favicon" className="w-full h-full object-contain p-1" />
                            ) : (
                                <svg className="w-6 h-6 text-[#334155]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                            )}
                        </div>

                        <div className="flex-1 space-y-3">
                            <input
                                ref={faviconRef}
                                type="file"
                                accept="image/*,.ico"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUpload(file, 'favicon');
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => faviconRef.current?.click()}
                                disabled={uploading === 'favicon'}
                                className="btn btn-outline text-sm flex items-center gap-2"
                            >
                                {uploading === 'favicon' ? <span className="spinner" /> : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                )}
                                Upload Favicon
                            </button>

                            <div>
                                <label className="block text-xs font-medium text-[#64748b] mb-1">Atau masukkan URL:</label>
                                <input
                                    type="text"
                                    value={form.favicon}
                                    onChange={(e) => setForm({ ...form, favicon: e.target.value })}
                                    placeholder="https://example.com/favicon.ico"
                                    className="text-sm"
                                />
                            </div>
                            <p className="text-[10px] text-[#64748b]">Format: ICO, PNG, SVG. Max 2MB. Ukuran disarankan: 32x32 atau 64x64.</p>
                        </div>
                    </div>
                </div>

                {/* QRIS Subscribe Config */}
                <div className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Konfigurasi QRIS Subscribe
                    </h2>
                    <p className="text-xs text-[#64748b] mb-4">Atur API Key dan Nama Project MyCash untuk menerima pembayaran subscribe otomatis via QRIS.</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#94a3b8] mb-2">API Key</label>
                            <input
                                type="text"
                                value={form.qrisApiKey}
                                onChange={(e) => setForm({ ...form, qrisApiKey: e.target.value })}
                                placeholder="Masukkan API Key MyCash"
                                className="font-mono text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#94a3b8] mb-2">Nama Project</label>
                            <input
                                type="text"
                                value={form.qrisProject}
                                onChange={(e) => setForm({ ...form, qrisProject: e.target.value })}
                                placeholder="Masukkan nama project merchant"
                            />
                        </div>
                    </div>
                </div>

                {/* Save */}
                <button type="submit" className="btn btn-primary px-8 py-3" disabled={saving}>
                    {saving ? <span className="spinner" /> : 'Simpan Semua Pengaturan'}
                </button>
            </form>
        </div>
    );
}
