import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Public endpoint - no auth required
// Returns site settings for use by all pages (title, favicon, logo)
export async function GET() {
    try {
        let settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });

        if (!settings) {
            settings = await prisma.siteSettings.create({
                data: { id: 'default', siteTitle: 'MyCash Payment Gateway' },
            });
        }

        return NextResponse.json({
            status: 'success',
            data: {
                siteTitle: settings.siteTitle,
                favicon: settings.favicon,
                logo: settings.logo,
            },
        });
    } catch (error) {
        console.error('Get public settings error:', error);
        return NextResponse.json({
            status: 'success',
            data: {
                siteTitle: 'MyCash Payment Gateway',
                favicon: null,
                logo: null,
            },
        });
    }
}
