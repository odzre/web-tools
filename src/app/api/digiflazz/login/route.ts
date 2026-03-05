import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { loginDigiflazz } from '@/lib/digiflazz';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });

        const { email, password } = await req.json();
        if (!email || !password) {
            return NextResponse.json({ status: 'error', message: 'Email dan password wajib diisi' }, { status: 400 });
        }

        // Check if already connected
        const existing = await prisma.digiflazzAccount.findUnique({ where: { userId: user.id } });
        if (existing?.isConnected) {
            return NextResponse.json({ status: 'error', message: 'Akun Digiflazz sudah terhubung. Disconnect dulu untuk login ulang.' }, { status: 409 });
        }

        const logs: string[] = [];
        const result = await loginDigiflazz(email, password, (msg) => logs.push(msg));

        if (result.status === 'success' && result.cookies) {
            // Save/update account
            await prisma.digiflazzAccount.upsert({
                where: { userId: user.id },
                update: { email, cookiesData: result.cookies, isConnected: true, lastUsedAt: new Date() },
                create: { userId: user.id, email, cookiesData: result.cookies, isConnected: true, lastUsedAt: new Date() },
            });
            return NextResponse.json({ status: 'success', message: 'Login berhasil', logs });
        }

        if (result.status === 'need_2fa' && result.cookies) {
            return NextResponse.json({
                status: 'success',
                data: { need2fa: true, tempCookies: result.cookies, message: result.message },
                logs,
            });
        }

        return NextResponse.json({ status: 'error', message: result.message || 'Login gagal', logs }, { status: 400 });
    } catch (error) {
        console.error('Digiflazz login error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
