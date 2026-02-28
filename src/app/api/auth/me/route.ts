import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { status: 'error', message: 'Not authenticated' },
                { status: 401 }
            );
        }

        return NextResponse.json({
            status: 'success',
            data: user,
        });
    } catch (error) {
        console.error('Auth me error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Server error' },
            { status: 500 }
        );
    }
}
