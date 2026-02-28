import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateApiRequest, getClientIp } from '@/lib/subscriptionGuard';
import { checkRateLimit } from '@/lib/rateLimit';
import { GobizService } from '@/lib/gobiz';
import { normalizeAmount } from '@/lib/amountUtils';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { apikey, ref_id } = body;

        if (!apikey || !ref_id) {
            return NextResponse.json(
                { status: 'error', code: 400, message: 'Field apikey dan ref_id wajib diisi' },
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

        // Find transaction
        const transaction = await prisma.transaction.findFirst({
            where: { refId: ref_id, userId: user.id },
            include: { merchant: true },
        });

        if (!transaction) {
            return NextResponse.json(
                { status: 'error', code: 404, message: 'Transaksi tidak ditemukan' },
                { status: 404 }
            );
        }

        // Check if already paid or expired
        if (transaction.paymentStatus === 'paid') {
            return NextResponse.json({
                status: 'success',
                code: 200,
                message: 'Pembayaran berhasil',
                data: {
                    trx_id: transaction.trxId,
                    ref_id: transaction.refId,
                    amount: transaction.amount,
                    total_amount: transaction.totalAmount,
                    payment_type: 'qris',
                    payment_status: 'paid',
                    paid_at: transaction.paidAt?.toISOString(),
                },
            });
        }

        const now = new Date();
        console.log(`[Status] ref_id=${ref_id} paymentStatus=${transaction.paymentStatus} now=${now.toISOString()} expiresAt=${transaction.expiresAt.toISOString()} expired=${now > transaction.expiresAt}`);

        if (now > transaction.expiresAt) {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { paymentStatus: 'expired' },
            });

            return NextResponse.json({
                status: 'success',
                code: 200,
                message: 'Transaksi sudah kadaluarsa',
                data: {
                    trx_id: transaction.trxId,
                    ref_id: transaction.refId,
                    amount: transaction.amount,
                    total_amount: transaction.totalAmount,
                    payment_type: 'qris',
                    payment_status: 'expired',
                },
            });
        }

        // If still pending, check with GoBiz
        try {
            const gobiz = new GobizService(transaction.merchant.xUniqueid);
            const { data: txData } = await gobiz.getTransactionsWithAutoRefresh(
                transaction.merchant.id,
                transaction.merchant.accessToken,
                transaction.merchant.refreshToken,
                { size: 50 }
            );

            const entries = txData?.hits || txData?.data?.journals || [];
            console.log(`[Status] Found ${entries.length} entries to check against totalAmount=${transaction.totalAmount}`);

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
                const expectedAmount = normalizeAmount(transaction.totalAmount);

                console.log(`[Status] Comparing: gobiz_raw=${txAmountRaw} gobiz_rupiah=${gobizAmountInRupiah} vs expected=${expectedAmount}, status=${txStatus}`);

                if (
                    gobizAmountInRupiah === expectedAmount &&
                    (txStatus === 'settlement' || txStatus === 'capture')
                ) {
                    const paidAt = new Date(txTime || new Date());
                    await prisma.transaction.update({
                        where: { id: transaction.id },
                        data: { paymentStatus: 'paid', paidAt },
                    });

                    return NextResponse.json({
                        status: 'success',
                        code: 200,
                        message: 'Pembayaran berhasil',
                        data: {
                            trx_id: transaction.trxId,
                            ref_id: transaction.refId,
                            amount: transaction.amount,
                            total_amount: transaction.totalAmount,
                            payment_type: 'qris',
                            payment_status: 'paid',
                            paid_at: paidAt.toISOString(),
                        },
                    });
                }
            }
        } catch (gobizError) {
            if (gobizError instanceof Error && gobizError.name === 'TokenExpiredError') {
                console.error('[Status] GoBiz token expired, re-login required:', gobizError.message);
            } else {
                console.error('[Status] GoBiz check error:', gobizError);
            }
        }

        return NextResponse.json({
            status: 'success',
            code: 200,
            message: 'Menunggu pembayaran',
            data: {
                trx_id: transaction.trxId,
                ref_id: transaction.refId,
                amount: transaction.amount,
                total_amount: transaction.totalAmount,
                payment_type: 'qris',
                payment_status: 'pending',
                expires_at: transaction.expiresAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('Status API error:', error);
        return NextResponse.json(
            { status: 'error', code: 500, message: 'Server error' },
            { status: 500 }
        );
    }
}
