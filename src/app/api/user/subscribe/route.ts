import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const { planId } = await req.json();
        if (!planId) {
            return NextResponse.json({ status: 'error', message: 'Plan ID wajib diisi' }, { status: 400 });
        }

        // Get plan
        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan || !plan.isActive) {
            return NextResponse.json({ status: 'error', message: 'Plan tidak ditemukan' }, { status: 404 });
        }

        if (plan.price === 0) {
            // Free plan — activate directly
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    planId: plan.id,
                    planExpiresAt: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
                },
            });
            return NextResponse.json({
                status: 'success',
                message: 'Plan gratis berhasil diaktifkan!',
                data: { free: true },
            });
        }

        // Get QRIS config from SiteSettings
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        if (!settings?.qrisApiKey || !settings?.qrisProject) {
            return NextResponse.json(
                { status: 'error', message: 'Pembayaran QRIS belum dikonfigurasi oleh admin' },
                { status: 500 }
            );
        }

        // Check if there's already a pending subscription order for this plan
        const existingOrder = await prisma.subscriptionOrder.findFirst({
            where: {
                userId: user.id,
                planId: plan.id,
                paymentStatus: 'pending',
                expiresAt: { gt: new Date() },
            },
        });

        if (existingOrder) {
            // Return existing pending order
            return NextResponse.json({
                status: 'success',
                message: 'Order pembayaran sudah ada',
                data: {
                    id: existingOrder.id,
                    trx_id: existingOrder.trxId,
                    amount: existingOrder.amount,
                    unique_code: existingOrder.uniqueCode,
                    total_amount: existingOrder.totalAmount,
                    payment_status: existingOrder.paymentStatus,
                    expires_at: existingOrder.expiresAt.toISOString(),
                    qr_string: existingOrder.qrString,
                    qr_image: existingOrder.qrImageUrl,
                },
            });
        }

        // Generate unique ref_id for subscription
        const refId = `SUB-${user.id.slice(-6)}-${Date.now()}`;

        // Call internal order API
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const orderRes = await fetch(`${baseUrl}/api/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apikey: settings.qrisApiKey,
                nama_project: settings.qrisProject,
                ref_id: refId,
                amount: plan.price,
                customer_name: user.username,
                expired: 10, // 10 menit
            }),
        });

        const orderData = await orderRes.json();

        if (orderData.status !== 'success') {
            console.error('Subscribe order failed:', orderData);
            return NextResponse.json(
                { status: 'error', message: orderData.message || 'Gagal membuat order QRIS' },
                { status: 500 }
            );
        }

        const od = orderData.data;

        // Save subscription order
        const subOrder = await prisma.subscriptionOrder.create({
            data: {
                userId: user.id,
                planId: plan.id,
                trxId: od.trx_id,
                refId: refId,
                amount: od.amount,
                uniqueCode: od.unique_code,
                totalAmount: od.total_amount,
                qrString: od.payment_detail.qr_string,
                qrImageUrl: od.payment_detail.qr_image,
                expiresAt: new Date(od.expires_at),
            },
        });

        return NextResponse.json({
            status: 'success',
            message: 'Order pembayaran berhasil dibuat',
            data: {
                id: subOrder.id,
                trx_id: od.trx_id,
                amount: od.amount,
                unique_code: od.unique_code,
                total_amount: od.total_amount,
                payment_status: 'pending',
                expires_at: od.expires_at,
                qr_string: od.payment_detail.qr_string,
                qr_image: od.payment_detail.qr_image,
            },
        });
    } catch (error) {
        console.error('Subscribe error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
