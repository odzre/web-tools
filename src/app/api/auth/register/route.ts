import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, generateOtp } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { username, email, whatsapp, password, confirmPassword } = body;

        // Validation
        if (!username || !email || !whatsapp || !password || !confirmPassword) {
            return NextResponse.json(
                { status: 'error', message: 'Semua field wajib diisi' },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { status: 'error', message: 'Password dan konfirmasi password tidak cocok' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { status: 'error', message: 'Password minimal 6 karakter' },
                { status: 400 }
            );
        }

        // Check if username or email already taken by a VERIFIED user
        const existing = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
                isVerified: true,
            },
        });

        if (existing) {
            return NextResponse.json(
                { status: 'error', message: existing.email === email ? 'Email sudah terdaftar' : 'Username sudah digunakan' },
                { status: 409 }
            );
        }

        // Delete any unverified users with same email/username (stale registrations)
        await prisma.user.deleteMany({
            where: {
                OR: [{ email }, { username }],
                isVerified: false,
            },
        });

        // Delete any previous OTPs for this email
        await prisma.otpVerification.deleteMany({
            where: { email },
        });

        // Hash password and store temporarily in OTP record metadata
        const hashedPassword = await hashPassword(password);

        // Generate and send OTP (user is NOT created yet)
        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

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
            message: 'Kode OTP telah dikirim ke email Anda',
            data: {
                email,
                username,
                whatsapp,
                hashedPassword,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
