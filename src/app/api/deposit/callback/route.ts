import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { trxId } = await req.json();

        if (!trxId) {
            return NextResponse.json({ status: 'error', message: 'trxId wajib' }, { status: 400 });
        }

        const transaction = await prisma.transaction.findUnique({ where: { trxId } });
        if (!transaction) {
            return NextResponse.json({ status: 'error', message: 'Transaksi tidak ditemukan' }, { status: 404 });
        }

        if (transaction.toolType !== 'deposit') {
            return NextResponse.json({ status: 'error', message: 'Bukan transaksi deposit' }, { status: 400 });
        }

        if (transaction.paymentStatus === 'paid') {
            return NextResponse.json({ status: 'success', message: 'Deposit sudah diproses sebelumnya' });
        }

        if (new Date() > transaction.expiresAt) {
            await prisma.transaction.update({ where: { id: transaction.id }, data: { paymentStatus: 'expired' } });
            return NextResponse.json({ status: 'error', message: 'Deposit sudah expired' }, { status: 400 });
        }

        // Get user's current saldo
        const user = await prisma.user.findUnique({ where: { id: transaction.userId }, select: { saldo: true } });
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'User tidak ditemukan' }, { status: 404 });
        }

        // Mark as paid and add saldo (atomic)
        await prisma.$transaction([
            prisma.transaction.update({
                where: { id: transaction.id },
                data: { paymentStatus: 'paid', paidAt: new Date() },
            }),
            prisma.user.update({
                where: { id: transaction.userId },
                data: { saldo: { increment: transaction.amount } },
            }),
            prisma.saldoLog.create({
                data: {
                    userId: transaction.userId,
                    amount: transaction.amount,
                    balanceBefore: user.saldo,
                    balanceAfter: user.saldo + transaction.amount,
                    type: 'deposit',
                    description: `Deposit via QRIS (${transaction.trxId})`,
                },
            }),
        ]);

        return NextResponse.json({ status: 'success', message: 'Deposit berhasil diproses' });
    } catch (error) {
        console.error('Deposit callback error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
