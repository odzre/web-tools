import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, hashPassword, comparePassword, generateApiKey } from '@/lib/auth';

// Update profile
export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { username, whatsapp, currentPassword, newPassword } = body;

        const updateData: Record<string, unknown> = {};

        if (username) {
            const existing = await prisma.user.findFirst({
                where: { username, NOT: { id: user.id } },
            });
            if (existing) {
                return NextResponse.json(
                    { status: 'error', message: 'Username sudah digunakan' },
                    { status: 409 }
                );
            }
            updateData.username = username;
        }

        if (whatsapp) {
            updateData.whatsapp = whatsapp;
        }

        // Password change
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json(
                    { status: 'error', message: 'Password lama wajib diisi' },
                    { status: 400 }
                );
            }

            const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
            const valid = await comparePassword(currentPassword, fullUser!.password);
            if (!valid) {
                return NextResponse.json(
                    { status: 'error', message: 'Password lama tidak cocok' },
                    { status: 400 }
                );
            }

            updateData.password = await hashPassword(newPassword);
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { status: 'error', message: 'Tidak ada data yang diubah' },
                { status: 400 }
            );
        }

        await prisma.user.update({
            where: { id: user.id },
            data: updateData,
        });

        return NextResponse.json({
            status: 'success',
            message: 'Profil berhasil diperbarui',
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

// Regenerate API key
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        if (body.action === 'regenerate_key') {
            const newKey = generateApiKey();
            await prisma.user.update({
                where: { id: user.id },
                data: { apiKey: newKey },
            });

            return NextResponse.json({
                status: 'success',
                message: 'API key berhasil di-regenerate',
                data: { apiKey: newKey },
            });
        }

        return NextResponse.json(
            { status: 'error', message: 'Action tidak valid' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Settings action error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
