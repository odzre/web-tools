import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateApiRequest, getClientIp } from '@/lib/subscriptionGuard';
import { createOKQRIS, countAllMerchants } from '@/lib/orderkuota';

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

function parseTLV(data: string): { tag: string; length: string; value: string }[] {
    const result: { tag: string; length: string; value: string }[] = [];
    let i = 0;
    while (i + 4 <= data.length) {
        const tag = data.substring(i, i + 2);
        const lenStr = data.substring(i + 2, i + 4);
        const len = parseInt(lenStr, 10);
        if (isNaN(len) || i + 4 + len > data.length) break;
        const value = data.substring(i + 4, i + 4 + len);
        result.push({ tag, length: lenStr, value });
        i += 4 + len;
    }
    return result;
}

function serializeTLV(tlvs: { tag: string; length: string; value: string }[]): string {
    return tlvs.map(t => `${t.tag}${t.length}${t.value}`).join('');
}

function modifyQrAmount(qrString: string, amount: number): string {
    const amountStr = amount.toString();
    const lengthStr = amountStr.length.toString().padStart(2, '0');
    const crcRegex = /6304[A-Fa-f0-9]{4}$/;
    const withoutCrc = qrString.replace(crcRegex, '');
    const tlvs = parseTLV(withoutCrc);
    const tag01 = tlvs.find(t => t.tag === '01');
    if (tag01) { tag01.value = '12'; tag01.length = '02'; }
    const tag54Index = tlvs.findIndex(t => t.tag === '54');
    if (tag54Index !== -1) {
        tlvs[tag54Index].value = amountStr;
        tlvs[tag54Index].length = lengthStr;
    } else {
        const newTag54 = { tag: '54', length: lengthStr, value: amountStr };
        const tag58Index = tlvs.findIndex(t => t.tag === '58');
        if (tag58Index !== -1) { tlvs.splice(tag58Index, 0, newTag54); }
        else { tlvs.push(newTag54); }
    }
    const tag63Index = tlvs.findIndex(t => t.tag === '63');
    if (tag63Index !== -1) { tlvs.splice(tag63Index, 1); }
    const modified = serializeTLV(tlvs);
    return modified + calculateCRC(modified);
}

function calculateCRC(str: string): string {
    const data = str + '6304';
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) { crc = (crc << 1) ^ 0x1021; } else { crc <<= 1; }
            crc &= 0xFFFF;
        }
    }
    return '6304' + crc.toString(16).toUpperCase().padStart(4, '0');
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { apikey, nama_project, ref_id, amount, customer_name, expired } = body;

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

        // ===== PLAN: MERCHANT LIMIT =====
        if (user.plan) {
            const total = await countAllMerchants(user.id);
            if (total === 0) {
                return NextResponse.json(
                    { status: 'error', code: 403, message: 'Belum ada merchant yang terdaftar' },
                    { status: 403 }
                );
            }
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

        const expiresAt = new Date(Date.now() + (expired || 10) * 60 * 1000);
        const uniqueCode = 0; // Will be set per merchant
        const trxId = generateTrxId();

        // ─── Try GoMerchant first ───
        const goMerchant = await prisma.goMerchant.findFirst({
            where: { userId: user.id, projectName: nama_project },
        });

        if (goMerchant) {
            if (!goMerchant.qrString) {
                return NextResponse.json(
                    { status: 'error', code: 400, message: 'QRIS belum disetup untuk merchant ini' },
                    { status: 400 }
                );
            }
            const uc = generateUniqueCode(goMerchant.uniqueCodeDigits);
            const totalAmount = amount + uc;
            const modifiedQr = modifyQrAmount(goMerchant.qrString, totalAmount);
            const qrImageUrl = `https://quickchart.io/qr?text=${encodeURIComponent(modifiedQr)}&size=300`;

            const transaction = await prisma.transaction.create({
                data: {
                    userId: user.id,
                    toolType: 'goMerchant',
                    merchantId: goMerchant.id,
                    trxId, refId: ref_id,
                    customerName: customer_name || null,
                    amount, uniqueCode: uc, totalAmount,
                    qrString: modifiedQr, expiresAt,
                },
            });

            return NextResponse.json({
                status: 'success', code: 200,
                message: 'Transaksi berhasil dibuat',
                data: {
                    trx_id: transaction.trxId, ref_id, amount,
                    unique_code: uc, total_amount: totalAmount,
                    payment_type: 'qris', payment_status: 'pending',
                    expires_at: expiresAt.toISOString(),
                    payment_detail: { qr_string: modifiedQr, qr_image: qrImageUrl },
                },
            });
        }

        // ─── Try OrderKuota ───
        const okMerchant = await prisma.orderKuotaMerchant.findFirst({
            where: { userId: user.id, projectName: nama_project },
        });

        if (okMerchant) {
            if (!okMerchant.qrString) {
                return NextResponse.json(
                    { status: 'error', code: 400, message: 'QRIS belum disetup untuk merchant OrderKuota ini' },
                    { status: 400 }
                );
            }
            const uc = generateUniqueCode(okMerchant.uniqueCodeDigits);
            const totalAmount = amount + uc;
            const { qr_string, qr_image } = createOKQRIS(totalAmount, okMerchant.qrString);

            const transaction = await prisma.transaction.create({
                data: {
                    userId: user.id,
                    toolType: 'orderKuota',
                    okMerchantId: okMerchant.id,
                    trxId, refId: ref_id,
                    customerName: customer_name || null,
                    amount, uniqueCode: uc, totalAmount,
                    qrString: qr_string, expiresAt,
                },
            });

            return NextResponse.json({
                status: 'success', code: 200,
                message: 'Transaksi berhasil dibuat',
                data: {
                    trx_id: transaction.trxId, ref_id, amount,
                    unique_code: uc, total_amount: totalAmount,
                    payment_type: 'qris', payment_status: 'pending',
                    expires_at: expiresAt.toISOString(),
                    payment_detail: { qr_string, qr_image },
                },
            });
        }

        return NextResponse.json(
            { status: 'error', code: 404, message: `Merchant "${nama_project}" tidak ditemukan` },
            { status: 404 }
        );

    } catch (error) {
        console.error('Order API error:', error);
        return NextResponse.json(
            { status: 'error', code: 500, message: 'Server error' },
            { status: 500 }
        );
    }
}
