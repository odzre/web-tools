import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { checkWhitelistIpLimit } from '@/lib/subscriptionGuard';

// GET - List user's whitelist IPs
export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const ips = await prisma.whitelistIp.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ status: 'success', data: ips });
    } catch (error) {
        console.error('Get whitelist IPs error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

// POST - Add whitelist IP
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        // Check subscription
        if (!user.planId || !user.plan) {
            return NextResponse.json(
                { status: 'error', message: 'Silahkan membeli plan untuk menambahkan IP whitelist' },
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

        const body = await req.json();
        const { ipAddress, label } = body;

        if (!ipAddress) {
            return NextResponse.json({ status: 'error', message: 'IP address wajib diisi' }, { status: 400 });
        }

        // Validate IP format (IPv4)
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(ipAddress)) {
            return NextResponse.json({ status: 'error', message: 'Format IP address tidak valid' }, { status: 400 });
        }

        // Check plan limit
        const plan = user.plan as { maxWhitelistIps: number };
        const canAdd = await checkWhitelistIpLimit(user.id, plan.maxWhitelistIps);
        if (!canAdd) {
            return NextResponse.json(
                { status: 'error', message: 'Batas sesuai plan anda telah tercapai' },
                { status: 403 }
            );
        }

        // Check duplicate
        const existing = await prisma.whitelistIp.findUnique({
            where: { userId_ipAddress: { userId: user.id, ipAddress } },
        });
        if (existing) {
            return NextResponse.json(
                { status: 'error', message: 'IP address sudah terdaftar' },
                { status: 409 }
            );
        }

        const ip = await prisma.whitelistIp.create({
            data: {
                userId: user.id,
                ipAddress,
                label: label || null,
            },
        });

        return NextResponse.json({ status: 'success', message: 'IP berhasil ditambahkan', data: ip });
    } catch (error) {
        console.error('Add whitelist IP error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

// DELETE - Remove whitelist IP
export async function DELETE(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ status: 'error', message: 'ID wajib diisi' }, { status: 400 });
        }

        // Verify ownership
        const ip = await prisma.whitelistIp.findFirst({
            where: { id, userId: user.id },
        });
        if (!ip) {
            return NextResponse.json({ status: 'error', message: 'IP tidak ditemukan' }, { status: 404 });
        }

        await prisma.whitelistIp.delete({ where: { id } });

        return NextResponse.json({ status: 'success', message: 'IP berhasil dihapus' });
    } catch (error) {
        console.error('Delete whitelist IP error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
