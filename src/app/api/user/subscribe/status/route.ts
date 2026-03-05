import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const id = req.nextUrl.searchParams.get('id');
        if (!id) {
            return NextResponse.json({ status: 'error', message: 'ID wajib diisi' }, { status: 400 });
        }

        const subOrder = await prisma.subscriptionOrder.findFirst({
            where: { id, userId: user.id },
            include: { plan: true },
        });

        if (!subOrder) {
            return NextResponse.json({ status: 'error', message: 'Order tidak ditemukan' }, { status: 404 });
        }

        // Already paid
        if (subOrder.paymentStatus === 'paid') {
            return NextResponse.json({
                status: 'success',
                data: {
                    payment_status: 'paid',
                    paid_at: subOrder.paidAt?.toISOString(),
                },
            });
        }

        // Check if expired (10 minutes)
        if (new Date() > subOrder.expiresAt) {
            await prisma.subscriptionOrder.update({
                where: { id: subOrder.id },
                data: { paymentStatus: 'expired' },
            });
            return NextResponse.json({
                status: 'success',
                data: { payment_status: 'expired' },
            });
        }

        // Already marked expired/failed
        if (subOrder.paymentStatus === 'expired' || subOrder.paymentStatus === 'failed') {
            return NextResponse.json({
                status: 'success',
                data: { payment_status: subOrder.paymentStatus },
            });
        }

        // Check payment via internal status API
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        if (!settings?.qrisApiKey) {
            return NextResponse.json({
                status: 'success',
                data: { payment_status: 'pending' },
            });
        }

        try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const statusRes = await fetch(`${baseUrl}/api/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apikey: settings.qrisApiKey,
                    ref_id: subOrder.refId,
                }),
            });

            const statusData = await statusRes.json();

            if (statusData.data?.payment_status === 'paid') {
                // Payment confirmed! Activate plan
                const now = new Date();
                const expiresAt = new Date(now.getTime() + subOrder.plan.durationDays * 24 * 60 * 60 * 1000);

                await prisma.$transaction([
                    prisma.subscriptionOrder.update({
                        where: { id: subOrder.id },
                        data: {
                            paymentStatus: 'paid',
                            paidAt: statusData.data.paid_at ? new Date(statusData.data.paid_at) : now,
                        },
                    }),
                    prisma.user.update({
                        where: { id: user.id },
                        data: {
                            planId: subOrder.planId,
                            planExpiresAt: expiresAt,
                        },
                    }),
                ]);

                return NextResponse.json({
                    status: 'success',
                    data: {
                        payment_status: 'paid',
                        paid_at: (statusData.data.paid_at || now.toISOString()),
                        plan_name: subOrder.plan.name,
                        plan_expires_at: expiresAt.toISOString(),
                    },
                });
            }
        } catch (checkError) {
            console.error('Status check error:', checkError);
            // Don't fail — just return pending
        }

        return NextResponse.json({
            status: 'success',
            data: {
                payment_status: 'pending',
                expires_at: subOrder.expiresAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('Subscribe status error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
