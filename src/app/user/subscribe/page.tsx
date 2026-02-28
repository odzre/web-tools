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
}

export default function SubscribePage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/plans')
            .then(r => r.json())
            .then(data => {
                if (data.status === 'success' && data.data.length > 0) {
                    setPlans(data.data);
                } else {
                    setPlans([]);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const formatRupiah = (amount: number) => {
        if (amount === 0) return 'Gratis';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;
    }

    return (
        <div className="space-y-6 animate-slide-up">
            <div>
                <h1 className="text-2xl font-bold text-white">Subscribe</h1>
                <p className="text-[#94a3b8] text-sm mt-1">Pilih paket yang sesuai dengan kebutuhan bisnis Anda</p>
            </div>

            {plans.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <svg className="w-16 h-16 text-[#64748b] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <p className="text-[#94a3b8] text-lg font-medium">Belum ada plan tersedia</p>
                    <p className="text-[#64748b] text-sm mt-1">Silahkan hubungi admin untuk informasi lebih lanjut</p>
                </div>
            ) : (
                <div className={`grid gap-6 ${plans.length === 1 ? 'max-w-md mx-auto' : plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
                    {plans.map((plan, i) => (
                        <div key={plan.id} className={`pricing-card ${plans.length >= 3 && i === 1 ? 'popular' : ''}`}>
                            {plans.length >= 3 && i === 1 && (
                                <div className="absolute top-0 right-0 bg-gradient-to-r from-[#38bdf8] to-[#a78bfa] text-white text-xs font-bold px-4 py-1 rounded-bl-xl rounded-tr-2xl">
                                    POPULER
                                </div>
                            )}
                            <h3 className="text-[#94a3b8] font-medium text-sm uppercase tracking-wider mb-4">{plan.name}</h3>
                            <div className="mb-2">
                                <span className="text-4xl font-bold text-white">{formatRupiah(plan.price)}</span>
                            </div>
                            <p className="text-[#64748b] text-sm mb-6">per {plan.durationDays} hari</p>

                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-3 text-sm text-[#cbd5e1]">
                                    <svg className="w-4 h-4 text-[#34d399] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Maks {plan.maxMerchants} Merchant
                                </li>
                                <li className="flex items-center gap-3 text-sm text-[#cbd5e1]">
                                    <svg className="w-4 h-4 text-[#34d399] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {plan.maxWhitelistIps} Whitelist IP
                                </li>
                                <li className="flex items-center gap-3 text-sm text-[#cbd5e1]">
                                    <svg className="w-4 h-4 text-[#34d399] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Tanpa Limitasi API Request
                                </li>
                                <li className="flex items-center gap-3 text-sm text-[#cbd5e1]">
                                    <svg className="w-4 h-4 text-[#34d399] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Masa Aktif {plan.durationDays} Hari
                                </li>
                                <li className={`flex items-center gap-3 text-sm ${plan.prioritySupport ? 'text-[#cbd5e1]' : 'text-[#475569] line-through'}`}>
                                    <svg className={`w-4 h-4 shrink-0 ${plan.prioritySupport ? 'text-[#34d399]' : 'text-[#475569]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {plan.prioritySupport ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        )}
                                    </svg>
                                    Priority Support
                                </li>
                            </ul>

                            <button className={`btn w-full ${plans.length >= 3 && i === 1 ? 'btn-primary' : 'btn-outline'}`}>
                                Pilih Paket
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
