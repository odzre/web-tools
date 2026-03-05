'use client';

import { useState, useEffect } from 'react';

interface OKMerchant {
    id: string;
    projectName: string;
    okId: string | null;
    okUsername: string;
    okName: string | null;
    okBalance: string | null;
    qrString: string | null;
    uniqueCodeDigits: number;
    createdAt: string;
    _count: { transactions: number };
}

export default function OrderKuotaPage() {
    const [merchants, setMerchants] = useState<OKMerchant[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showQrisModal, setShowQrisModal] = useState(false);
    const [selectedMerchant, setSelectedMerchant] = useState<OKMerchant | null>(null);

    // ─── Login Form State ───
    const [loginStep, setLoginStep] = useState<'credentials' | 'otp' | 'success'>('credentials');
    const [addForm, setAddForm] = useState({ projectName: '', okUsername: '', okPassword: '' });
    const [otpInfo, setOtpInfo] = useState({ okUsername: '', projectName: '', otpMethod: '', otpTarget: '' });
    const [otp, setOtp] = useState('');
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState('');
    const [addSuccess, setAddSuccess] = useState('');

    // ─── QRIS Form State ───
    const [qrisForm, setQrisForm] = useState({ qrString: '', uniqueCodeDigits: 2 });
    const [qrisFile, setQrisFile] = useState<File | null>(null);
    const [qrisLoading, setQrisLoading] = useState(false);
    const [qrisMsg, setQrisMsg] = useState({ type: '', text: '' });

    const fetchMerchants = async () => {
        try {
            const res = await fetch('/api/merchant/ok');
            const data = await res.json();
            if (data.status === 'success') setMerchants(data.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMerchants(); }, []);

    // ─── Step 1: Login with username + password ───
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddLoading(true);
        setAddError('');
        setAddSuccess('');

        try {
            const res = await fetch('/api/merchant/ok', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addForm),
            });
            const data = await res.json();

            if (data.status !== 'success') {
                setAddError(data.message);
                return;
            }

            if (data.data?.requiresOtp) {
                // OTP required — show OTP form
                setOtpInfo({
                    okUsername: data.data.okUsername || addForm.okUsername,
                    projectName: data.data.projectName || addForm.projectName,
                    otpMethod: data.data.otpMethod || 'email',
                    otpTarget: data.data.otpTarget || '',
                });
                setLoginStep('otp');
            } else {
                // Direct success (rare — no OTP needed)
                setAddSuccess('Akun OrderKuota berhasil terhubung!');
                setLoginStep('success');
                fetchMerchants();
                setTimeout(() => closeAddModal(), 2000);
            }
        } catch {
            setAddError('Koneksi ke server gagal. Coba lagi.');
        } finally {
            setAddLoading(false);
        }
    };

    // ─── Step 2: Verify OTP ───
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddLoading(true);
        setAddError('');

        try {
            const res = await fetch('/api/merchant/ok/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    okUsername: otpInfo.okUsername,
                    otp,
                    projectName: otpInfo.projectName,
                }),
            });
            const data = await res.json();

            if (data.status !== 'success') {
                setAddError(data.message);
                return;
            }

            setAddSuccess(`Akun OrderKuota berhasil terhubung! (${data.data?.okName || data.data?.okUsername})`);
            setLoginStep('success');
            fetchMerchants();
            setTimeout(() => closeAddModal(), 2500);
        } catch {
            setAddError('Koneksi ke server gagal. Coba lagi.');
        } finally {
            setAddLoading(false);
        }
    };

    const handleDeleteMerchant = async (id: string) => {
        if (!confirm('Yakin ingin menghapus akun OrderKuota ini? Token akan dihapus permanen.')) return;
        await fetch(`/api/merchant/ok?id=${id}`, { method: 'DELETE' });
        fetchMerchants();
    };

    const handleQrisUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMerchant) return;
        setQrisLoading(true);
        setQrisMsg({ type: '', text: '' });
        try {
            const formData = new FormData();
            formData.append('merchantId', selectedMerchant.id);
            formData.append('uniqueCodeDigits', qrisForm.uniqueCodeDigits.toString());
            if (qrisForm.qrString) {
                formData.append('qrString', qrisForm.qrString);
            } else if (qrisFile) {
                formData.append('qris', qrisFile);
            } else {
                setQrisMsg({ type: 'error', text: 'Upload gambar QRIS atau masukkan QR string' });
                return;
            }
            const res = await fetch('/api/merchant/ok/qris', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.status === 'success') {
                setQrisMsg({ type: 'success', text: data.message });
                fetchMerchants();
                setTimeout(() => { setShowQrisModal(false); setQrisMsg({ type: '', text: '' }); }, 1500);
            } else {
                setQrisMsg({ type: 'error', text: data.message });
            }
        } catch {
            setQrisMsg({ type: 'error', text: 'Koneksi ke server gagal' });
        } finally {
            setQrisLoading(false);
        }
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setAddForm({ projectName: '', okUsername: '', okPassword: '' });
        setOtpInfo({ okUsername: '', projectName: '', otpMethod: '', otpTarget: '' });
        setOtp('');
        setLoginStep('credentials');
        setAddError('');
        setAddSuccess('');
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">OrderKuota</h1>
                    <p className="text-[#94a3b8] text-sm mt-1">Kelola akun OrderKuota untuk terima pembayaran QRIS</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn btn-primary shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Akun
                </button>
            </div>

            {merchants.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <div className="text-5xl mb-4">🧾</div>
                    <p className="text-[#94a3b8] text-sm">Belum ada akun OrderKuota. Klik &quot;Tambah Akun&quot; untuk menghubungkan.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {merchants.map((m) => (
                        <div key={m.id} className="glass rounded-2xl p-5 hover:border-[#a78bfa]/30 transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#a78bfa]/20 text-[#a78bfa]">OK</span>
                                        <h3 className="text-white font-semibold">{m.projectName}</h3>
                                    </div>
                                    <p className="text-[#64748b] text-xs font-mono">@{m.okUsername}</p>
                                    {m.okName && <p className="text-[#94a3b8] text-xs mt-0.5">{m.okName}</p>}
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => {
                                            setSelectedMerchant(m);
                                            setQrisForm({ qrString: '', uniqueCodeDigits: m.uniqueCodeDigits });
                                            setShowQrisModal(true);
                                        }}
                                        className="p-2 rounded-lg hover:bg-[#334155]/50 transition"
                                        title="Setup QRIS"
                                    >
                                        <svg className="w-4 h-4 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteMerchant(m.id)}
                                        className="p-2 rounded-lg hover:bg-[#f87171]/10 transition"
                                        title="Hapus"
                                    >
                                        <svg className="w-4 h-4 text-[#f87171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-[#64748b]">Transaksi</span>
                                    <span className="text-white">{m._count.transactions}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#64748b]">QRIS</span>
                                    <span className={m.qrString ? 'text-[#34d399]' : 'text-[#f87171]'}>
                                        {m.qrString ? '✓ Aktif' : '✗ Belum setup'}
                                    </span>
                                </div>
                                {m.okBalance && (
                                    <div className="flex justify-between">
                                        <span className="text-[#64748b]">Saldo OK</span>
                                        <span className="text-[#a78bfa] font-mono">Rp {parseInt(m.okBalance).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-[#64748b]">Kode Unik</span>
                                    <span className="text-white">{m.uniqueCodeDigits} digit</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ Add Merchant Modal ═══ */}
            {showAddModal && (
                <div className="modal-overlay" onClick={closeAddModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white">
                                {loginStep === 'credentials' && 'Login OrderKuota'}
                                {loginStep === 'otp' && 'Verifikasi OTP'}
                                {loginStep === 'success' && 'Berhasil!'}
                            </h2>
                            <button onClick={closeAddModal} className="p-1 rounded hover:bg-[#334155]/50">
                                <svg className="w-5 h-5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Progress indicator */}
                        <div className="flex items-center gap-2 mb-6">
                            {['credentials', 'otp', 'success'].map((step, i) => (
                                <div key={step} className="flex items-center gap-2 flex-1">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${loginStep === step ? 'bg-[#a78bfa] text-white' :
                                            ['credentials', 'otp', 'success'].indexOf(loginStep) > i ? 'bg-[#34d399] text-white' :
                                                'bg-[#334155] text-[#64748b]'
                                        }`}>
                                        {['credentials', 'otp', 'success'].indexOf(loginStep) > i ? '✓' : i + 1}
                                    </div>
                                    {i < 2 && <div className={`h-0.5 flex-1 ${['credentials', 'otp', 'success'].indexOf(loginStep) > i ? 'bg-[#34d399]' : 'bg-[#334155]'}`} />}
                                </div>
                            ))}
                        </div>

                        {addError && (
                            <div className="bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] px-4 py-3 rounded-xl text-sm mb-4">
                                {addError}
                            </div>
                        )}
                        {addSuccess && (
                            <div className="bg-[#34d399]/10 border border-[#34d399]/20 text-[#34d399] px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {addSuccess}
                            </div>
                        )}

                        {/* ─── Step 1: Credentials ─── */}
                        {loginStep === 'credentials' && (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Nama Project</label>
                                    <input type="text" value={addForm.projectName}
                                        onChange={(e) => setAddForm({ ...addForm, projectName: e.target.value })}
                                        placeholder="Contoh: Toko Online Saya" required />
                                    <p className="text-[10px] text-[#64748b] mt-1">Nama unik untuk identifikasi merchant di API</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Username OrderKuota</label>
                                    <input type="text" value={addForm.okUsername}
                                        onChange={(e) => setAddForm({ ...addForm, okUsername: e.target.value })}
                                        placeholder="username" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Password</label>
                                    <input type="password" value={addForm.okPassword}
                                        onChange={(e) => setAddForm({ ...addForm, okPassword: e.target.value })}
                                        placeholder="••••••••" required />
                                </div>
                                <button type="submit" className="btn btn-primary w-full py-3" disabled={addLoading}>
                                    {addLoading ? <span className="spinner" /> : 'Login'}
                                </button>
                            </form>
                        )}

                        {/* ─── Step 2: OTP ─── */}
                        {loginStep === 'otp' && (
                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                                <div className="bg-[#a78bfa]/10 border border-[#a78bfa]/20 rounded-xl px-4 py-3">
                                    <p className="text-sm text-[#a78bfa] font-medium mb-1">
                                        📧 OTP dikirim via {otpInfo.otpMethod}
                                    </p>
                                    <p className="text-xs text-[#94a3b8]">
                                        Kode OTP telah dikirim ke <span className="text-white font-mono">{otpInfo.otpTarget}</span>
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Masukkan Kode OTP</label>
                                    <input type="text" value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="text-center text-2xl tracking-[0.5em] font-mono"
                                        style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid #334155', borderRadius: '10px', padding: '12px 14px', color: '#e2e8f0', width: '100%', outline: 'none', letterSpacing: '0.5em' }}
                                        maxLength={6} required autoFocus />
                                </div>
                                <button type="submit" className="btn btn-primary w-full py-3" disabled={addLoading || otp.length < 4}>
                                    {addLoading ? <span className="spinner" /> : 'Verifikasi OTP'}
                                </button>
                                <button type="button" onClick={() => { setLoginStep('credentials'); setAddError(''); setOtp(''); }}
                                    className="btn btn-outline w-full">
                                    ← Kembali
                                </button>
                            </form>
                        )}

                        {/* ─── Step 3: Success ─── */}
                        {loginStep === 'success' && (
                            <div className="text-center py-6">
                                <div className="text-5xl mb-4">✅</div>
                                <p className="text-white font-semibold text-lg mb-2">Akun Berhasil Terhubung</p>
                                <p className="text-[#94a3b8] text-sm">Silahkan setup QRIS untuk mulai menerima pembayaran.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ QRIS Modal ═══ */}
            {showQrisModal && selectedMerchant && (
                <div className="modal-overlay" onClick={() => setShowQrisModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white">Setup QRIS — {selectedMerchant.projectName}</h2>
                            <button onClick={() => setShowQrisModal(false)} className="p-1 rounded hover:bg-[#334155]/50">
                                <svg className="w-5 h-5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {qrisMsg.text && (
                            <div className={`${qrisMsg.type === 'error' ? 'bg-[#f87171]/10 border-[#f87171]/20 text-[#f87171]' : 'bg-[#34d399]/10 border-[#34d399]/20 text-[#34d399]'} border px-4 py-3 rounded-xl text-sm mb-4`}>
                                {qrisMsg.text}
                            </div>
                        )}

                        <form onSubmit={handleQrisUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Upload Gambar QRIS</label>
                                <input type="file" accept="image/*"
                                    onChange={(e) => setQrisFile(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-[#94a3b8] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#a78bfa]/10 file:text-[#a78bfa] hover:file:bg-[#a78bfa]/20"
                                />
                            </div>
                            <div className="text-center text-[#64748b] text-sm">— atau —</div>
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">QR String (Manual)</label>
                                <textarea value={qrisForm.qrString}
                                    onChange={(e) => setQrisForm({ ...qrisForm, qrString: e.target.value })}
                                    placeholder="00020101021226..." rows={3}
                                    style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px', color: '#e2e8f0', fontSize: '13px', width: '100%', fontFamily: 'monospace', outline: 'none', resize: 'none' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Jumlah Digit Kode Unik</label>
                                <select value={qrisForm.uniqueCodeDigits}
                                    onChange={(e) => setQrisForm({ ...qrisForm, uniqueCodeDigits: parseInt(e.target.value) })}>
                                    <option value={2}>2 digit (10-99)</option>
                                    <option value={3}>3 digit (100-999)</option>
                                    <option value={4}>4 digit (1000-9999)</option>
                                    <option value={5}>5 digit (10000-99999)</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary w-full py-3" disabled={qrisLoading}>
                                {qrisLoading ? <span className="spinner" /> : 'Simpan QRIS'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
