'use client';

import { useState, useEffect } from 'react';

interface Stats {
    totalUsers: number;
    totalTransactions: number;
    totalRevenue: number;
    recentTransactions: {
        trxId: string;
        refId: string;
        amount: number;
        totalAmount: number;
        paymentStatus: string;
        createdAt: string;
        customerName: string | null;
        merchant: { projectName: string; user: { username: string } };
    }[];
    recentUsers: {
        id: string;
        username: string;
        email: string;
        role: string;
        createdAt: string;
        plan: { name: string } | null;
    }[];
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/stats')
            .then(r => r.json())
            .then(data => { if (data.status === 'success') setStats(data.data); })
            .finally(() => setLoading(false));
    }, []);

    const formatRupiah = (n: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

    const statusBadge = (status: string) => {
        const map: Record<string, string> = { paid: 'badge-success', pending: 'badge-warning', expired: 'badge-danger', failed: 'badge-danger' };
        const label: Record<string, string> = { paid: 'Sukses', pending: 'Pending', expired: 'Expired', failed: 'Gagal' };
        return <span className={`badge ${map[status] || 'badge-info'}`}>{label[status] || status}</span>;
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner w-6 h-6" /></div>;
    }

    return (
        <div className="space-y-6 animate-slide-up">
            <div>
                <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-[#475569] text-[13px] mt-0.5">Ringkasan keseluruhan platform</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat-card border-l-2 border-[#38bdf8]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[#475569] text-[11px] uppercase tracking-wider font-medium">Total User</p>
                            <p className="text-2xl font-bold text-white mt-1.5">{stats?.totalUsers || 0}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/8 flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="stat-card border-l-2 border-[#a78bfa]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[#475569] text-[11px] uppercase tracking-wider font-medium">Total Transaksi</p>
                            <p className="text-2xl font-bold text-white mt-1.5">{stats?.totalTransactions || 0}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#a78bfa]/8 flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="stat-card border-l-2 border-[#34d399]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[#475569] text-[11px] uppercase tracking-wider font-medium">Total Pendapatan</p>
                            <p className="text-2xl font-bold text-white mt-1.5">{formatRupiah(stats?.totalRevenue || 0)}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#34d399]/8 flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Transactions */}
                <div className="lg:col-span-2 rounded-xl border border-white/[0.04] overflow-hidden" style={{ background: 'rgba(15,23,42,0.4)' }}>
                    <div className="px-5 py-4 border-b border-white/[0.04]">
                        <h2 className="text-[15px] font-semibold text-white">Transaksi Terbaru</h2>
                    </div>
                    {!stats?.recentTransactions?.length ? (
                        <div className="p-12 text-center">
                            <p className="text-[#64748b] text-sm">Belum ada transaksi</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>TRX ID</th>
                                        <th>User</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Waktu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentTransactions.map(tx => (
                                        <tr key={tx.trxId}>
                                            <td className="font-mono text-[#38bdf8] text-xs">{tx.trxId}</td>
                                            <td className="text-sm">{tx.merchant.user.username}</td>
                                            <td className="text-sm font-medium">{formatRupiah(tx.totalAmount)}</td>
                                            <td>{statusBadge(tx.paymentStatus)}</td>
                                            <td className="text-xs text-[#94a3b8]">
                                                {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Recent Users */}
                <div className="rounded-xl border border-white/[0.04] overflow-hidden" style={{ background: 'rgba(15,23,42,0.4)' }}>
                    <div className="px-5 py-4 border-b border-white/[0.04]">
                        <h2 className="text-[15px] font-semibold text-white">User Baru</h2>
                    </div>
                    {!stats?.recentUsers?.length ? (
                        <div className="p-12 text-center">
                            <p className="text-[#64748b] text-sm">Belum ada user</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.04]">
                            {stats.recentUsers.map(u => (
                                <div key={u.id} className="p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center shrink-0">
                                        <span className="text-[#94a3b8] text-xs font-semibold">{u.username[0]?.toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{u.username}</p>
                                        <p className="text-xs text-[#64748b] truncate">{u.email}</p>
                                    </div>
                                    <span className={`badge text-[10px] ${u.role === 'ADMIN' ? 'badge-danger' : 'badge-info'}`}>
                                        {u.role}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
