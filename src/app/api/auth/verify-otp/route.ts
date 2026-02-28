import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateApiKey, generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, otp, username, whatsapp, hashedPassword } = body;

        if (!email || !otp || !username || !whatsapp || !hashedPassword) {
            return NextResponse.json(
                { status: 'error', message: 'Data tidak lengkap' },
                { status: 400 }
            );
        }

        // Find valid OTP
        const otpRecord = await prisma.otpVerification.findFirst({
            where: {
                email,
                otp,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!otpRecord) {
            return NextResponse.json(
                { status: 'error', message: 'Kode OTP tidak valid atau sudah kadaluarsa' },
                { status: 400 }
            );
        }

        // Double-check no verified user with this email/username exists
        const existing = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
                isVerified: true,
            },
        });

        if (existing) {
            return NextResponse.json(
                { status: 'error', message: 'Email atau username sudah terdaftar' },
                { status: 409 }
            );
        }

        // Clean up any unverified stale users with same email/username
        await prisma.user.deleteMany({
            where: {
                OR: [{ email }, { username }],
                isVerified: false,
            },
        });

        // NOW create the user (OTP verified!)
        const apiKey = generateApiKey();
        const user = await prisma.user.create({
            data: {
                username,
                email,
                whatsapp,
                password: hashedPassword,
                apiKey,
                isVerified: true,
            },
        });

        // Delete used OTPs
        await prisma.otpVerification.deleteMany({
            where: { email },
        });

        // Generate auth token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        const response = NextResponse.json({
            status: 'success',
            message: 'Verifikasi berhasil! Akun Anda sudah aktif',
            data: { redirect: '/user/dashboard' },
        });

        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Verify OTP error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
