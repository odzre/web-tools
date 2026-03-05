import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GobizService } from '@/lib/gobiz';
import { okGetMutasi } from '@/lib/orderkuota';
import { normalizeAmount } from '@/lib/amountUtils';

export async function POST(req: NextRequest) {
    try {
        const { trxId } = await req.json();

        if (!trxId) {
            return NextResponse.json({ status: 'error', message: 'trxId wajib' }, { status: 400 });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { trxId },
            include: { merchant: true, okMerchant: true }
        });

        if (!transaction) {
            return NextResponse.json({ status: 'error', message: 'Transaksi tidak ditemukan' }, { status: 404 });
        }

        if (transaction.toolType !== 'deposit') {
            return NextResponse.json({ status: 'error', message: 'Bukan transaksi deposit' }, { status: 400 });
        }

        if (transaction.paymentStatus === 'paid') {
            return NextResponse.json({ status: 'success', message: 'Deposit sudah diproses sebelumnya' });
        }

        const now = new Date();
        if (now > transaction.expiresAt) {
            await prisma.transaction.update({ where: { id: transaction.id }, data: { paymentStatus: 'expired' } });
            return NextResponse.json({ status: 'error', message: 'Deposit sudah expired' }, { status: 400 });
        }

        // --- Validate Payment via Gateways ---
        let isPaid = false;
        let paidAt = now;

        if (transaction.okMerchant) {
            // Check OrderKuota
            try {
                const mutasiRes = await okGetMutasi(transaction.okMerchant.okUsername, transaction.okMerchant.okAuthToken);
                const entries = mutasiRes?.result || [];
                const expectedAmount = normalizeAmount(transaction.totalAmount);

                for (const entry of entries) {
                    if (entry.status !== 'IN') continue;
                    const kredit = normalizeAmount(entry.kredit);
                    if (kredit === expectedAmount) {
                        const txTimeDate = entry.tanggal ? new Date(entry.tanggal) : now;
                        const txCreated = new Date(transaction.createdAt);
                        if (txTimeDate.getTime() >= (txCreated.getTime() - 5 * 60 * 1000)) {
                            isPaid = true;
                            paidAt = txTimeDate;
                            break;
                        }
                    }
                }
            } catch (okError) {
                console.error('[Deposit/OrderKuota] Check error:', okError);
            }
        } else if (transaction.merchant) {
            // Check GoMerchant
            try {
                const gobiz = new GobizService(transaction.merchant.xUniqueid);
                const { data: txData } = await gobiz.getTransactionsWithAutoRefresh(
                    transaction.merchant.id,
                    transaction.merchant.accessToken,
                    transaction.merchant.refreshToken,
                    { size: 50 }
                );

                const entries = txData?.hits || txData?.data?.journals || [];
                const expectedAmount = normalizeAmount(transaction.totalAmount);

                for (const entry of entries) {
                    let txAmountRaw: unknown;
                    let txStatus: string | undefined;
                    let txTime: string | undefined;

                    if (entry.metadata?.transaction) {
                        const meta = entry.metadata;
                        txAmountRaw = meta.transaction.gross_amount || meta.transaction.amount;
                        txStatus = meta.transaction.status;
                        txTime = meta.transaction.transaction_time;
                    } else {
                        txAmountRaw = entry.amount;
                        txStatus = entry.status === 'success' ? 'settlement' : entry.status;
                        txTime = entry.created_at;
                    }

                    const gobizAmount = normalizeAmount(txAmountRaw as string | number);
                    const gobizAmountInRupiah = Math.round(gobizAmount / 100);

                    if (gobizAmountInRupiah === expectedAmount && (txStatus === 'settlement' || txStatus === 'capture')) {
                        const txTimeDate = txTime ? new Date(txTime) : now;
                        const txCreated = new Date(transaction.createdAt);
                        if (txTimeDate.getTime() >= (txCreated.getTime() - 5 * 60 * 1000)) {
                            isPaid = true;
                            paidAt = txTimeDate;
                            break;
                        }
                    }
                }
            } catch (gobizError) {
                console.error('[Deposit/GoMerchant] Check error:', gobizError);
            }
        }

        if (!isPaid) {
            return NextResponse.json({ status: 'pending', message: 'Menunggu pembayaran' });
        }

        // --- Payment Validated, Add Saldo ---
        const user = await prisma.user.findUnique({ where: { id: transaction.userId }, select: { saldo: true } });
        if (!user) {
            return NextResponse.json({ status: 'error', message: 'User tidak ditemukan' }, { status: 404 });
        }

        await prisma.$transaction([
            prisma.transaction.update({
                where: { id: transaction.id },
                data: { paymentStatus: 'paid', paidAt },
            }),
            prisma.user.update({
                where: { id: transaction.userId },
                data: { saldo: user.saldo + transaction.amount },
            }),
            prisma.saldoLog.create({
                data: {
                    userId: transaction.userId,
                    amount: transaction.amount,
                    balanceBefore: user.saldo,
                    balanceAfter: user.saldo + transaction.amount,
                    type: 'deposit',
                    description: `Deposit via QRIS (${transaction.trxId})`,
                },
            }),
        ]);

        return NextResponse.json({ status: 'success', message: 'Deposit berhasil diproses' });
    } catch (error) {
        console.error('Deposit callback error:', error);
        return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
    }
}
