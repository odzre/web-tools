import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET all members (admin only)
export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
        }

        const members = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                whatsapp: true,
                role: true,
                isVerified: true,
                apiKey: true,
                planId: true,
                planExpiresAt: true,
                createdAt: true,
                plan: { select: { name: true } },
                _count: { select: { merchants: true, transactions: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ status: 'success', data: members });
    } catch (error) {
        console.error('Admin members error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

// Update member
export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { userId, role, planId, planExpiresAt } = body;

        if (!userId) {
            return NextResponse.json({ status: 'error', message: 'User ID wajib diisi' }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (role) updateData.role = role;
        if (planId !== undefined) {
            updateData.planId = planId || null;
            // If removing plan, also clear expiry
            if (!planId) updateData.planExpiresAt = null;
        }
        if (planExpiresAt) updateData.planExpiresAt = new Date(planExpiresAt);

        await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        return NextResponse.json({ status: 'success', message: 'Member berhasil diperbarui' });
    } catch (error) {
        console.error('Admin update member error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

// Delete member
export async function DELETE(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('id');

        if (!userId) {
            return NextResponse.json({ status: 'error', message: 'User ID wajib diisi' }, { status: 400 });
        }

        if (userId === user.id) {
            return NextResponse.json({ status: 'error', message: 'Tidak bisa menghapus diri sendiri' }, { status: 400 });
        }

        await prisma.user.delete({ where: { id: userId } });

        return NextResponse.json({ status: 'success', message: 'Member berhasil dihapus' });
    } catch (error) {
        console.error('Admin delete member error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
