import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { status: 'error', message: 'Email dan password wajib diisi' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return NextResponse.json(
                { status: 'error', message: 'Email atau password salah' },
                { status: 401 }
            );
        }

        if (!user.isVerified) {
            return NextResponse.json(
                { status: 'error', message: 'Akun belum diverifikasi. Silakan cek email untuk kode OTP' },
                { status: 403 }
            );
        }

        const valid = await comparePassword(password, user.password);
        if (!valid) {
            return NextResponse.json(
                { status: 'error', message: 'Email atau password salah' },
                { status: 401 }
            );
        }

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        const response = NextResponse.json({
            status: 'success',
            message: 'Login berhasil',
            data: {
                redirect: user.role === 'ADMIN' ? '/admin/members' : '/user/dashboard',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                },
            },
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
        console.error('Login error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
