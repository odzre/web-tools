'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, createContext, useContext } from 'react';
import { SiteSettingsProvider, SiteLogo } from '@/components/SiteSettingsProvider';

interface User {
    id: string;
    username: string;
    email: string;
    whatsapp: string;
    role: string;
    apiKey: string;
    isVerified: boolean;
    planId: string | null;
    planExpiresAt: string | null;
    plan: { name: string } | null;
}

const UserContext = createContext<{ user: User | null; refreshUser: () => void }>({
    user: null,
    refreshUser: () => { },
});

export const useUser = () => useContext(UserContext);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [toolsOpen, setToolsOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.status !== 'success') {
                router.push('/login');
                return;
            }
            setUser(data.data);
        } catch {
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const menuItems = [
        {
            label: 'Dashboard',
            href: '/user/dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        {
            label: 'Subscribe',
            href: '/user/subscribe',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
            ),
        },
        {
            label: 'Deposit Saldo',
            href: '/user/deposit',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
    ];

    const toolItems = [
        {
            label: 'GoPay Merchant',
            href: '/user/tools/gopay',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            ),
        },
        {
            label: 'OrderKuota',
            href: '/user/tools/orderkuota',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            ),
        },
        {
            label: 'Digiflazz',
            href: '/user/tools/digiflazz',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ),
        },
    ];

    const bottomItems = [
        {
            label: 'Pengaturan',
            href: '/user/settings',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
        {
            label: 'Dokumentasi API',
            href: '/user/docs',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner w-8 h-8" />
            </div>
        );
    }

    return (
        <SiteSettingsProvider>
            <UserContext.Provider value={{ user, refreshUser: fetchUser }}>
                <div className="min-h-screen flex flex-col overflow-x-hidden">
                    {/* Navbar */}
                    <nav className="glass-strong border-b border-[#334155]/50 fixed top-0 left-0 right-0 z-50 h-16">
                        <div className="flex items-center justify-between h-full px-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        if (window.innerWidth < 768) {
                                            setMobileMenuOpen(!mobileMenuOpen);
                                        } else {
                                            setSidebarOpen(!sidebarOpen);
                                        }
                                    }}
                                    className="p-2 rounded-lg hover:bg-[#334155]/50 transition"
                                >
                                    <svg className="w-5 h-5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                                <Link href="/" className="flex items-center gap-2">
                                    <SiteLogo size="sm" />
                                </Link>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="hidden sm:flex items-center gap-2 glass px-3 py-1.5 rounded-full">
                                    <span className={`w-2 h-2 rounded-full ${user?.planId ? 'bg-[#34d399]' : 'bg-[#f87171]'}`} />
                                    <span className="text-xs text-[#94a3b8]">{user?.plan?.name || 'No Plan'}</span>
                                </div>

                                {user?.role === 'ADMIN' && (
                                    <Link
                                        href="/admin/dashboard"
                                        className="flex items-center gap-1.5 bg-gradient-to-r from-[#f87171]/20 to-[#fb923c]/20 border border-[#f87171]/30 px-3 py-1.5 rounded-full hover:from-[#f87171]/30 hover:to-[#fb923c]/30 transition"
                                    >
                                        <svg className="w-3.5 h-3.5 text-[#fb923c]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                        </svg>
                                        <span className="text-xs text-[#fb923c] font-semibold">ADMIN</span>
                                    </Link>
                                )}

                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#38bdf8] to-[#a78bfa] flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">{user?.username?.[0]?.toUpperCase()}</span>
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-sm font-medium text-white">{user?.username}</p>
                                        <p className="text-xs text-[#64748b]">{user?.email}</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 rounded-lg hover:bg-[#334155]/50 transition ml-2"
                                        title="Logout"
                                    >
                                        <svg className="w-5 h-5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </nav>

                    <div className="flex pt-16 min-h-screen overflow-x-hidden">
                        {/* Mobile overlay */}
                        {mobileMenuOpen && (
                            <div
                                className="fixed inset-0 bg-black/40 z-30 md:hidden"
                                onClick={() => setMobileMenuOpen(false)}
                            />
                        )}

                        {/* Sidebar */}
                        <aside
                            className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] glass-strong border-r border-[#334155]/50 z-40 flex flex-col transition-all duration-300 ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
                                } ${!mobileMenuOpen && sidebarOpen ? 'w-64' : !mobileMenuOpen ? 'w-20' : ''}`}
                        >
                            <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                                {menuItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                                    >
                                        {item.icon}
                                        {(sidebarOpen || mobileMenuOpen) && <span>{item.label}</span>}
                                    </Link>
                                ))}

                                {/* Tools dropdown */}
                                <div>
                                    <button
                                        onClick={() => setToolsOpen(!toolsOpen)}
                                        className="sidebar-link w-full justify-between"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                            </svg>
                                            {(sidebarOpen || mobileMenuOpen) && <span>Tools</span>}
                                        </div>
                                        {(sidebarOpen || mobileMenuOpen) && (
                                            <svg className={`w-4 h-4 text-[#64748b] transition-transform ${toolsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        )}
                                    </button>

                                    {toolsOpen && (sidebarOpen || mobileMenuOpen) && (
                                        <div className="pl-4 space-y-1 mt-1">
                                            {toolItems.map((item) => (
                                                <Link
                                                    key={item.label}
                                                    href={item.href}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className={`sidebar-link text-sm ${pathname === item.href ? 'active' : ''}`}
                                                >
                                                    {item.icon}
                                                    <span>{item.label}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-[#334155]/50 my-3" />

                                {bottomItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                                    >
                                        {item.icon}
                                        {(sidebarOpen || mobileMenuOpen) && <span>{item.label}</span>}
                                    </Link>
                                ))}
                            </div>
                        </aside>

                        {/* Main content */}
                        <main className="flex-1 flex flex-col min-h-[calc(100vh-4rem)] min-w-0 overflow-x-hidden">
                            <div className="flex-1 p-4 md:p-6 lg:p-8">
                                {children}
                            </div>

                            {/* Footer */}
                            <footer className="border-t border-[#334155]/30 px-6 py-4">
                                <div className="flex items-center justify-between text-xs text-[#64748b]">
                                    <span>© 2025 MyCash Payment Gateway</span>
                                    <span>v1.0.0</span>
                                </div>
                            </footer>
                        </main>
                    </div>
                </div>
            </UserContext.Provider>
        </SiteSettingsProvider>
    );
}
