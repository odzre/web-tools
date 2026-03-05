import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { runSellerAutomation, SellerConfig } from '@/lib/digiflazz';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return new Response(JSON.stringify({ status: 'error', message: 'Unauthorized' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            });
        }

        // Check saldo
        if (user.saldo < 15) {
            return new Response(JSON.stringify({ status: 'error', message: `Saldo tidak cukup (${user.saldo}P). Minimum 15P untuk menjalankan tools.` }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        // Check connected
        const account = await prisma.digiflazzAccount.findUnique({ where: { userId: user.id } });
        if (!account || !account.isConnected) {
            return new Response(JSON.stringify({ status: 'error', message: 'Belum login ke Digiflazz. Login terlebih dahulu.' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await req.json();
        const config: SellerConfig = {
            kategori: body.kategori || '',
            brand: body.brand || '',
            type: body.type || '',
            autoKodeProduk: body.autoKodeProduk ?? true,
            autoHargaMax: body.autoHargaMax ?? true,
            pilihTermurah: body.pilihTermurah ?? false,
            sellerRandom: body.sellerRandom ?? true,
            ratingMinimal: body.ratingMinimal ?? 0,
            blockedSellers: body.blockedSellers || [],
        };

        if (!config.kategori || !config.brand) {
            return new Response(JSON.stringify({ status: 'error', message: 'Kategori dan Brand wajib diisi' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        // SSE Stream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const log = (msg: string) => {
                    try {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message: msg })}\n\n`));
                    } catch { /* stream closed */ }
                };

                const checkSaldo = async (): Promise<number> => {
                    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { saldo: true } });
                    return u?.saldo ?? 0;
                };

                const deductSaldo = async (): Promise<boolean> => {
                    try {
                        const u = await prisma.user.findUnique({ where: { id: user.id }, select: { saldo: true } });
                        if (!u || u.saldo < 15) return false;
                        await prisma.$transaction([
                            prisma.user.update({ where: { id: user.id }, data: { saldo: { decrement: 15 } } }),
                            prisma.saldoLog.create({
                                data: {
                                    userId: user.id,
                                    amount: -15,
                                    balanceBefore: u.saldo,
                                    balanceAfter: u.saldo - 15,
                                    type: 'usage',
                                    description: 'Digiflazz seller automation',
                                },
                            }),
                        ]);
                        return true;
                    } catch { return false; }
                };

                try {
                    log('🚀 Memulai Digiflazz Seller Automation...');
                    log(`📂 Config: ${config.kategori} > ${config.brand} > ${config.type || 'Semua'}`);
                    log(`💰 Saldo: ${user.saldo}P (15P per seller)\n`);

                    const result = await runSellerAutomation(
                        account.cookiesData,
                        config,
                        log,
                        checkSaldo,
                        deductSaldo
                    );

                    // Update lastUsedAt
                    await prisma.digiflazzAccount.update({
                        where: { userId: user.id },
                        data: { lastUsedAt: new Date() },
                    }).catch(() => { });

                    // If session expired, mark disconnected
                    if (!result.success && result.processed === 0) {
                        await prisma.digiflazzAccount.update({
                            where: { userId: user.id },
                            data: { isConnected: false },
                        }).catch(() => { });
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', ...result })}\n\n`));
                } catch (error) {
                    const msg = error instanceof Error ? error.message : 'Unknown error';
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`));
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Digiflazz run error:', error);
        return new Response(JSON.stringify({ status: 'error', message: 'Server error' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
}
