import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });

        const account = await prisma.digiflazzAccount.findUnique({
            where: { userId: user.id },
            select: { id: true, email: true, isConnected: true, lastUsedAt: true, createdAt: true },
        });

        return NextResponse.json({
            status: 'success',
            data: account ? { ...account, connected: account.isConnected } : null,
            saldo: user.saldo,
        });
    } catch (error) {
        console.error('Digiflazz account error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });

        await prisma.digiflazzAccount.deleteMany({ where: { userId: user.id } });

        return NextResponse.json({ status: 'success', message: 'Akun Digiflazz berhasil di-disconnect' });
    } catch (error) {
        console.error('Digiflazz disconnect error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
