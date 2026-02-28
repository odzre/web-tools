'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SiteSettingsProvider, SiteLogo } from '@/components/SiteSettingsProvider';

interface Endpoint {
    method: 'POST' | 'GET' | 'INFO';
    label: string;
    path: string;
    headers: string[];
    requestBody?: string;
    requestCurl: string;
    response: string;
}

const BASE_URL = 'https://yourdomain.com';

const endpoints: Endpoint[] = [
    {
        method: 'POST',
        label: 'PROFILE',
        path: '/api/profile',
        headers: ['Content-Type: application/json'],
        requestBody: `{
    "apikey": "your-api-key"
}`,
        requestCurl: `curl -X POST "${BASE_URL}/api/profile" \\
    -H "Content-Type: application/json" \\
    -d '{"apikey": "your-api-key"}'`,
        response: `{
    "status": "success",
    "data": {
        "name": "John Doe",
        "email": "user@example.com",
        "membership": "Free",
        "api_request_count": 150
    }
}`,
    },
    {
        method: 'POST',
        label: 'ORDER',
        path: '/api/order',
        headers: ['Content-Type: application/json'],
        requestBody: `{
    "apikey": "your-api-key",    // required
    "nama_project": "string",   // required
    "ref_id": "string",         // required
    "amount": 50000,            // required
    "customer_name": "string",  // required
    "expired": 60               // optional (menit)
}`,
        requestCurl: `curl -X POST "${BASE_URL}/api/order" \\
    -H "Content-Type: application/json" \\
    -d '{"apikey": "your-api-key", "nama_project": "Toko Online", "ref_id": "ORDER-1001", "amount": 50000, "customer_name": "John Doe", "expired": 60}'`,
        response: `{
    "status": "success",
    "code": 200,
    "message": "Transaksi berhasil dibuat",
    "data": {
        "trx_id": "TRX250209001",
        "ref_id": "ORDER-1001",
        "amount": 50000,
        "unique_code": 123,
        "total_amount": 50123,
        "payment_type": "qris",
        "payment_status": "pending",
        "expires_at": "2025-02-09T18:00:00.000Z",
        "payment_detail": {
            "qr_string": "00020101021226...",
            "qr_image": "https://quickchart.io/qr?text=..."
        }
    }
}`,
    },
    {
        method: 'POST',
        label: 'CHECK STATUS',
        path: '/api/status',
        headers: ['Content-Type: application/json'],
        requestBody: `{
    "apikey": "your-api-key",   // required
    "ref_id": "string"          // required
}`,
        requestCurl: `curl -X POST "${BASE_URL}/api/status" \\
    -H "Content-Type: application/json" \\
    -d '{"apikey": "your-api-key", "ref_id": "ORDER-1001"}'`,
        response: `{
    "status": "success",
    "code": 200,
    "message": "Pembayaran berhasil",
    "data": {
        "trx_id": "TRX250209001",
        "ref_id": "ORDER-1001",
        "amount": 50000,
        "total_amount": 50123,
        "payment_type": "qris",
        "payment_status": "paid",
        "paid_at": "2025-02-09T17:45:21.000Z"
    }
}`,
    },
];

const errorCodes = [
    { code: 200, status: 'Success', desc: 'Request berhasil diproses' },
    { code: 400, status: 'Bad Request', desc: 'Parameter tidak lengkap atau tidak valid' },
    { code: 401, status: 'Unauthorized', desc: 'API key tidak valid' },
    { code: 404, status: 'Not Found', desc: 'Data tidak ditemukan' },
    { code: 409, status: 'Conflict', desc: 'Data sudah ada (duplikat)' },
    { code: 429, status: 'Too Many Requests', desc: 'Rate limit exceeded' },
    { code: 500, status: 'Server Error', desc: 'Terjadi kesalahan pada server' },
];

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            className="ref-copy-btn"
            onClick={() => {
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }}
        >
            {copied ? 'Copied!' : 'Copy'}
        </button>
    );
}

function CodeBlock({ code, label, showCopy = true }: { code: string; label?: string; showCopy?: boolean }) {
    return (
        <div className="ref-codeblock">
            {showCopy && <CopyButton text={code} />}
            <pre className="ref-codeblock-pre"><code>{code}</code></pre>
        </div>
    );
}

