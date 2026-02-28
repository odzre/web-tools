'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface SiteSettings {
    siteTitle: string;
    favicon: string | null;
    logo: string | null;
}

const SiteSettingsContext = createContext<SiteSettings>({
    siteTitle: 'MyCash Payment Gateway',
    favicon: null,
    logo: null,
});

export function useSiteSettings() {
    return useContext(SiteSettingsContext);
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<SiteSettings>({
        siteTitle: 'MyCash Payment Gateway',
        favicon: null,
        logo: null,
    });

    useEffect(() => {
        fetch('/api/settings')
            .then(r => r.json())
            .then(data => {
                if (data.status === 'success') {
                    setSettings(data.data);
                }
            })
            .catch(() => { /* use defaults */ });
    }, []);

    return (
        <SiteSettingsContext.Provider value={settings}>
            {children}
        </SiteSettingsContext.Provider>
    );
}

// Reusable logo component for navbars
export function SiteLogo({ size = 'md', showTitle = false }: { size?: 'sm' | 'md' | 'lg' | number; showTitle?: boolean }) {
    const { logo, siteTitle } = useSiteSettings();

    const sizeMap: Record<string, string> = {
        sm: 'w-7 h-7',
        md: 'w-8 h-8',
        lg: 'w-9 h-9',
    };

    const isPixel = typeof size === 'number';
    const displayName = siteTitle || 'Logo';

    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {logo ? (
                <img
                    src={logo}
                    alt={displayName}
                    className={isPixel ? undefined : sizeMap[size as string]}
                    style={isPixel ? { width: size, height: size, objectFit: 'contain' } : { objectFit: 'contain' }}
                />
            ) : null}
            {showTitle && <span style={{ fontWeight: 700, fontSize: 15, color: '#e6edf3' }}>{displayName}</span>}
        </span>
    );
}
