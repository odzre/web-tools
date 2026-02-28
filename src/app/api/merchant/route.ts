import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { GobizService } from '@/lib/gobiz';
import { encrypt, decrypt } from '@/lib/encryption';

// GET - List user's merchants
export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const merchants = await prisma.goMerchant.findMany({
            where: { userId: user.id },
            select: {
                id: true,
                projectName: true,
                phoneNumber: true,
                qrString: true,
                uniqueCodeDigits: true,
                createdAt: true,
                _count: { select: { transactions: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ status: 'success', data: merchants });
    } catch (error) {
        console.error('Get merchants error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

// POST - Start add merchant (request OTP)
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        // Check subscription
        if (!user.planId || !user.plan) {
            return NextResponse.json(
                { status: 'error', message: 'Silahkan membeli plan untuk menambahkan merchant' },
                { status: 403 }
            );
        }

        // Check expiry
        if (user.planExpiresAt && new Date() > new Date(user.planExpiresAt)) {
            return NextResponse.json(
                { status: 'error', message: 'Subscription anda telah berakhir' },
                { status: 403 }
            );
        }

        // Check merchant limit
        const merchantCount = await prisma.goMerchant.count({ where: { userId: user.id } });
        const plan = user.plan as { maxMerchants: number };
        if (merchantCount >= plan.maxMerchants) {
            return NextResponse.json(
                { status: 'error', message: 'Batas sesuai plan anda telah tercapai' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { projectName, phoneNumber } = body;

        if (!projectName || !phoneNumber) {
            return NextResponse.json(
                { status: 'error', message: 'Nama project dan nomor telepon wajib diisi' },
                { status: 400 }
            );
        }

        const gobiz = new GobizService();
        const result = await gobiz.requestOtp(phoneNumber);

        if (!result.requiresOtp) {
            // Direct token (unlikely but handle it)
            const encrypted = encrypt(result.accessToken!);
            await prisma.goMerchant.create({
                data: {
                    userId: user.id,
                    projectName,
                    phoneNumber,
                    accessToken: encrypted,
                    refreshToken: encrypted,
                    xUniqueid: gobiz.getXUniqueid(),
                },
            });

            return NextResponse.json({
                status: 'success',
                message: 'Merchant berhasil ditambahkan',
                data: { requiresOtp: false },
            });
        }

        return NextResponse.json({
            status: 'success',
            message: 'OTP telah dikirim',
            data: {
                requiresOtp: true,
                otpToken: result.otpToken,
                otpLength: result.otpLength,
                xUniqueid: gobiz.getXUniqueid(),
            },
        });
    } catch (error: unknown) {
        console.error('Add merchant error:', error);
        const axiosError = error as { response?: { data?: { message?: string } } };
        return NextResponse.json(
            { status: 'error', message: axiosError.response?.data?.message || 'Gagal mengirim OTP' },
            { status: 500 }
        );
    }
}

// DELETE - Remove merchant
export async function DELETE(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const merchantId = searchParams.get('id');

        if (!merchantId) {
            return NextResponse.json({ status: 'error', message: 'ID merchant wajib diisi' }, { status: 400 });
        }

        // Verify ownership
        const merchant = await prisma.goMerchant.findFirst({
            where: { id: merchantId, userId: user.id },
        });

        if (!merchant) {
            return NextResponse.json({ status: 'error', message: 'Merchant tidak ditemukan' }, { status: 404 });
        }

        await prisma.goMerchant.delete({ where: { id: merchantId } });

        return NextResponse.json({ status: 'success', message: 'Merchant berhasil dihapus' });
    } catch (error) {
        console.error('Delete merchant error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
