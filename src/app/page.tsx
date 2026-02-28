'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { SiteSettingsProvider, SiteLogo } from '@/components/SiteSettingsProvider';

interface Plan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  maxMerchants: number;
  maxWhitelistIps: number;
  features?: string;
}

export default function HomePage() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    fetch('/api/admin/plans')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') setPlans(data.data.filter((p: Plan & { isActive: boolean }) => p.isActive));
      })
      .catch(() => { });
  }, []);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <SiteSettingsProvider>
      <div style={{ background: '#0d1117', minHeight: '100vh', color: '#c9d1d9', position: 'relative', overflow: 'hidden' }}>

        {/* Background glow effects */}
        <div style={{
          position: 'fixed', top: '-30%', left: '-20%', width: '60%', height: '60%',
          background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)',
          filter: 'blur(80px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'fixed', bottom: '-30%', right: '-20%', width: '60%', height: '60%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)',
          filter: 'blur(80px)', pointerEvents: 'none',
        }} />

        {/* Navbar */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 50,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          background: 'rgba(13,17,23,0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          padding: '14px 0',
        }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <SiteLogo size={24} showTitle />
            </Link>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/login" style={{
                padding: '8px 18px', borderRadius: 8,
                color: '#c9d1d9', fontSize: 14, fontWeight: 500,
                textDecoration: 'none', transition: 'all 0.2s',
              }}>Login</Link>
              <Link href="/register" style={{
                padding: '8px 18px', borderRadius: 8,
                background: '#0ea5e9', color: '#fff',
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
                transition: 'all 0.2s',
              }}>Daftar</Link>
            </div>
          </div>
        </nav>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>

          {/* Hero */}
          <section style={{ textAlign: 'center', padding: '80px 0 40px' }}>
            <h1 style={{
              fontSize: 'clamp(2rem, 6vw, 3rem)',
              fontWeight: 800, color: '#e6edf3',
              lineHeight: 1.2, marginBottom: 20,
              letterSpacing: '-0.02em',
            }}>
              Payment Gateway QRIS
              <br />
              <span style={{ color: '#0ea5e9' }}>untuk Developer & Bisnis</span>
            </h1>
            <p style={{
              fontSize: 'clamp(0.9rem, 2.5vw, 1.05rem)',
              color: '#8b949e', lineHeight: 1.7,
              maxWidth: 520, margin: '0 auto 40px',
            }}>
              Integrasi pembayaran QRIS melalui Tools Kami ke aplikasi Anda.
              API sederhana, notifikasi real-time, dashboard monitoring lengkap,
              dan sistem subscription fleksibel.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 440, margin: '0 auto' }}>
              <Link href="/register" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '16px 24px', borderRadius: 12,
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                color: '#fff', fontSize: 16, fontWeight: 700,
                textDecoration: 'none', transition: 'all 0.3s',
                boxShadow: '0 0 30px rgba(14,165,233,0.2)',
              }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Mulai Sekarang — Gratis
              </Link>
              <Link href="/api-docs" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 24px', borderRadius: 12,
                border: '1px solid rgba(14,165,233,0.3)',
                color: '#0ea5e9', fontSize: 15, fontWeight: 600,
                textDecoration: 'none', transition: 'all 0.3s',
              }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Lihat API Documentation
              </Link>
            </div>
          </section>

          {/* Services */}
          <section style={{ padding: '40px 0 60px' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, color: '#e6edf3', marginBottom: 12 }}>
                Semua yang Anda Butuhkan
              </h2>
              <p style={{ color: '#8b949e', fontSize: 15 }}>
                Platform payment gateway QRIS lengkap dengan fitur enterprise-grade
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />,
                  title: 'Tools Payment Gateway',
                  desc: 'Terintegrasi langsung dengan Merchant untuk menerima pembayaran QRIS otomatis dengan callback real-time',
                },
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />,
                  title: 'Subscription Plans',
                  desc: 'Sistem subscription fleksibel dengan pembatasan fitur sesuai plan yang dipilih user',
                },
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" />,
                  title: 'Merchant Management',
                  desc: 'Kelola beberapa akun Merchant dari satu dashboard terpusat dengan API key terpisah',
                },
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />,
                  title: 'Whitelist IP Security',
                  desc: 'Batasi akses API hanya dari IP yang diizinkan untuk keamanan maksimal transaksi Anda',
                },
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />,
                  title: 'REST API Lengkap',
                  desc: 'API terintegrasi dengan dokumentasi lengkap, mudah diintegrasikan dengan aplikasi atau website Anda',
                },
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />,
                  title: 'Dashboard Monitoring',
                  desc: 'Pantau semua transaksi real-time, statistik pendapatan, dan status pembayaran dari dashboard',
                },
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'rgba(22,27,34,0.6)',
                  border: '1px solid rgba(48,54,61,0.6)',
                  borderRadius: 16, padding: 24,
                  transition: 'all 0.3s',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: 'rgba(14,165,233,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16,
                  }}>
                    <svg width="22" height="22" fill="none" stroke="#0ea5e9" viewBox="0 0 24 24" strokeWidth={1.5}>
                      {item.icon}
                    </svg>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e6edf3', marginBottom: 8 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 14, color: '#8b949e', lineHeight: 1.6, margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* How it Works */}
          <section style={{ padding: '40px 0 60px' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, color: '#e6edf3', marginBottom: 12 }}>
                Cara Kerja
              </h2>
              <p style={{ color: '#8b949e', fontSize: 15 }}>
                Mulai terima pembayaran dalam 3 langkah mudah
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { step: '01', title: 'Buat Akun & Pilih Plan', desc: 'Daftar gratis, pilih subscription plan sesuai kebutuhan bisnis Anda' },
                { step: '02', title: 'Setup Merchant', desc: 'Tambahkan merchant GoBiz dan integrasikan API key ke aplikasi Anda' },
                { step: '03', title: 'Terima Pembayaran', desc: 'Mulai terima pembayaran QRIS otomatis dengan notifikasi real-time' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 16, alignItems: 'flex-start',
                  background: 'rgba(22,27,34,0.4)',
                  border: '1px solid rgba(48,54,61,0.4)',
                  borderRadius: 16, padding: 20,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: 'rgba(14,165,233,0.1)',
                    border: '1px solid rgba(14,165,233,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#0ea5e9', fontSize: 15, fontWeight: 800,
                    flexShrink: 0,
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>{item.title}</h3>
                    <p style={{ fontSize: 14, color: '#8b949e', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing */}
          {plans.length > 0 && (
            <section style={{ padding: '40px 0 60px' }}>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, color: '#e6edf3', marginBottom: 12 }}>
                  Pilih Plan Anda
                </h2>
                <p style={{ color: '#8b949e', fontSize: 15 }}>
                  Harga terjangkau untuk semua skala bisnis
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: plans.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {plans.map((plan, i) => (
                  <div key={plan.id} style={{
                    background: i === 0 ? 'rgba(14,165,233,0.06)' : 'rgba(22,27,34,0.6)',
                    border: `1px solid ${i === 0 ? 'rgba(14,165,233,0.3)' : 'rgba(48,54,61,0.6)'}`,
                    borderRadius: 16, padding: 28,
                    position: 'relative',
                  }}>
                    {i === 0 && (
                      <div style={{
                        position: 'absolute', top: 12, right: 12,
                        background: '#0ea5e9', color: '#fff',
                        fontSize: 10, fontWeight: 700,
                        padding: '3px 10px', borderRadius: 20,
                        textTransform: 'uppercase', letterSpacing: 1,
                      }}>Popular</div>
                    )}
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3', marginBottom: 8 }}>{plan.name}</h3>
                    <p style={{ fontSize: 28, fontWeight: 800, color: '#0ea5e9', marginBottom: 4 }}>
                      {formatRupiah(plan.price)}
                    </p>
                    <p style={{ fontSize: 13, color: '#8b949e', marginBottom: 20 }}>per {plan.durationDays} hari</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                      {[
                        `${plan.maxMerchants} Merchant`,
                        `${plan.maxWhitelistIps} Whitelist IP`,
                        `${plan.durationDays} Hari Aktif`,
                        'API Access',
                        'Dashboard Monitoring',
                      ].map((f, fi) => (
                        <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8b949e' }}>
                          <svg width="14" height="14" fill="none" stroke="#0ea5e9" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {f}
                        </div>
                      ))}
                    </div>

                    <Link href="/register" style={{
                      display: 'block', textAlign: 'center',
                      padding: '12px 20px', borderRadius: 10,
                      background: i === 0 ? '#0ea5e9' : 'transparent',
                      border: i === 0 ? 'none' : '1px solid rgba(14,165,233,0.3)',
                      color: i === 0 ? '#fff' : '#0ea5e9',
                      fontSize: 14, fontWeight: 600, textDecoration: 'none',
                      transition: 'all 0.3s',
                    }}>
                      Pilih Plan
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* API Preview */}
          <section style={{ padding: '40px 0 60px' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, color: '#e6edf3', marginBottom: 12 }}>
                API yang Mudah Digunakan
              </h2>
              <p style={{ color: '#8b949e', fontSize: 15 }}>
                Integrasikan dalam hitungan menit
              </p>
            </div>
            <div style={{
              background: 'rgba(22,27,34,0.8)',
              border: '1px solid rgba(48,54,61,0.6)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: '1px solid rgba(48,54,61,0.6)',
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f87171' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399' }} />
                </div>
                <span style={{ fontSize: 12, color: '#484f58', fontFamily: 'monospace' }}>POST /api/order</span>
              </div>
              <pre style={{
                padding: 20, margin: 0,
                fontSize: 13, lineHeight: 1.8,
                fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                color: '#c9d1d9', overflowX: 'auto',
              }}>
                {`{
  "status": "success",
  "data": {
    "trx_id": "TRX250209001",
    "amount": 50000,
    "qr_image": "https://..."
  }
}`}
              </pre>
            </div>
          </section>

          {/* CTA */}
          <section style={{ padding: '40px 0 80px', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, color: '#e6edf3', marginBottom: 12 }}>
              Siap Mulai?
            </h2>
            <p style={{ color: '#8b949e', fontSize: 15, marginBottom: 28 }}>
              Daftar sekarang dan mulai terima pembayaran QRIS dalam hitungan menit
            </p>
            <Link href="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', borderRadius: 12,
              background: '#0ea5e9', color: '#fff',
              fontSize: 15, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 0 30px rgba(14,165,233,0.2)',
            }}>
              Daftar Gratis
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </section>
        </div>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid rgba(48,54,61,0.5)',
          padding: '24px 20px',
          textAlign: 'center',
        }}>
          <p style={{ color: '#484f58', fontSize: 13 }}>
            © {new Date().getFullYear()} Payment Gateway. All rights reserved.
          </p>
        </footer>
      </div>
    </SiteSettingsProvider>
  );
}
