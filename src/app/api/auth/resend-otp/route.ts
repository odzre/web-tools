import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateOtp } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { status: 'error', message: 'Email wajib diisi' },
                { status: 400 }
            );
        }

        // Check if already verified user exists
        const existingUser = await prisma.user.findFirst({
            where: { email, isVerified: true },
        });

        if (existingUser) {
            return NextResponse.json(
                { status: 'error', message: 'Email sudah terdaftar dan terverifikasi' },
                { status: 409 }
            );
        }

        // Rate limit: check last OTP sent time
        const lastOtp = await prisma.otpVerification.findFirst({
            where: { email },
            orderBy: { createdAt: 'desc' },
        });

        if (lastOtp) {
            const timeSinceLastOtp = Date.now() - lastOtp.createdAt.getTime();
            const cooldownMs = 60 * 1000; // 60 seconds
            if (timeSinceLastOtp < cooldownMs) {
                const remaining = Math.ceil((cooldownMs - timeSinceLastOtp) / 1000);
                return NextResponse.json(
                    { status: 'error', message: `Tunggu ${remaining} detik sebelum mengirim ulang OTP` },
                    { status: 429 }
                );
            }
        }

        // Delete old OTPs
        await prisma.otpVerification.deleteMany({
            where: { email },
        });

        // Generate new OTP
        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await prisma.otpVerification.create({
            data: {
                email,
                otp,
                expiresAt,
            },
        });

        await sendOtpEmail(email, otp);

        return NextResponse.json({
            status: 'success',
            message: 'Kode OTP baru telah dikirim ke email Anda',
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Gagal mengirim ulang OTP' },
            { status: 500 }
        );
    }
}
