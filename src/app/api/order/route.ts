import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateApiRequest, getClientIp } from '@/lib/subscriptionGuard';
import { checkRateLimit } from '@/lib/rateLimit';

function generateUniqueCode(digits: number): number {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTrxId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const seq = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `TRX${dateStr}${seq}`;
}

function modifyQrAmount(qrString: string, amount: number): string {
    const amountStr = amount.toString();
    const lengthStr = amountStr.length.toString().padStart(2, '0');

    const tag54Regex = /54\d{2}\d+/;
    if (tag54Regex.test(qrString)) {
        return qrString.replace(tag54Regex, `54${lengthStr}${amountStr}`);
    }

    const crcRegex = /6304[A-Fa-f0-9]{4}$/;
    const withoutCrc = qrString.replace(crcRegex, '');
    const newQr = `${withoutCrc}54${lengthStr}${amountStr}`;

    return newQr + calculateCRC(newQr);
}

function calculateCRC(str: string): string {
    const data = str + '6304';
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
            crc &= 0xFFFF;
        }
    }
    return '6304' + crc.toString(16).toUpperCase().padStart(4, '0');
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { apikey, nama_project, ref_id, amount, customer_name, expired } = body;

        // Validate required fields
        if (!apikey || !nama_project || !ref_id || !amount) {
            return NextResponse.json(
                { status: 'error', code: 400, message: 'Field apikey, nama_project, ref_id, dan amount wajib diisi' },
                { status: 400 }
            );
        }

        // ===== SUBSCRIPTION GUARD =====
        const clientIp = getClientIp(req.headers);
        const guard = await validateApiRequest(apikey, clientIp);
        if (!guard.success) {
            return NextResponse.json(
                { status: 'error', code: guard.error!.code, message: guard.error!.message },
                { status: guard.error!.status }
            );
        }
        const user = guard.user!;

        // Rate limit
        const rateLimit = await checkRateLimit(`api:${user.id}`);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { status: 'error', code: 429, message: 'Rate limit exceeded' },
                { status: 429 }
            );
        }

        // Find merchant by project name
        const merchant = await prisma.goMerchant.findFirst({
            where: {
                userId: user.id,
                projectName: nama_project,
            },
        });

        if (!merchant) {
            return NextResponse.json(
                { status: 'error', code: 404, message: `Merchant "${nama_project}" tidak ditemukan` },
                { status: 404 }
            );
        }

        if (!merchant.qrString) {
            return NextResponse.json(
                { status: 'error', code: 400, message: 'QRIS belum disetup untuk merchant ini' },
                { status: 400 }
            );
        }

        // Check for duplicate ref_id
        const existingTrx = await prisma.transaction.findFirst({
            where: { refId: ref_id, userId: user.id },
        });

        if (existingTrx) {
            return NextResponse.json(
                { status: 'error', code: 409, message: 'ref_id sudah digunakan' },
                { status: 409 }
            );
        }

        // Generate unique code and transaction
        const uniqueCode = generateUniqueCode(merchant.uniqueCodeDigits);
        const totalAmount = amount + uniqueCode;
        const trxId = generateTrxId();
        const expiresAt = new Date(Date.now() + (expired || 60) * 60 * 1000);

        // Modify QR with actual amount
        const modifiedQr = modifyQrAmount(merchant.qrString, totalAmount);
        const qrImageUrl = `https://quickchart.io/qr?text=${encodeURIComponent(modifiedQr)}&size=300`;

        // Save transaction
        const transaction = await prisma.transaction.create({
            data: {
                userId: user.id,
                merchantId: merchant.id,
                trxId,
                refId: ref_id,
                customerName: customer_name || null,
                amount,
                uniqueCode,
                totalAmount,
                qrString: modifiedQr,
                expiresAt,
            },
        });

        return NextResponse.json({
            status: 'success',
            code: 200,
            message: 'Transaksi berhasil dibuat',
            data: {
                trx_id: transaction.trxId,
                ref_id,
                amount,
                unique_code: uniqueCode,
                total_amount: totalAmount,
                payment_type: 'qris',
                payment_status: 'pending',
                expires_at: expiresAt.toISOString(),
                payment_detail: {
                    qr_string: modifiedQr,
                    qr_image: qrImageUrl,
                },
            },
        });
    } catch (error) {
        console.error('Order API error:', error);
        return NextResponse.json(
            { status: 'error', code: 500, message: 'Server error' },
            { status: 500 }
        );
    }
}
