import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET - List all plans (admin)
export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { price: 'asc' },
            include: {
                _count: { select: { users: true } },
            },
        });

        return NextResponse.json({ status: 'success', data: plans });
    } catch (error) {
        console.error('Get plans error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

// POST - Create plan
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, price, durationDays, maxMerchants, maxWhitelistIps, prioritySupport } = body;

        if (!name || price === undefined || !durationDays || !maxMerchants || !maxWhitelistIps) {
            return NextResponse.json(
                { status: 'error', message: 'Semua field wajib diisi' },
                { status: 400 }
            );
        }

        const plan = await prisma.subscriptionPlan.create({
            data: {
                name,
                price: parseInt(price),
                durationDays: parseInt(durationDays),
                maxMerchants: parseInt(maxMerchants),
                maxWhitelistIps: parseInt(maxWhitelistIps),
                prioritySupport: !!prioritySupport,
            },
        });

        return NextResponse.json({ status: 'success', message: 'Plan berhasil dibuat', data: plan });
    } catch (error) {
        console.error('Create plan error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

// PUT - Update plan
export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, name, price, durationDays, maxMerchants, maxWhitelistIps, prioritySupport, isActive } = body;

        if (!id) {
            return NextResponse.json({ status: 'error', message: 'ID plan wajib diisi' }, { status: 400 });
        }

        const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ status: 'error', message: 'Plan tidak ditemukan' }, { status: 404 });
        }

        const plan = await prisma.subscriptionPlan.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(price !== undefined && { price: parseInt(price) }),
                ...(durationDays !== undefined && { durationDays: parseInt(durationDays) }),
                ...(maxMerchants !== undefined && { maxMerchants: parseInt(maxMerchants) }),
                ...(maxWhitelistIps !== undefined && { maxWhitelistIps: parseInt(maxWhitelistIps) }),
                ...(prioritySupport !== undefined && { prioritySupport: !!prioritySupport }),
                ...(isActive !== undefined && { isActive: !!isActive }),
            },
        });

        return NextResponse.json({ status: 'success', message: 'Plan berhasil diupdate', data: plan });
    } catch (error) {
        console.error('Update plan error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

// DELETE - Soft delete plan
export async function DELETE(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ status: 'error', message: 'ID plan wajib diisi' }, { status: 400 });
        }

        const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ status: 'error', message: 'Plan tidak ditemukan' }, { status: 404 });
        }

        // Soft delete - set isActive to false
        await prisma.subscriptionPlan.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json({ status: 'success', message: 'Plan berhasil dihapus' });
    } catch (error) {
        console.error('Delete plan error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
