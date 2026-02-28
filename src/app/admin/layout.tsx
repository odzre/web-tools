'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { SiteLogo, SiteSettingsProvider } from '@/components/SiteSettingsProvider';

interface AdminUser {
    id: string;
    username: string;
    email: string;
    role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<AdminUser | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => r.json())
            .then(data => {
                if (data.status !== 'success' || data.data.role !== 'ADMIN') {
                    router.push('/user/dashboard');
                    return;
                }
                setUser(data.data);
                setLoading(false);
            })
            .catch(() => router.push('/login'));
    }, [router]);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const sidebarItems = [
        {
            label: 'Dashboard',
            href: '/admin/dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
            ),
        },
        {
            label: 'Kelola Website',
            href: '/admin/website',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
        {
            label: 'Kelola Plan',
            href: '/admin/plans',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
            ),
        },
        {
            label: 'Kelola Member',
            href: '/admin/members',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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
            <div className="min-h-screen flex flex-col">
                {/* Navbar */}
                <nav className="glass-strong border-b border-[#334155]/50 fixed top-0 left-0 right-0 z-50 h-16">
                    <div className="flex items-center justify-between h-full px-4">
                        <div className="flex items-center gap-3">
                            {/* Burger */}
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

                            {/* Logo */}
                            <Link href="/" className="flex items-center gap-2">
                                <SiteLogo size="sm" />
                            </Link>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Website button */}
                            <Link
                                href="/user/dashboard"
                                className="btn btn-outline text-xs px-4 py-1.5 flex items-center gap-1.5"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                                Website
                            </Link>

                            {/* Admin badge */}
                            <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-[#f87171]/20 to-[#fb923c]/20 border border-[#f87171]/30 px-3 py-1.5 rounded-full">
                                <svg className="w-3.5 h-3.5 text-[#fb923c]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                </svg>
                                <span className="text-xs text-[#fb923c] font-semibold">ADMIN</span>
                            </div>

                            {/* User info */}
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f87171] to-[#fb923c] flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">{user?.username?.[0]?.toUpperCase()}</span>
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-sm font-medium text-white">{user?.username}</p>
                                    <p className="text-xs text-[#64748b]">{user?.email}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-lg hover:bg-[#334155]/50 transition ml-1"
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

                <div className="flex pt-16 min-h-screen">
                    {/* Mobile overlay */}
                    {mobileMenuOpen && (
                        <div
                            className="fixed inset-0 bg-black/40 z-30 md:hidden"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                    )}

                    {/* Sidebar */}
                    <aside
                        className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] glass-strong border-r border-[#334155]/50 z-40 flex flex-col transition-all duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                            } ${sidebarOpen ? 'w-64' : 'w-20'}`}
                    >
                        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                            {sidebarItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                                >
                                    {item.icon}
                                    {sidebarOpen && <span>{item.label}</span>}
                                </Link>
                            ))}
                        </div>

                        {/* Sidebar footer */}
                        {sidebarOpen && (
                            <div className="px-3 py-4 border-t border-[#334155]/50">
                                <div className="glass rounded-xl p-3 text-center">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f87171] to-[#fb923c] flex items-center justify-center mx-auto mb-2">
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                        </svg>
                                    </div>
                                    <p className="text-xs text-[#94a3b8]">Admin Panel</p>
                                    <p className="text-[10px] text-[#64748b] mt-1">v1.0.0</p>
                                </div>
                            </div>
                        )}
                    </aside>

                    {/* Main content */}
                    <main className="flex-1 flex flex-col min-h-[calc(100vh-4rem)]">
                        <div className="flex-1 p-4 md:p-6 lg:p-8">
                            {children}
                        </div>

                        {/* Footer */}
                        <footer className="border-t border-[#334155]/30 px-6 py-4">
                            <div className="flex items-center justify-between text-xs text-[#64748b]">
                                <span>© 2025 MyCash Payment Gateway</span>
                                <span>Admin Panel v1.0.0</span>
                            </div>
                        </footer>
                    </main>
                </div>
            </div>
        </SiteSettingsProvider>
    );
}
