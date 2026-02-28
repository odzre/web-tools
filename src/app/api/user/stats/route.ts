import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const [totalSuccess, totalPending, totalExpired, totalFailed, revenueResult, recentTransactions] = await Promise.all([
            prisma.transaction.count({ where: { userId: user.id, paymentStatus: 'paid' } }),
            prisma.transaction.count({ where: { userId: user.id, paymentStatus: 'pending' } }),
            prisma.transaction.count({ where: { userId: user.id, paymentStatus: 'expired' } }),
            prisma.transaction.count({ where: { userId: user.id, paymentStatus: 'failed' } }),
            prisma.transaction.aggregate({
                where: { userId: user.id, paymentStatus: 'paid' },
                _sum: { totalAmount: true },
            }),
            prisma.transaction.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: {
                    trxId: true,
                    refId: true,
                    customerName: true,
                    amount: true,
                    uniqueCode: true,
                    totalAmount: true,
                    paymentStatus: true,
                    createdAt: true,
                    paidAt: true,
                    merchant: { select: { projectName: true } },
                },
            }),
        ]);

        return NextResponse.json({
            status: 'success',
            data: {
                stats: {
                    totalSuccess,
                    totalPending,
                    totalExpired,
                    totalFailed,
                    totalRevenue: revenueResult._sum.totalAmount || 0,
                },
                recentTransactions,
            },
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
