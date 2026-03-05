import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { okVerifyOtp, hasToken, isOtpRequired } from '@/lib/orderkuota';
import { encrypt } from '@/lib/encryption';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });

        const { okUsername, otp, projectName } = await req.json();

        if (!okUsername || !otp || !projectName) {
            return NextResponse.json(
                { status: 'error', message: 'okUsername, otp, dan projectName wajib diisi' },
                { status: 400 }
            );
        }

        // ─── Verify OTP via OrderKuota API ───
        const res = await okVerifyOtp(okUsername, otp);

        // Handle API error (wrong OTP, expired, etc.)
        if (res.error) {
            return NextResponse.json(
                { status: 'error', message: res.error },
                { status: 400 }
            );
        }

        // No result at all
        if (!res.result) {
            return NextResponse.json(
                { status: 'error', message: 'Tidak ada response dari OrderKuota API' },
                { status: 502 }
            );
        }

        // Still asking for OTP? — shouldn't happen but handle gracefully
        if (isOtpRequired(res.result)) {
            return NextResponse.json(
                { status: 'error', message: 'OTP masih diperlukan. Silahkan coba lagi.' },
                { status: 400 }
            );
        }

        // ─── Token received — save merchant ───
        if (!hasToken(res.result)) {
            return NextResponse.json(
                { status: 'error', message: 'Token tidak diterima setelah verifikasi OTP' },
                { status: 502 }
            );
        }

        const token = res.result;
        const encryptedToken = encrypt(token.token);

        const merchant = await prisma.orderKuotaMerchant.create({
            data: {
                userId: user.id,
                projectName,
                okId: token.id,
                okUsername: token.username || okUsername,
                okName: token.name || null,
                okAuthToken: encryptedToken,
                okBalance: token.balance || null,
            },
        });

        return NextResponse.json({
            status: 'success',
            message: 'Akun OrderKuota berhasil terhubung',
            data: {
                id: merchant.id,
                projectName: merchant.projectName,
                okName: token.name,
                okUsername: token.username,
                okBalance: token.balance,
            },
        });
    } catch (error) {
        console.error('OK verify-otp error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
