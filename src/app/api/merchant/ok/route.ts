import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { okLoginRequest, isOtpRequired, hasToken, countAllMerchants } from '@/lib/orderkuota';
import { encrypt } from '@/lib/encryption';

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });

        const merchants = await prisma.orderKuotaMerchant.findMany({
            where: { userId: user.id },
            select: {
                id: true,
                projectName: true,
                okId: true,
                okUsername: true,
                okName: true,
                okBalance: true,
                qrString: true,
                uniqueCodeDigits: true,
                createdAt: true,
                _count: { select: { transactions: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ status: 'success', data: merchants });
    } catch (error) {
        console.error('GET OK merchants error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });

        const { projectName, okUsername, okPassword } = await req.json();

        if (!projectName || !okUsername || !okPassword) {
            return NextResponse.json(
                { status: 'error', message: 'projectName, okUsername, dan okPassword wajib diisi' },
                { status: 400 }
            );
        }

        // Validate plan merchant limit (GoMerchant + OrderKuota combined)
        if (!user.plan) {
            return NextResponse.json(
                { status: 'error', message: 'Silahkan beli plan terlebih dahulu' },
                { status: 403 }
            );
        }

        const totalMerchants = await countAllMerchants(user.id);
        if (totalMerchants >= user.plan.maxMerchants) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: `Batas merchant tercapai (${totalMerchants}/${user.plan.maxMerchants}). Upgrade plan untuk menambah merchant.`,
                },
                { status: 403 }
            );
        }

        // Check duplicate projectName for this user
        const existing = await prisma.orderKuotaMerchant.findFirst({
            where: { userId: user.id, projectName },
        });
        if (existing) {
            return NextResponse.json(
                { status: 'error', message: 'Nama project sudah digunakan' },
                { status: 409 }
            );
        }

        // ─── Login to OrderKuota API ───
        const loginRes = await okLoginRequest(okUsername, okPassword);

        // Handle API error (wrong username/password)
        if (loginRes.error) {
            return NextResponse.json(
                { status: 'error', message: loginRes.error },
                { status: 400 }
            );
        }

        // No result at all — unexpected
        if (!loginRes.result) {
            return NextResponse.json(
                { status: 'error', message: 'Tidak ada response dari OrderKuota API' },
                { status: 502 }
            );
        }

        // ─── OTP Required ───
        if (isOtpRequired(loginRes.result)) {
            return NextResponse.json({
                status: 'success',
                data: {
                    requiresOtp: true,
                    otpMethod: loginRes.result.otp,      // "email"
                    otpTarget: loginRes.result.otp_value, // "reyd****mail.com"
                    okUsername,
                    projectName,
                },
            });
        }

        // ─── Direct token (no OTP needed — unlikely but handle) ───
        if (hasToken(loginRes.result)) {
            const token = loginRes.result;
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
                    okBalance: token.balance,
                },
            });
        }

        // Unexpected response
        return NextResponse.json(
            { status: 'error', message: 'Response tidak dikenali dari OrderKuota API' },
            { status: 502 }
        );

    } catch (error) {
        console.error('POST OK merchant error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });

        const id = req.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ status: 'error', message: 'ID wajib diisi' }, { status: 400 });

        const merchant = await prisma.orderKuotaMerchant.findFirst({ where: { id, userId: user.id } });
        if (!merchant) {
            return NextResponse.json({ status: 'error', message: 'Merchant tidak ditemukan' }, { status: 404 });
        }

        // Delete merchant — cascades to transactions
        await prisma.orderKuotaMerchant.delete({ where: { id } });

        return NextResponse.json({ status: 'success', message: 'Akun OrderKuota berhasil dihapus' });
    } catch (error) {
        console.error('DELETE OK merchant error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
