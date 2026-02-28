import prisma from '@/lib/prisma';

interface SiteSettings {
    siteTitle: string;
    favicon: string | null;
    logo: string | null;
}

export async function getSiteSettings(): Promise<SiteSettings> {
    try {
        let settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });

        if (!settings) {
            settings = await prisma.siteSettings.create({
                data: { id: 'default', siteTitle: 'MyCash Payment Gateway' },
            });
        }

        return {
            siteTitle: settings.siteTitle,
            favicon: settings.favicon,
            logo: settings.logo,
        };
    } catch (error) {
        console.error('Failed to fetch site settings:', error);
        return {
            siteTitle: 'MyCash Payment Gateway',
            favicon: null,
            logo: null,
        };
    }
}
