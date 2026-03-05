import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateApiRequest, getClientIp } from '@/lib/subscriptionGuard';
import { GobizService } from '@/lib/gobiz';
import { okGetMutasi } from '@/lib/orderkuota';
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

        const clientIp = getClientIp(req.headers);
        const guard = await validateApiRequest(apikey, clientIp);
        if (!guard.success) {
            return NextResponse.json(
                { status: 'error', code: guard.error!.code, message: guard.error!.message },
                { status: guard.error!.status }
            );
        }
        const user = guard.user!;

        // Find transaction (include both merchant types)
        const transaction = await prisma.transaction.findFirst({
            where: { refId: ref_id, userId: user.id },
            include: {
                merchant: true,
                okMerchant: true,
            },
        });

        if (!transaction) {
            return NextResponse.json(
                { status: 'error', code: 404, message: 'Transaksi tidak ditemukan' },
                { status: 404 }
            );
        }

        // Already paid
        if (transaction.paymentStatus === 'paid') {
            return NextResponse.json({
                status: 'success', code: 200,
                message: 'Pembayaran berhasil',
                data: {
                    trx_id: transaction.trxId, ref_id: transaction.refId,
                    amount: transaction.amount, total_amount: transaction.totalAmount,
                    payment_type: 'qris', payment_status: 'paid',
                    paid_at: transaction.paidAt?.toISOString(),
                },
            });
        }

        // Check expired
        const now = new Date();
        if (now > transaction.expiresAt) {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { paymentStatus: 'expired' },
            });
            return NextResponse.json({
                status: 'success', code: 200,
                message: 'Transaksi sudah kadaluarsa',
                data: {
                    trx_id: transaction.trxId, ref_id: transaction.refId,
                    amount: transaction.amount, total_amount: transaction.totalAmount,
                    payment_type: 'qris', payment_status: 'expired',
                },
            });
        }

        // ════════════════════════════════════════════
        // SPLIT LOGIC: GoMerchant vs OrderKuota
        // ════════════════════════════════════════════

        if (transaction.toolType === 'orderKuota' && transaction.okMerchant) {
            // ─── OrderKuota mutasi check ───
            return await checkOrderKuotaStatus(transaction, now);
        } else {
            // ─── GoMerchant GoBiz check (original logic) ───
            return await checkGoMerchantStatus(transaction, now);
        }

    } catch (error) {
        console.error('Status API error:', error);
        return NextResponse.json(
            { status: 'error', code: 500, message: 'Server error' },
            { status: 500 }
        );
    }
}

// ─── GoMerchant Status Check (unchanged original logic) ─────────────────────
async function checkGoMerchantStatus(
    transaction: {
        id: string; trxId: string; refId: string; amount: number;
        totalAmount: number; expiresAt: Date;
        merchant: { id: string; xUniqueid: string; accessToken: string; refreshToken: string } | null;
    },
    now: Date
) {
    if (!transaction.merchant) {
        return NextResponse.json({
            status: 'success', code: 200, message: 'Menunggu pembayaran',
            data: {
                trx_id: transaction.trxId, ref_id: transaction.refId,
                amount: transaction.amount, total_amount: transaction.totalAmount,
                payment_type: 'qris', payment_status: 'pending',
                expires_at: transaction.expiresAt.toISOString(),
            },
        });
    }

    try {
        const gobiz = new GobizService(transaction.merchant.xUniqueid);
        const { data: txData } = await gobiz.getTransactionsWithAutoRefresh(
            transaction.merchant.id,
            transaction.merchant.accessToken,
            transaction.merchant.refreshToken,
            { size: 50 }
        );

        const entries = txData?.hits || txData?.data?.journals || [];
        console.log(`[Status/GoMerchant] Found ${entries.length} entries for totalAmount=${transaction.totalAmount}`);

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

            if (gobizAmountInRupiah === expectedAmount && (txStatus === 'settlement' || txStatus === 'capture')) {
                const paidAt = new Date(txTime || now);
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { paymentStatus: 'paid', paidAt },
                });
                return NextResponse.json({
                    status: 'success', code: 200, message: 'Pembayaran berhasil',
                    data: {
                        trx_id: transaction.trxId, ref_id: transaction.refId,
                        amount: transaction.amount, total_amount: transaction.totalAmount,
                        payment_type: 'qris', payment_status: 'paid',
                        paid_at: paidAt.toISOString(),
                    },
                });
            }
        }
    } catch (gobizError) {
        if (gobizError instanceof Error && gobizError.name === 'TokenExpiredError') {
            console.error('[Status/GoMerchant] Token expired:', gobizError.message);
        } else {
            console.error('[Status/GoMerchant] Check error:', gobizError);
        }
    }

    return NextResponse.json({
        status: 'success', code: 200, message: 'Menunggu pembayaran',
        data: {
            trx_id: transaction.trxId, ref_id: transaction.refId,
            amount: transaction.amount, total_amount: transaction.totalAmount,
            payment_type: 'qris', payment_status: 'pending',
            expires_at: transaction.expiresAt.toISOString(),
        },
    });
}

// ─── OrderKuota Mutasi Status Check ─────────────────────────────────────────
async function checkOrderKuotaStatus(
    transaction: {
        id: string; trxId: string; refId: string; amount: number;
        totalAmount: number; expiresAt: Date;
        okMerchant: { id: string; okUsername: string; okAuthToken: string } | null;
    },
    now: Date
) {
    if (!transaction.okMerchant) {
        return NextResponse.json({
            status: 'success', code: 200, message: 'Menunggu pembayaran',
            data: {
                trx_id: transaction.trxId, ref_id: transaction.refId,
                amount: transaction.amount, total_amount: transaction.totalAmount,
                payment_type: 'qris', payment_status: 'pending',
                expires_at: transaction.expiresAt.toISOString(),
            },
        });
    }

    try {
        const mutasiRes = await okGetMutasi(
            transaction.okMerchant.okUsername,
            transaction.okMerchant.okAuthToken
        );

        const entries = mutasiRes?.result || [];
        console.log(`[Status/OrderKuota] Found ${entries.length} mutasi for totalAmount=${transaction.totalAmount}`);

        const expectedAmount = normalizeAmount(transaction.totalAmount);

        for (const entry of entries) {
            // Only check incoming transactions
            if (entry.status !== 'IN') continue;

            // Normalize kredit — handles "4.000", "4.000,00", "4000" etc.
            const kredit = normalizeAmount(entry.kredit);

            console.log(`[Status/OrderKuota] kredit=${entry.kredit} normalized=${kredit} vs expected=${expectedAmount}`);

            if (kredit === expectedAmount) {
                // Match found — mark as paid
                const paidAt = now;
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { paymentStatus: 'paid', paidAt },
                });

                return NextResponse.json({
                    status: 'success', code: 200, message: 'Pembayaran berhasil',
                    data: {
                        trx_id: transaction.trxId, ref_id: transaction.refId,
                        amount: transaction.amount, total_amount: transaction.totalAmount,
                        payment_type: 'qris', payment_status: 'paid',
                        paid_at: paidAt.toISOString(),
                    },
                });
            }
        }
    } catch (okError) {
        console.error('[Status/OrderKuota] Mutasi check error:', okError);
    }

    return NextResponse.json({
        status: 'success', code: 200, message: 'Menunggu pembayaran',
        data: {
            trx_id: transaction.trxId, ref_id: transaction.refId,
            amount: transaction.amount, total_amount: transaction.totalAmount,
            payment_type: 'qris', payment_status: 'pending',
            expires_at: transaction.expiresAt.toISOString(),
        },
    });
}
