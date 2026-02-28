import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const TOKEN_EXPIRY = '7d';

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function generateApiKey(): string {
    return `mk_${uuidv4().replace(/-/g, '')}`;
}

export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

export async function getAuthUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
            id: true,
            username: true,
            email: true,
            whatsapp: true,
            role: true,
            apiKey: true,
            isVerified: true,
            planId: true,
            planExpiresAt: true,
            createdAt: true,
            plan: true,
            whitelistIps: {
                select: {
                    id: true,
                    ipAddress: true,
                    label: true,
                },
            },
        },
    });

    return user;
}

export async function getUserByApiKey(apiKey: string) {
    return prisma.user.findUnique({
        where: { apiKey },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isVerified: true,
            planId: true,
            planExpiresAt: true,
            plan: true,
            whitelistIps: {
                select: {
                    id: true,
                    ipAddress: true,
                    label: true,
                },
            },
        },
    });
}

export function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
