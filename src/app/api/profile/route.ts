import { NextRequest, NextResponse } from 'next/server';
import { getUserByApiKey } from '@/lib/auth';
import { checkRateLimit, incrementApiCount } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { apikey } = body;

        if (!apikey) {
            return NextResponse.json(
                { status: 'error', code: 400, message: 'API key wajib diisi' },
                { status: 400 }
            );
        }

        const user = await getUserByApiKey(apikey);
        if (!user) {
            return NextResponse.json(
                { status: 'error', code: 401, message: 'API key tidak valid' },
                { status: 401 }
            );
        }

        // Rate limit check
        const rateLimit = await checkRateLimit(`api:${user.id}`);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { status: 'error', code: 429, message: 'Rate limit exceeded' },
                { status: 429 }
            );
        }

        await incrementApiCount(user.id);

        return NextResponse.json({
            status: 'Success',
            data: {
                name: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Profile API error:', error);
        return NextResponse.json(
            { status: 'error', code: 500, message: 'Server error' },
            { status: 500 }
        );
    }
}
