'use client';

import { useState, useEffect } from 'react';

interface Stats {
    totalSuccess: number;
    totalPending: number;
    totalExpired: number;
    totalFailed: number;
    totalRevenue: number;
}

interface Transaction {
    trxId: string;
    refId: string;
    customerName: string | null;
    amount: number;
    uniqueCode: number;
    totalAmount: number;
    paymentStatus: string;
    createdAt: string;
    paidAt: string | null;
    merchant: { projectName: string };
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/user/stats')
            .then(r => r.json())
            .then(data => {
                if (data.status === 'success') {
                    setStats(data.data.stats);
                    setTransactions(data.data.recentTransactions);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            paid: 'badge-success',
            pending: 'badge-warning',
            expired: 'badge-danger',
            failed: 'badge-danger',
        };
        const label: Record<string, string> = {
            paid: 'Sukses',
            pending: 'Pending',
            expired: 'Expired',
            failed: 'Gagal',
        };
        return <span className={`badge ${map[status] || 'badge-info'}`}>{label[status] || status}</span>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner w-6 h-6" />
            </div>
        );
    }

    const statItems = [
        {
            label: 'Sukses',
            value: stats?.totalSuccess || 0,
            color: '#34d399',
            bg: 'rgba(52,211,153,0.08)',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="#34d399" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            label: 'Pending',
            value: stats?.totalPending || 0,
            color: '#fbbf24',
            bg: 'rgba(251,191,36,0.08)',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="#fbbf24" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            label: 'Expired',
            value: stats?.totalExpired || 0,
            color: '#f87171',
            bg: 'rgba(248,113,113,0.08)',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="#f87171" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
            ),
        },
        {
            label: 'Gagal',
            value: stats?.totalFailed || 0,
            color: '#ef4444',
            bg: 'rgba(239,68,68,0.08)',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="#ef4444" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="space-y-6 animate-slide-up">
            <div>
                <h1 className="text-xl font-bold text-white">Dashboard</h1>
                <p className="text-[#475569] text-[13px] mt-0.5">Ringkasan transaksi dan pendapatan Anda</p>
            </div>

            {/* Revenue highlight */}
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.06), rgba(167,139,250,0.06))' }}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/10 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="#38bdf8" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[#64748b] text-[11px] uppercase tracking-wider font-medium">Total Pendapatan</p>
                        <p className="text-2xl font-bold text-white">{formatRupiah(stats?.totalRevenue || 0)}</p>
                    </div>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {statItems.map((stat, i) => (
                    <div key={i} className="stat-card">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: stat.bg }}>
                                {stat.icon}
                            </div>
                        </div>
                        <p className="text-xl font-bold text-white">{stat.value}</p>
                        <p className="text-[#475569] text-[11px] mt-0.5 uppercase tracking-wider font-medium">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Recent transactions */}
            <div className="rounded-xl border border-white/[0.04] overflow-hidden" style={{ background: 'rgba(15,23,42,0.4)' }}>
                <div className="px-5 py-4 border-b border-white/[0.04]">
                    <h2 className="text-[15px] font-semibold text-white">Transaksi Terbaru</h2>
                </div>

                {transactions.length === 0 ? (
                    <div className="p-12 text-center">
                        <svg className="w-10 h-10 mx-auto mb-3 text-[#1e293b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
                        </svg>
                        <p className="text-[#334155] text-sm">Belum ada transaksi</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>TRX ID</th>
                                    <th>Project</th>
                                    <th>Amount</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Tanggal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => (
                                    <tr key={tx.trxId}>
                                        <td className="font-mono text-[#38bdf8] text-xs">{tx.trxId}</td>
                                        <td className="text-[13px]">{tx.merchant.projectName}</td>
                                        <td className="text-[13px]">{formatRupiah(tx.amount)}</td>
                                        <td className="text-[13px] font-medium text-white">{formatRupiah(tx.totalAmount)}</td>
                                        <td>{statusBadge(tx.paymentStatus)}</td>
                                        <td className="text-xs text-[#475569]">
                                            {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
