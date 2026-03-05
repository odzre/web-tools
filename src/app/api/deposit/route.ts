import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });

        const deposits = await prisma.saldoLog.findMany({
            where: { userId: user.id, type: 'deposit' },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        return NextResponse.json({ status: 'success', data: deposits, saldo: user.saldo });
    } catch (error) {
        console.error('Deposit history error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });

        const { amount } = await req.json();
        const numAmount = parseInt(amount);

        if (!numAmount || numAmount < 5000) {
            return NextResponse.json({ status: 'error', message: 'Minimal deposit Rp 5.000' }, { status: 400 });
        }

        // Find an active Merchant (GoMerchant or OrderKuota) from any admin user to process the deposit
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
            include: { merchants: true, orderKuotaMerchants: true }
        });

        const adminGoMerchant = adminUser?.merchants?.[0];
        const adminOkMerchant = adminUser?.orderKuotaMerchants?.[0];

        if (!adminGoMerchant && !adminOkMerchant) {
            return NextResponse.json({ status: 'error', message: 'Sistem sedang tidak menerima pembayaran (Merchant belum di-set Admin)' }, { status: 400 });
        }

        // Generate unique code
        const uniqueCode = Math.floor(Math.random() * 900) + 100;
        const totalAmount = numAmount + uniqueCode;
        const trxId = `DEP-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        const refId = `DEPOSIT-${user.id.slice(0, 8)}`;

        const usedMerchantType = adminGoMerchant ? 'goMerchant' : 'orderKuota';

        // Create transaction for deposit
        const transaction = await prisma.transaction.create({
            data: {
                userId: user.id,
                merchantId: adminGoMerchant?.id || null,
                okMerchantId: adminGoMerchant ? null : adminOkMerchant?.id,
                toolType: 'deposit',
                trxId,
                refId,
                customerName: user.username,
                amount: numAmount,
                uniqueCode,
                totalAmount,
                paymentStatus: 'pending',
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            },
        });

        // Generate QR if merchant has qr string
        let qrImage = null;
        let baseQrString = adminGoMerchant?.qrString || adminOkMerchant?.qrString;

        if (baseQrString) {
            // Dynamic QRIS
            let qrisData = baseQrString.slice(0, -4);
            const step1 = qrisData.replace('010211', '010212');
            const step2 = step1.split('5802ID');
            const step3 = `${step2[0]}54${String(totalAmount).length.toString().padStart(2, '0')}${totalAmount}5802ID${step2[1]}`;
            const amountStr = totalAmount.toString();
            const amountTLV = '54' + ('0' + amountStr.length).slice(-2) + amountStr;
            const finalStr = step2[0] + amountTLV + '5802ID' + step2[1];

            // CRC16
            let crc = 0xFFFF;
            for (let c = 0; c < finalStr.length; c++) {
                crc ^= finalStr.charCodeAt(c) << 8;
                for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
            }
            const crcStr = ('000' + (crc & 0xFFFF).toString(16).toUpperCase()).slice(-4);
            const qrString = finalStr + crcStr;

            qrImage = `https://quickchart.io/qr?text=${encodeURIComponent(qrString)}&size=300`;

            // Update transaction with QR
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { qrString },
            });
        }

        return NextResponse.json({
            status: 'success',
            data: {
                trxId: transaction.trxId,
                amount: numAmount,
                uniqueCode,
                totalAmount,
                qrImage,
                expiresAt: transaction.expiresAt,
            },
        });
    } catch (error) {
        console.error('Deposit create error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
