import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { verify2FA } from '@/lib/digiflazz';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });

        const { tempCookies, code, email } = await req.json();
        if (!tempCookies || !code) {
            return NextResponse.json({ status: 'error', message: 'tempCookies dan code wajib diisi' }, { status: 400 });
        }

        const logs: string[] = [];
        const result = await verify2FA(tempCookies, code, (msg) => logs.push(msg));

        if (result.status === 'success' && result.cookies) {
            await prisma.digiflazzAccount.upsert({
                where: { userId: user.id },
                update: { email: email || '', cookiesData: result.cookies, isConnected: true, lastUsedAt: new Date() },
                create: { userId: user.id, email: email || '', cookiesData: result.cookies, isConnected: true, lastUsedAt: new Date() },
            });
            return NextResponse.json({ status: 'success', message: 'Verifikasi 2FA berhasil', logs });
        }

        return NextResponse.json({ status: 'error', message: result.message || 'Verifikasi gagal', logs }, { status: 400 });
    } catch (error) {
        console.error('Digiflazz 2FA error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
