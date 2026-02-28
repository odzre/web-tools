import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { GobizService } from '@/lib/gobiz';
import { encrypt } from '@/lib/encryption';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { otp, otpToken, projectName, phoneNumber, xUniqueid } = body;

        if (!otp || !otpToken || !projectName || !phoneNumber || !xUniqueid) {
            return NextResponse.json(
                { status: 'error', message: 'Data tidak lengkap' },
                { status: 400 }
            );
        }

        const gobiz = new GobizService(xUniqueid);
        const result = await gobiz.verifyOtp(otp, otpToken);

        // Encrypt tokens before storing
        const encryptedAccess = encrypt(result.accessToken);
        const encryptedRefresh = encrypt(result.refreshToken);

        const merchant = await prisma.goMerchant.create({
            data: {
                userId: user.id,
                projectName,
                phoneNumber,
                accessToken: encryptedAccess,
                refreshToken: encryptedRefresh,
                xUniqueid,
            },
        });

        return NextResponse.json({
            status: 'success',
            message: 'Merchant berhasil ditambahkan!',
            data: {
                id: merchant.id,
                projectName: merchant.projectName,
                phoneNumber: merchant.phoneNumber,
            },
        });
    } catch (error: unknown) {
        console.error('Verify merchant OTP error:', error);
        const axiosError = error as { response?: { data?: { message?: string } } };
        return NextResponse.json(
            { status: 'error', message: axiosError.response?.data?.message || 'Verifikasi OTP gagal' },
            { status: 500 }
        );
    }
}
