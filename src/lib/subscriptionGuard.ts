import prisma from './prisma';

export interface ValidatedUser {
    id: string;
    username: string;
    email: string;
    role: string;
    isVerified: boolean;
    saldo: number;
    planId: string | null;
    planExpiresAt: Date | null;
    plan: {
        id: string;
        name: string;
        price: number;
        durationDays: number;
        maxMerchants: number;
        maxWhitelistIps: number;
        prioritySupport: boolean;
    } | null;
    whitelistIps: { id: string; ipAddress: string; label: string | null }[];
}

export interface GuardResult {
    success: boolean;
    error?: {
        status: number;
        code: number;
        message: string;
    };
    user?: ValidatedUser;
}

/**
 * Extract client IP from request headers.
 * Supports X-Forwarded-For, X-Real-IP, and falls back to 127.0.0.1.
 */
export function getClientIp(headers: Headers): string {
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    const realIp = headers.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    return '127.0.0.1';
}

/**
 * Validate an API request through all subscription checks:
 * 1. API key valid
 * 2. Subscription active (has planId)
 * 3. Subscription not expired
 * 4. IP in whitelist
 */
export async function validateApiRequest(apiKey: string, requestIp: string): Promise<GuardResult> {
    // 1. Validate API key
    const user = await prisma.user.findUnique({
        where: { apiKey },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isVerified: true,
            saldo: true,
            planId: true,
            planExpiresAt: true,
            plan: {
                select: {
                    id: true,
                    name: true,
                    price: true,
                    durationDays: true,
                    maxMerchants: true,
                    maxWhitelistIps: true,
                    prioritySupport: true,
                },
            },
            whitelistIps: {
                select: {
                    id: true,
                    ipAddress: true,
                    label: true,
                },
            },
        },
    });

    if (!user) {
        return {
            success: false,
            error: {
                status: 401,
                code: 401,
                message: 'API key tidak valid',
            },
        };
    }

    // 2. Check subscription active
    if (!user.planId || !user.plan) {
        return {
            success: false,
            error: {
                status: 403,
                code: 403,
                message: 'Silahkan membeli plan untuk mendapatkan akses API',
            },
        };
    }

    // 3. Check subscription not expired
    if (user.planExpiresAt && new Date() > user.planExpiresAt) {
        return {
            success: false,
            error: {
                status: 403,
                code: 403,
                message: 'Subscription anda telah berakhir',
            },
        };
    }

    // 4. Check IP whitelist
    if (user.whitelistIps.length > 0) {
        const isIpAllowed = user.whitelistIps.some(w => w.ipAddress === requestIp);
        if (!isIpAllowed) {
            return {
                success: false,
                error: {
                    status: 403,
                    code: 403,
                    message: 'IP tidak diizinkan mengakses API',
                },
            };
        }
    }

    return {
        success: true,
        user: user as ValidatedUser,
    };
}

/**
 * Check if user can add more merchants based on their plan limit.
 */
export async function checkMerchantLimit(userId: string, maxMerchants: number): Promise<boolean> {
    const count = await prisma.goMerchant.count({ where: { userId } });
    return count < maxMerchants;
}

/**
 * Check if user can add more whitelist IPs based on their plan limit.
 */
export async function checkWhitelistIpLimit(userId: string, maxWhitelistIps: number): Promise<boolean> {
    const count = await prisma.whitelistIp.count({ where: { userId } });
    return count < maxWhitelistIps;
}
