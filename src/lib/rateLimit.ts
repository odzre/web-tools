import redis from './redis';

const WINDOW_SIZE = 60; // seconds
const MAX_REQUESTS_PER_WINDOW = 30;

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    total: number;
}

export async function checkRateLimit(
    identifier: string,
    maxRequests: number = MAX_REQUESTS_PER_WINDOW,
    windowSize: number = WINDOW_SIZE
): Promise<RateLimitResult> {
    try {
        const key = `ratelimit:${identifier}`;
        const now = Date.now();
        const windowStart = now - windowSize * 1000;

        // Use Redis sorted set for sliding window
        const pipeline = redis.pipeline();
        pipeline.zremrangebyscore(key, 0, windowStart);
        pipeline.zadd(key, now, `${now}-${Math.random()}`);
        pipeline.zcard(key);
        pipeline.expire(key, windowSize);

        const results = await pipeline.exec();
        const requestCount = (results?.[2]?.[1] as number) || 0;

        return {
            allowed: requestCount <= maxRequests,
            remaining: Math.max(0, maxRequests - requestCount),
            resetAt: now + windowSize * 1000,
            total: requestCount,
        };
    } catch (error) {
        console.error('Rate limit check failed:', error);
        // If Redis is down, allow the request
        return { allowed: true, remaining: maxRequests, resetAt: 0, total: 0 };
    }
}

export async function incrementApiCount(userId: string): Promise<number> {
    try {
        const key = `api_count:${userId}`;
        const count = await redis.incr(key);
        // Keep stats for 30 days
        await redis.expire(key, 30 * 24 * 60 * 60);
        return count;
    } catch {
        return 0;
    }
}

export async function getApiCount(userId: string): Promise<number> {
    try {
        const key = `api_count:${userId}`;
        const count = await redis.get(key);
        return parseInt(count || '0');
    } catch {
        return 0;
    }
}
