'use client';

import { useState } from 'react';

interface Endpoint {
    method: string;
    path: string;
    description: string;
    body: Record<string, string>;
    response: string;
}

const endpoints: Endpoint[] = [
    {
        method: 'POST',
        path: '/api/profile',
        description: 'Mengambil data profil user berdasarkan API key',
        body: {
            apikey: 'API key Anda',
        },
        response: JSON.stringify({
            status: 'Success',
            data: {
                name: 'Jhon Doe',
                email: 'user@example.com',
            },
        }, null, 2),
    },
    {
        method: 'POST',
        path: '/api/order',
        description: 'Membuat transaksi/order pembayaran baru',
        body: {
            apikey: 'API key Anda',
            nama_project: 'Nama project merchant',
            ref_id: 'Reference ID unik Anda',
            amount: 'Jumlah pembayaran (integer)',
            customer_name: 'Nama customer (opsional)',
            expired: 'Masa kadaluarsa dalam menit (opsional, default 60)',
        },
        response: JSON.stringify({
            status: 'success',
            code: 200,
            message: 'Transaksi berhasil dibuat',
            data: {
                trx_id: 'TRX250209001',
                ref_id: 'ORDER-1001',
                amount: 50000,
                unique_code: 123,
                total_amount: 50123,
                payment_type: 'qris',
                payment_status: 'pending',
                expires_at: '2025-02-09T18:00:00.000Z',
                payment_detail: {
                    qr_string: '00020101021226...',
                    qr_image: 'https://quickchart.io/qr?text=...',
                },
            },
        }, null, 2),
    },
    {
        method: 'POST',
        path: '/api/status',
        description: 'Mengecek status pembayaran berdasarkan reference ID',
        body: {
            apikey: 'API key Anda',
            ref_id: 'Reference ID transaksi',
        },
        response: JSON.stringify({
            status: 'success',
            code: 200,
            message: 'Pembayaran berhasil',
            data: {
                trx_id: 'TRX250209001',
                ref_id: 'ORDER-1001',
                amount: 50000,
                total_amount: 50123,
                payment_type: 'qris',
                payment_status: 'paid',
                paid_at: '2025-02-09T17:45:21.000Z',
            },
        }, null, 2),
    },
];

export default function DocsPage() {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const copyCode = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
            <div>
                <h1 className="text-3xl font-bold text-white">Dokumentasi API</h1>
                <p className="text-[#94a3b8] mt-2">
                    Panduan lengkap integrasi MyCash Payment Gateway API
                </p>
            </div>

            {/* Getting started */}
            <div className="glass rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">🚀 Memulai</h2>
                <div className="space-y-3 text-sm text-[#cbd5e1]">
                    <p>1. <strong>Daftar</strong> akun di MyCash</p>
                    <p>2. <strong>Tambahkan</strong> GoPay Merchant melalui menu Tools → GoPay Merchant</p>
                    <p>3. <strong>Upload QRIS</strong> statis dari akun GoBiz Anda</p>
                    <p>4. <strong>Gunakan API key</strong> untuk membuat transaksi via API</p>
                </div>

                <div className="mt-4 p-4 bg-[#0f172a] rounded-xl border border-[#334155]">
                    <p className="text-xs text-[#64748b] mb-2">Base URL</p>
                    <code className="text-[#38bdf8] text-sm font-mono">{typeof window !== 'undefined' ? window.location.origin : 'https://mycash.my.id'}</code>
                </div>
            </div>

            {/* Authentication */}
            <div className="glass rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">🔑 Autentikasi</h2>
                <p className="text-sm text-[#cbd5e1] mb-4">
                    Semua request API memerlukan parameter <code className="text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded">apikey</code> di dalam body request.
                    API key bisa didapatkan di menu Pengaturan dashboard.
                </p>
                <div className="code-block">
                    <div className="code-header">
                        <span className="text-[#64748b] text-xs">Request Body</span>
                    </div>
                    <pre className="text-[#e2e8f0]">
                        {`{
  "apikey": "mk_your_api_key_here"
}`}
                    </pre>
                </div>
            </div>

            {/* Endpoints */}
            {endpoints.map((ep, i) => (
                <div key={i} className="glass rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="bg-[#38bdf8]/15 text-[#38bdf8] text-xs font-bold px-3 py-1 rounded-lg">{ep.method}</span>
                        <code className="text-white font-mono text-lg">{ep.path}</code>
                    </div>
                    <p className="text-[#94a3b8] text-sm mb-6">{ep.description}</p>

                    {/* Request body */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Request Body</h3>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Parameter</th>
                                        <th>Deskripsi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(ep.body).map(([key, desc]) => (
                                        <tr key={key}>
                                            <td><code className="text-[#38bdf8] text-xs font-mono">{key}</code></td>
                                            <td className="text-sm text-[#94a3b8]">{desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Response */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider">Response</h3>
                            <button
                                onClick={() => copyCode(ep.response, i)}
                                className="text-xs text-[#64748b] hover:text-[#38bdf8] transition flex items-center gap-1"
                            >
                                {copiedIndex === i ? (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Tersalin!
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Salin
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="code-block">
                            <div className="code-header">
                                <span className="text-[#64748b] text-xs">JSON Response</span>
                                <span className="badge badge-success text-xs">200 OK</span>
                            </div>
                            <pre className="text-[#e2e8f0]">{ep.response}</pre>
                        </div>
                    </div>
                </div>
            ))}

            {/* Rate limiting */}
            <div className="glass rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">⚡ Rate Limiting</h2>
                <p className="text-sm text-[#cbd5e1] mb-4">
                    Setiap API key memiliki batas request tergantung paket langganan:
                </p>
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Paket</th>
                                <th>Limit</th>
                                <th>Window</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Starter</td>
                                <td>100 req/hari</td>
                                <td>Per hari</td>
                            </tr>
                            <tr>
                                <td>Business</td>
                                <td>5.000 req/hari</td>
                                <td>Per hari</td>
                            </tr>
                            <tr>
                                <td>Enterprise</td>
                                <td>Unlimited</td>
                                <td>-</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Error codes */}
            <div className="glass rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">❌ Kode Error</h2>
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Deskripsi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>400</td><td className="text-sm text-[#94a3b8]">Bad request - parameter tidak valid</td></tr>
                            <tr><td>401</td><td className="text-sm text-[#94a3b8]">API key tidak valid</td></tr>
                            <tr><td>403</td><td className="text-sm text-[#94a3b8]">Langganan tidak aktif</td></tr>
                            <tr><td>404</td><td className="text-sm text-[#94a3b8]">Resource tidak ditemukan</td></tr>
                            <tr><td>409</td><td className="text-sm text-[#94a3b8]">ref_id sudah digunakan</td></tr>
                            <tr><td>429</td><td className="text-sm text-[#94a3b8]">Rate limit exceeded</td></tr>
                            <tr><td>500</td><td className="text-sm text-[#94a3b8]">Server error</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
