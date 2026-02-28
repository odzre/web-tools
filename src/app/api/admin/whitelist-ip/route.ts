import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET - List whitelist IPs for a specific user (admin only)
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ status: 'error', message: 'User ID wajib diisi' }, { status: 400 });
        }

        const ips = await prisma.whitelistIp.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ status: 'success', data: ips });
    } catch (error) {
        console.error('Admin get whitelist IPs error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

// POST - Add whitelist IP for a user (admin only, bypasses plan limits)
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { userId, ipAddress } = body;

        if (!userId || !ipAddress) {
            return NextResponse.json({ status: 'error', message: 'User ID dan IP address wajib diisi' }, { status: 400 });
        }

        // Validate IP format (IPv4)
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(ipAddress)) {
            return NextResponse.json({ status: 'error', message: 'Format IP address tidak valid' }, { status: 400 });
        }

        // Check duplicate
        const existing = await prisma.whitelistIp.findUnique({
            where: { userId_ipAddress: { userId, ipAddress } },
        });
        if (existing) {
            return NextResponse.json({ status: 'error', message: 'IP address sudah terdaftar' }, { status: 409 });
        }

        const ip = await prisma.whitelistIp.create({
            data: { userId, ipAddress, label: null },
        });

        return NextResponse.json({ status: 'success', message: 'IP berhasil ditambahkan', data: ip });
    } catch (error) {
        console.error('Admin add whitelist IP error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

// DELETE - Remove whitelist IP (admin only)
export async function DELETE(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ status: 'error', message: 'ID wajib diisi' }, { status: 400 });
        }

        await prisma.whitelistIp.delete({ where: { id } });

        return NextResponse.json({ status: 'success', message: 'IP berhasil dihapus' });
    } catch (error) {
        console.error('Admin delete whitelist IP error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
