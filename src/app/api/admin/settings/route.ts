import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET site settings
export async function GET() {
    try {
        let settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });

        if (!settings) {
            settings = await prisma.siteSettings.create({
                data: { id: 'default', siteTitle: 'MyCash Payment Gateway' },
            });
        }

        return NextResponse.json({ status: 'success', data: settings });
    } catch (error) {
        console.error('Get settings error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

// UPDATE site settings (admin only)
export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { siteTitle, favicon, logo, qrisApiKey, qrisProject } = body;

        const updateData: Record<string, unknown> = {};
        if (siteTitle) updateData.siteTitle = siteTitle;
        if (favicon !== undefined) updateData.favicon = favicon;
        if (logo !== undefined) updateData.logo = logo;
        if (qrisApiKey !== undefined) updateData.qrisApiKey = qrisApiKey;
        if (qrisProject !== undefined) updateData.qrisProject = qrisProject;

        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            update: updateData,
            create: { id: 'default', siteTitle: siteTitle || 'MyCash Payment Gateway', favicon, logo },
        });

        return NextResponse.json({ status: 'success', message: 'Pengaturan berhasil diperbarui' });
    } catch (error) {
        console.error('Update settings error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
