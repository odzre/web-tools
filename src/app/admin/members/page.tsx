'use client';

import { useState, useEffect } from 'react';

interface Member {
    id: string;
    username: string;
    email: string;
    whatsapp: string;
    role: string;
    isVerified: boolean;
    apiKey: string;
    planId: string | null;
    planExpiresAt: string | null;
    createdAt: string;
    plan: { name: string } | null;
    _count: { merchants: number; transactions: number };
}

interface Plan {
    id: string;
    name: string;
    price: number;
    durationDays: number;
    maxMerchants: number;
    maxWhitelistIps: number;
    prioritySupport: boolean;
    isActive: boolean;
}

interface WhitelistIp {
    id: string;
    ipAddress: string;
    label: string | null;
}

export default function AdminMembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [editMember, setEditMember] = useState<Member | null>(null);
    const [editForm, setEditForm] = useState({ role: '', planId: '' as string | null, planExpiresAt: '', extendDays: '' });
    const [editLoading, setEditLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [search, setSearch] = useState('');
    // IP state
    const [memberIps, setMemberIps] = useState<WhitelistIp[]>([]);
    const [ipInput, setIpInput] = useState('');
    const [ipLoading, setIpLoading] = useState(false);

    const fetchMembers = () => {
        fetch('/api/admin/members')
            .then(r => r.json())
            .then(data => { if (data.status === 'success') setMembers(data.data); })
            .finally(() => setLoading(false));
    };

    const fetchPlans = () => {
        fetch('/api/admin/plans')
            .then(r => r.json())
            .then(data => { if (data.status === 'success') setPlans(data.data.filter((p: Plan) => p.isActive)); });
    };

    useEffect(() => { fetchMembers(); fetchPlans(); }, []);

    const filteredMembers = members.filter(m =>
        m.username.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleDeleteMember = async (userId: string, username: string) => {
        if (!confirm(`Yakin ingin menghapus member "${username}"? Semua data terkait akan dihapus.`)) return;
        const res = await fetch(`/api/admin/members?id=${userId}`, { method: 'DELETE' });
        const data = await res.json();
        setMsg({ type: data.status === 'success' ? 'success' : 'error', text: data.message });
        fetchMembers();
        setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    };

    const openEditModal = (member: Member) => {
        setEditMember(member);
        setEditForm({
            role: member.role,
            planId: member.planId,
            planExpiresAt: member.planExpiresAt ? new Date(member.planExpiresAt).toISOString().split('T')[0] : '',
            extendDays: '',
        });
        setMsg({ type: '', text: '' });
        // Fetch user IPs
        setMemberIps([]);
        setIpInput('');
        fetch(`/api/admin/whitelist-ip?userId=${member.id}`)
            .then(r => r.json())
            .then(data => { if (data.status === 'success') setMemberIps(data.data); });
    };

    const handleAddIp = async () => {
        if (!editMember || !ipInput.trim()) return;
        setIpLoading(true);
        const ips = ipInput.split(',').map(ip => ip.trim()).filter(ip => ip);
        for (const ip of ips) {
            const res = await fetch('/api/admin/whitelist-ip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: editMember.id, ipAddress: ip }),
            });
            const data = await res.json();
            if (data.status !== 'success') {
                setMsg({ type: 'error', text: `IP ${ip}: ${data.message}` });
                break;
            }
        }
        setIpInput('');
        // Refresh IPs
        const res = await fetch(`/api/admin/whitelist-ip?userId=${editMember.id}`);
        const data = await res.json();
        if (data.status === 'success') setMemberIps(data.data);
        setIpLoading(false);
    };

    const handleDeleteIp = async (ipId: string) => {
        if (!editMember) return;
        await fetch(`/api/admin/whitelist-ip?id=${ipId}`, { method: 'DELETE' });
        setMemberIps(prev => prev.filter(ip => ip.id !== ipId));
    };

    const handleEditSave = async () => {
        if (!editMember) return;
        setEditLoading(true);
        setMsg({ type: '', text: '' });

        try {
            // Build update payload
            const payload: Record<string, unknown> = { userId: editMember.id };
            if (editForm.role !== editMember.role) payload.role = editForm.role;

            // Plan change
            if (editForm.planId !== editMember.planId) {
                payload.planId = editForm.planId;
                // If removing plan, skip expiry — backend will clear it
                if (!editForm.planId) {
                    // Don't send planExpiresAt, let backend handle null
                } else if (!editForm.planExpiresAt && !editForm.extendDays) {
                    // Auto-calculate from plan duration
                    const selectedPlan = plans.find(p => p.id === editForm.planId);
                    if (selectedPlan) {
                        const newExpiry = new Date(Date.now() + selectedPlan.durationDays * 24 * 60 * 60 * 1000);
                        payload.planExpiresAt = newExpiry.toISOString();
                    }
                }
            }

            // Calculate new expiry (only if not removing plan)
            if (editForm.planId) {
                if (editForm.extendDays) {
                    const days = parseInt(editForm.extendDays);
                    if (days > 0) {
                        const base = editMember.planExpiresAt ? new Date(editMember.planExpiresAt) : new Date();
                        const newDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
                        payload.planExpiresAt = newDate.toISOString();
                    }
                } else if (editForm.planExpiresAt) {
                    payload.planExpiresAt = new Date(editForm.planExpiresAt).toISOString();
                }
            }

            const res = await fetch('/api/admin/members', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (data.status === 'success') {
                setMsg({ type: 'success', text: 'Member berhasil diperbarui' });
                fetchMembers();
                setTimeout(() => { setEditMember(null); setMsg({ type: '', text: '' }); }, 1000);
            } else {
                setMsg({ type: 'error', text: data.message });
            }
        } catch {
            setMsg({ type: 'error', text: 'Koneksi gagal' });
        } finally {
            setEditLoading(false);
        }
    };

    const handleQuickRoleToggle = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        if (!confirm(`Ubah role menjadi ${newRole}?`)) return;
        await fetch('/api/admin/members', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, role: newRole }),
        });
        fetchMembers();
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

    const isExpired = (d: string | null) => d ? new Date(d) < new Date() : true;

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;
    }

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Kelola Member</h1>
                    <p className="text-[#94a3b8] text-sm mt-1">{members.length} total member terdaftar</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari username atau email..."
                        className="pl-10"
                    />
                </div>
            </div>

            {msg.text && !editMember && (
                <div className={`${msg.type === 'error' ? 'bg-[#f87171]/10 border-[#f87171]/20 text-[#f87171]' : 'bg-[#34d399]/10 border-[#34d399]/20 text-[#34d399]'} border px-4 py-3 rounded-xl text-sm`}>
                    {msg.text}
                </div>
            )}

            {/* Members list */}
            <div className="space-y-2">
                {filteredMembers.map((m) => (
                    <div key={m.id} className="rounded-xl border border-white/[0.04] p-4" style={{ background: 'rgba(15,23,42,0.4)' }}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-[#1e293b] flex items-center justify-center shrink-0">
                                    <span className="text-[#94a3b8] text-xs font-semibold">{m.username[0]?.toUpperCase()}</span>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-white truncate">{m.username}</p>
                                        <button
                                            onClick={() => handleQuickRoleToggle(m.id, m.role)}
                                            className={`badge cursor-pointer hover:opacity-80 transition text-[10px] ${m.role === 'ADMIN' ? 'badge-danger' : 'badge-info'}`}
                                        >
                                            {m.role}
                                        </button>
                                    </div>
                                    <p className="text-xs text-[#475569] truncate">{m.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => openEditModal(m)}
                                    className="p-2 rounded-lg hover:bg-white/[0.04] transition"
                                    title="Edit"
                                >
                                    <svg className="w-4 h-4 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleDeleteMember(m.id, m.username)}
                                    className="p-2 rounded-lg hover:bg-[#f87171]/10 transition"
                                    title="Hapus"
                                >
                                    <svg className="w-4 h-4 text-[#f87171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 ml-12 text-xs text-[#475569]">
                            <span className={`font-medium ${m.plan ? 'text-[#34d399]' : 'text-[#64748b]'}`}>
                                {m.plan?.name || 'Free'}
                            </span>
                            {m.planExpiresAt && (
                                <span className={isExpired(m.planExpiresAt) ? 'text-[#f87171]' : ''}>
                                    {isExpired(m.planExpiresAt) ? 'Expired' : formatDate(m.planExpiresAt)}
                                </span>
                            )}
                            <span>{m._count.transactions} trx</span>
                            <span>{formatDate(m.createdAt)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            {editMember && (
                <div className="modal-overlay" onClick={() => setEditMember(null)}>
                    <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#38bdf8] to-[#a78bfa] flex items-center justify-center">
                                    <span className="text-white font-bold">{editMember.username[0]?.toUpperCase()}</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">{editMember.username}</h2>
                                    <p className="text-xs text-[#64748b]">{editMember.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditMember(null)} className="p-1 rounded hover:bg-[#334155]/50">
                                <svg className="w-5 h-5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {msg.text && (
                            <div className={`${msg.type === 'error' ? 'bg-[#f87171]/10 border-[#f87171]/20 text-[#f87171]' : 'bg-[#34d399]/10 border-[#34d399]/20 text-[#34d399]'} border px-4 py-3 rounded-xl text-sm mb-4`}>
                                {msg.text}
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* Role */}
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Role</label>
                                <div className="flex gap-3">
                                    {['USER', 'ADMIN'].map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, role })}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition border ${editForm.role === role
                                                ? role === 'ADMIN'
                                                    ? 'bg-[#f87171]/20 border-[#f87171]/40 text-[#f87171]'
                                                    : 'bg-[#38bdf8]/20 border-[#38bdf8]/40 text-[#38bdf8]'
                                                : 'border-[#334155] text-[#64748b] hover:border-[#94a3b8]/30'
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Plan */}
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Subscription Plan</label>
                                <select
                                    value={editForm.planId || ''}
                                    onChange={(e) => {
                                        const newPlanId = e.target.value || null;
                                        setEditForm({
                                            ...editForm,
                                            planId: newPlanId,
                                            // Clear expiry fields when removing plan
                                            ...(!newPlanId ? { planExpiresAt: '', extendDays: '' } : {}),
                                        });
                                    }}
                                    className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#38bdf8] focus:outline-none transition"
                                >
                                    <option value="">Tanpa Plan</option>
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} — Rp {p.price.toLocaleString('id-ID')} ({p.durationDays} hari, {p.maxMerchants} merchant, {p.maxWhitelistIps} IP)
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-[#64748b] mt-1">
                                    Saat ini: {editMember.plan?.name || 'Tanpa Plan'}
                                </p>
                            </div>

                            {/* Masa Aktif */}
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Masa Aktif Langganan</label>
                                <input
                                    type="date"
                                    value={editForm.planExpiresAt}
                                    onChange={(e) => setEditForm({ ...editForm, planExpiresAt: e.target.value, extendDays: '' })}
                                />
                                <p className="text-[10px] text-[#64748b] mt-1">
                                    Saat ini: {editMember.planExpiresAt ? formatDate(editMember.planExpiresAt) : 'Tidak ada'}
                                </p>
                            </div>

                            {/* Quick extend */}
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Perpanjang Masa Aktif</label>
                                <div className="flex gap-2">
                                    {[7, 30, 90, 365].map(d => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, extendDays: d.toString(), planExpiresAt: '' })}
                                            className={`flex-1 py-2 rounded-xl text-xs font-medium transition border ${editForm.extendDays === d.toString()
                                                ? 'bg-[#34d399]/20 border-[#34d399]/40 text-[#34d399]'
                                                : 'border-[#334155] text-[#64748b] hover:border-[#94a3b8]/30'
                                                }`}
                                        >
                                            +{d}h
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    value={editForm.extendDays}
                                    onChange={(e) => setEditForm({ ...editForm, extendDays: e.target.value, planExpiresAt: '' })}
                                    placeholder="Atau masukkan jumlah hari"
                                    className="mt-2 text-sm"
                                    min={1}
                                />
                            </div>

                            {/* Whitelist IP */}
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Whitelist IP</label>
                                {memberIps.length > 0 && (
                                    <div className="space-y-1.5 mb-3">
                                        {memberIps.map(ip => (
                                            <div key={ip.id} className="flex items-center justify-between bg-[#0f172a] rounded-lg px-3 py-2">
                                                <span className="text-white font-mono text-xs">{ip.ipAddress}</span>
                                                <button
                                                    onClick={() => handleDeleteIp(ip.id)}
                                                    className="text-[#f87171] hover:text-[#fca5a5] transition p-1"
                                                    title="Hapus"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="1.1.1.1 atau 1.1.1.1,2.2.2.2"
                                        value={ipInput}
                                        onChange={e => setIpInput(e.target.value)}
                                        className="flex-1 !text-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddIp}
                                        disabled={ipLoading || !ipInput.trim()}
                                        className="btn btn-primary !text-xs !px-3 !py-1.5 !min-h-[36px]"
                                    >
                                        {ipLoading ? <span className="spinner" /> : 'Tambah'}
                                    </button>
                                </div>
                                {memberIps.length === 0 && (
                                    <p className="text-[10px] text-[#475569] mt-1">Belum ada IP terdaftar</p>
                                )}
                            </div>

                            {/* Info */}
                            <div className="glass rounded-xl p-4 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-[#64748b]">WhatsApp</span>
                                    <span className="text-[#94a3b8] font-mono">{editMember.whatsapp}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#64748b]">Merchants</span>
                                    <span className="text-[#94a3b8]">{editMember._count.merchants}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#64748b]">Transaksi</span>
                                    <span className="text-[#94a3b8]">{editMember._count.transactions}</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setEditMember(null)} className="btn btn-outline flex-1">Batal</button>
                                <button onClick={handleEditSave} className="btn btn-primary flex-1" disabled={editLoading}>
                                    {editLoading ? <span className="spinner" /> : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
