import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    const { pathname } = request.nextUrl;

    // Protected routes
    const protectedPaths = ['/user', '/admin'];
    const isProtected = protectedPaths.some(path => pathname.startsWith(path));

    if (isProtected && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Redirect authenticated users away from auth pages
    const authPaths = ['/login', '/register'];
    const isAuthPage = authPaths.includes(pathname);

    if (isAuthPage && token) {
        return NextResponse.redirect(new URL('/user/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/user/:path*', '/admin/:path*', '/login', '/register'],
};
