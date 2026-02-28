import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const type = formData.get('type') as string; // 'logo' or 'favicon'

        if (!file) {
            return NextResponse.json({ status: 'error', message: 'File wajib diupload' }, { status: 400 });
        }

        if (!['logo', 'favicon'].includes(type)) {
            return NextResponse.json({ status: 'error', message: 'Tipe file tidak valid' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/ico'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ status: 'error', message: 'Format file tidak didukung. Gunakan PNG, JPEG, WebP, SVG, atau ICO.' }, { status: 400 });
        }

        // Max 2MB
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ status: 'error', message: 'Ukuran file maksimal 2MB' }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        const ext = file.name.split('.').pop() || 'png';
        const filename = `${type}_${Date.now()}.${ext}`;
        const filepath = path.join(uploadDir, filename);

        const bytes = await file.arrayBuffer();
        await writeFile(filepath, Buffer.from(bytes));

        const url = `/uploads/${filename}`;

        return NextResponse.json({
            status: 'success',
            message: 'File berhasil diupload',
            data: { url, filename },
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
