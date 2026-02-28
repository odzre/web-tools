'use client';

import { useState, useEffect } from 'react';

interface Plan {
    id: string;
    name: string;
    price: number;
    durationDays: number;
    maxMerchants: number;
    maxWhitelistIps: number;
    prioritySupport: boolean;
    isActive: boolean;
    _count: { users: number };
    createdAt: string;
}

interface PlanForm {
    name: string;
    price: string;
    durationDays: string;
    maxMerchants: string;
    maxWhitelistIps: string;
    prioritySupport: boolean;
}

const emptyForm: PlanForm = {
    name: '',
    price: '',
    durationDays: '30',
    maxMerchants: '1',
    maxWhitelistIps: '1',
    prioritySupport: false,
};

export default function AdminPlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<string | null>(null);
    const [form, setForm] = useState<PlanForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    const fetchPlans = async () => {
        try {
            const res = await fetch('/api/admin/plans');
            const data = await res.json();
            if (data.status === 'success') {
                setPlans(data.data);
            }
        } catch {
            setMsg({ type: 'error', text: 'Gagal memuat data plan' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPlans(); }, []);

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setShowModal(true);
        setMsg({ type: '', text: '' });
    };

    const openEdit = (plan: Plan) => {
        setEditing(plan.id);
        setForm({
            name: plan.name,
            price: plan.price.toString(),
            durationDays: plan.durationDays.toString(),
            maxMerchants: plan.maxMerchants.toString(),
            maxWhitelistIps: plan.maxWhitelistIps.toString(),
            prioritySupport: plan.prioritySupport,
        });
        setShowModal(true);
        setMsg({ type: '', text: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMsg({ type: '', text: '' });

        try {
            const method = editing ? 'PUT' : 'POST';
            const body = editing ? { id: editing, ...form } : form;

            const res = await fetch('/api/admin/plans', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (data.status === 'success') {
                setMsg({ type: 'success', text: data.message });
                setShowModal(false);
                fetchPlans();
            } else {
                setMsg({ type: 'error', text: data.message });
            }
        } catch {
            setMsg({ type: 'error', text: 'Koneksi gagal' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Yakin ingin menghapus plan "${name}"?`)) return;

        try {
            const res = await fetch(`/api/admin/plans?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.status === 'success') {
                setMsg({ type: 'success', text: data.message });
                fetchPlans();
            } else {
                setMsg({ type: 'error', text: data.message });
            }
        } catch {
            setMsg({ type: 'error', text: 'Koneksi gagal' });
        }
    };

    const toggleActive = async (plan: Plan) => {
        try {
            const res = await fetch('/api/admin/plans', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: plan.id, isActive: !plan.isActive }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                fetchPlans();
            }
        } catch {
            setMsg({ type: 'error', text: 'Gagal mengubah status' });
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;
    }

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Kelola Plan</h1>
                    <p className="text-[#94a3b8] text-sm mt-1">Kelola subscription plan untuk member</p>
                </div>
                <button onClick={openCreate} className="btn btn-primary flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Plan
                </button>
            </div>

            {msg.text && (
                <div className={`${msg.type === 'error' ? 'bg-[#f87171]/10 border-[#f87171]/20 text-[#f87171]' : 'bg-[#34d399]/10 border-[#34d399]/20 text-[#34d399]'} border px-4 py-3 rounded-xl text-sm`}>
                    {msg.text}
                </div>
            )}

            {/* Plans List */}
            {plans.length === 0 ? (
                <div className="text-center py-12 text-[#475569]">
                    Belum ada plan. Klik &quot;Tambah Plan&quot; untuk membuat.
                </div>
            ) : (
                <div className="space-y-3">
                    {plans.map((plan) => (
                        <div key={plan.id} className="rounded-xl border border-white/[0.04] p-4" style={{ background: 'rgba(15,23,42,0.4)' }}>
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-white font-semibold text-[15px]">{plan.name}</h3>
                                        <button
                                            onClick={() => toggleActive(plan)}
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${plan.isActive
                                                ? 'bg-[#34d399]/10 text-[#34d399]'
                                                : 'bg-[#f87171]/10 text-[#f87171]'
                                                }`}
                                        >
                                            {plan.isActive ? 'Aktif' : 'Nonaktif'}
                                        </button>
                                    </div>
                                    <p className="text-[#38bdf8] font-semibold text-lg mt-0.5">{formatRupiah(plan.price)}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => openEdit(plan)}
                                        className="p-2 rounded-lg hover:bg-white/[0.04] transition text-[#38bdf8]"
                                        title="Edit"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(plan.id, plan.name)}
                                        className="p-2 rounded-lg hover:bg-white/[0.04] transition text-[#f87171]"
                                        title="Hapus"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748b]">
                                <span>{plan.durationDays} hari</span>
                                <span>{plan.maxMerchants} merchant</span>
                                <span>{plan.maxWhitelistIps} IP</span>
                                {plan.prioritySupport && <span className="text-[#34d399]">Priority ✓</span>}
                                <span>{plan._count.users} user</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="glass-strong rounded-2xl p-6 w-full max-w-lg border border-[#334155]/50" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white">
                                {editing ? 'Edit Plan' : 'Tambah Plan Baru'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-[#334155]/50 transition">
                                <svg className="w-5 h-5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Nama Plan</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="contoh: Starter, Business, Enterprise"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Harga (Rp)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.price}
                                        onChange={e => setForm({ ...form, price: e.target.value })}
                                        placeholder="99000"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Masa Aktif (hari)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.durationDays}
                                        onChange={e => setForm({ ...form, durationDays: e.target.value })}
                                        placeholder="30"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Batas Merchant</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.maxMerchants}
                                        onChange={e => setForm({ ...form, maxMerchants: e.target.value })}
                                        placeholder="1"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-2">Maks Whitelist IP</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.maxWhitelistIps}
                                        onChange={e => setForm({ ...form, maxWhitelistIps: e.target.value })}
                                        placeholder="1"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 glass rounded-xl p-4">
                                <input
                                    type="checkbox"
                                    id="prioritySupport"
                                    checked={form.prioritySupport}
                                    onChange={e => setForm({ ...form, prioritySupport: e.target.checked })}
                                    className="w-4 h-4 accent-[#38bdf8]"
                                />
                                <label htmlFor="prioritySupport" className="text-sm text-[#cbd5e1] cursor-pointer">
                                    Priority Support
                                </label>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline flex-1">
                                    Batal
                                </button>
                                <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
                                    {saving ? <span className="spinner" /> : editing ? 'Simpan' : 'Buat Plan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
