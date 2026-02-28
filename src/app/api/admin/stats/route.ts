import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
        }

        const [totalUsers, totalTransactions, paidTransactions, recentTransactions, recentUsers] = await Promise.all([
            prisma.user.count(),
            prisma.transaction.count(),
            prisma.transaction.aggregate({
                _sum: { totalAmount: true },
                where: { paymentStatus: 'paid' },
            }),
            prisma.transaction.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    trxId: true,
                    refId: true,
                    amount: true,
                    totalAmount: true,
                    paymentStatus: true,
                    createdAt: true,
                    customerName: true,
                    merchant: { select: { projectName: true, user: { select: { username: true } } } },
                },
            }),
            prisma.user.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    plan: { select: { name: true } },
                },
            }),
        ]);

        return NextResponse.json({
            status: 'success',
            data: {
                totalUsers,
                totalTransactions,
                totalRevenue: paidTransactions._sum.totalAmount || 0,
                recentTransactions,
                recentUsers,
            },
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
