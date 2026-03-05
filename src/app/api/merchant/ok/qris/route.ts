import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });

        const formData = await req.formData();
        const merchantId = formData.get('merchantId') as string;
        const qrString = formData.get('qrString') as string;
        const uniqueCodeDigits = parseInt(formData.get('uniqueCodeDigits') as string) || 2;

        if (!merchantId) {
            return NextResponse.json({ status: 'error', message: 'Merchant ID wajib diisi' }, { status: 400 });
        }

        const merchant = await prisma.orderKuotaMerchant.findFirst({
            where: { id: merchantId, userId: user.id },
        });

        if (!merchant) {
            return NextResponse.json({ status: 'error', message: 'Merchant tidak ditemukan' }, { status: 404 });
        }

        if (qrString) {
            await prisma.orderKuotaMerchant.update({
                where: { id: merchantId },
                data: { qrString, uniqueCodeDigits },
            });
            return NextResponse.json({
                status: 'success',
                message: 'QRIS berhasil diupdate',
                data: { qrString },
            });
        }

        // Handle file upload
        const file = formData.get('qris') as File;
        if (!file) {
            return NextResponse.json(
                { status: 'error', message: 'File QRIS atau QR string wajib diisi' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const sharp = (await import('sharp')).default;
        const jsQR = (await import('jsqr')).default;

        const { data: pixelData, info } = await sharp(buffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const qrCode = jsQR(new Uint8ClampedArray(pixelData), info.width, info.height);

        if (!qrCode) {
            return NextResponse.json(
                { status: 'error', message: 'Gagal membaca QR code dari gambar. Pastikan gambar QRIS jelas.' },
                { status: 400 }
            );
        }

        await prisma.orderKuotaMerchant.update({
            where: { id: merchantId },
            data: { qrString: qrCode.data, uniqueCodeDigits },
        });

        return NextResponse.json({
            status: 'success',
            message: 'QRIS berhasil diupload dan diparsing',
            data: { qrString: qrCode.data },
        });
    } catch (error) {
        console.error('OK QRIS upload error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