function AccordionItem({ ep }: { ep: Endpoint }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="ref-accordion-card">
            <button
                className="ref-accordion-btn"
                onClick={() => setOpen(!open)}
                type="button"
            >
                <div className="ref-accordion-left">
                    <span className={`ref-method-pill ${ep.method === 'POST' ? 'ref-method-post' : ep.method === 'INFO' ? 'ref-method-info' : 'ref-method-get'}`}>
                        {ep.method}
                    </span>
                    <span className="ref-label-pill">{ep.label}</span>
                </div>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className={`ref-chevron ${open ? 'ref-chevron-open' : ''}`}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
            </button>

            {open && (
                <div className="ref-accordion-content">
                    <div className="ref-accordion-grid">
                        {/* Left column */}
                        <div className="ref-accordion-col">
                            <div>
                                <div className="ref-section-title">Endpoint</div>
                                <div className="ref-muted-text">{ep.path}</div>
                            </div>

                            <div>
                                <div className="ref-section-title">Headers</div>
                                <div className="ref-headers-list">
                                    {ep.headers.map((h, i) => (
                                        <div key={i} className="ref-header-mono">{h}</div>
                                    ))}
                                </div>
                            </div>

                            {ep.requestBody && (
                                <div>
                                    <div className="ref-section-title">Request Body</div>
                                    <CodeBlock code={ep.requestBody} />
                                </div>
                            )}
                        </div>

                        {/* Right column */}
                        <div className="ref-accordion-col">
                            <div>
                                <div className="ref-section-title">Request</div>
                                <CodeBlock code={ep.requestCurl} />
                            </div>

                            <div>
                                <div className="ref-section-title">Response (200)</div>
                                <CodeBlock code={ep.response} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ErrorCodesAccordion() {
    const [open, setOpen] = useState(false);

    return (
        <div className="ref-accordion-card">
            <button
                className="ref-accordion-btn"
                onClick={() => setOpen(!open)}
                type="button"
            >
                <div className="ref-accordion-left">
                    <span className="ref-method-pill ref-method-info">INFO</span>
                    <span className="ref-label-pill">ERROR CODES</span>
                </div>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className={`ref-chevron ${open ? 'ref-chevron-open' : ''}`}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
            </button>

            {open && (
                <div className="ref-accordion-content">
                    <div className="ref-error-table">
                        <div className="ref-error-header">
                            <span>Code</span>
                            <span>Status</span>
                            <span>Description</span>
                        </div>
                        {errorCodes.map((e, i) => (
                            <div key={i} className="ref-error-row">
                                <span className="ref-error-code">{e.code}</span>
                                <span className="ref-error-status">{e.status}</span>
                                <span className="ref-error-desc">{e.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PublicDocsPage() {
    return (
        <SiteSettingsProvider>
            <div className="min-h-screen relative overflow-hidden">
                {/* Background */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-[#38bdf8] rounded-full opacity-[0.03] blur-[100px]" />
                    <div className="absolute bottom-[-200px] right-[-200px] w-[600px] h-[600px] bg-[#a78bfa] rounded-full opacity-[0.03] blur-[100px]" />
                </div>

                {/* Navbar */}
                <nav className="relative z-10 glass-strong border-b border-[#334155]/50">
                    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2">
                            <SiteLogo size="sm" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <Link href="/login" className="btn btn-outline text-sm px-5 py-2">Login</Link>
                            <Link href="/register" className="btn btn-primary text-sm px-5 py-2">Daftar</Link>
                        </div>
                    </div>
                </nav>

                {/* Content */}
                <main className="relative z-10">
                    <div className="ref-container">
                        {/* Header */}
                        <div className="ref-intro">
                            <div className="ref-version-pill">Version 1.0.0</div>
                            <h1 className="ref-page-title">DOCUMENTATION API Odzre</h1>
                            <p className="ref-page-desc">
                                Selamat datang di dokumentasi integrasi API Odzre. Panduan ini akan membantu Anda memahami cara mengintegrasikan layanan kami dengan mudah dan efisien.
                            </p>
                        </div>

                        <hr className="ref-divider" />

                        {/* Getting Started */}
                        <div className="ref-section">
                            <h2 className="ref-heading">Getting Started</h2>
                            <p className="ref-text">
                                Untuk memulai integrasi, tersedia satu metode yaitu melalui API menggunakan metode POST. Anda akan membutuhkan API Key untuk dapat mengakses layanan ini.
                            </p>
                        </div>

                        {/* Authorization */}
                        <div className="ref-section">
                            <h2 className="ref-heading">Authorization</h2>
                            <p className="ref-text">
                                - API Key otomatis dibuat saat registrasi. Lihat di <Link href="/user/dashboard" className="ref-link">Dashboard → Account Settings</Link>.
                            </p>
                            <p className="ref-text">
                                - Kirim <code className="ref-inline-code">apikey</code> di setiap <strong>Request Body</strong>.
                            </p>
                        </div>

                        {/* API Section */}
                        <div className="ref-api-section">
                            <h2 className="ref-api-title">API</h2>

                            <div className="ref-accordion-list">
                                {endpoints.map((ep, i) => (
                                    <AccordionItem key={i} ep={ep} />
                                ))}
                                <ErrorCodesAccordion />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </SiteSettingsProvider>
    );
}
