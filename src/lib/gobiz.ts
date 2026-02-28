import axios, { AxiosInstance, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

/**
 * Custom error thrown when both access_token AND refresh_token are expired.
 * The caller should prompt the user to re-login via OTP.
 */
export class TokenExpiredError extends Error {
    public merchantId: string;
    constructor(merchantId: string, message?: string) {
        super(message || 'Both access_token and refresh_token have expired. Re-login required.');
        this.name = 'TokenExpiredError';
        this.merchantId = merchantId;
    }
}

export interface TransactionOptions {
    from?: number;
    size?: number;
    merchantId?: string;
    dateFrom?: string;
    dateTo?: string;
}

export class GobizService {
    private api: AxiosInstance;
    private clientId = 'go-biz-web-new';
    private xUniqueid: string;

    constructor(xUniqueid?: string) {
        this.xUniqueid = xUniqueid || uuidv4();

        this.api = axios.create({
            baseURL: 'https://api.gobiz.co.id',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'id',
                'authentication-type': 'go-id',
                'connection': 'keep-alive',
                'content-type': 'application/json',
                'gojek-country-code': 'ID',
                'gojek-timezone': 'Asia/Makassar',
                'host': 'api.gobiz.co.id',
                'origin': 'https://portal.gofoodmerchant.co.id',
                'referer': 'https://portal.gofoodmerchant.co.id/',
                'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'cross-site',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
                'x-appid': 'go-biz-web-dashboard',
                'x-appversion': 'transaction-1.22.0-3d465258',
                'x-deviceos': 'Web',
                'x-phonemake': 'Windows 10 64-bit',
                'x-phonemodel': 'Chrome 145.0.0.0 on Windows 10 64-bit',
                'x-platform': 'Web',
                'x-uniqueid': this.xUniqueid,
                'x-user-locale': 'en-ID',
                'x-user-type': 'merchant',
            },
        });
    }

    getXUniqueid(): string {
        return this.xUniqueid;
    }

    // ─── Authentication ──────────────────────────────────────────────

    async requestOtp(phoneNumber: string, countryCode: string = '62') {
        const payload = {
            client_id: this.clientId,
            phone_number: phoneNumber,
            country_code: countryCode,
        };

        const { data } = await this.api.post('/goid/login/request', payload, {
            headers: { authorization: 'Bearer' },
        });

        if (data.data?.access_token) {
            return {
                requiresOtp: false,
                accessToken: data.data.access_token,
            };
        }

        if (data.data?.otp_token) {
            return {
                requiresOtp: true,
                otpToken: data.data.otp_token,
                otpLength: data.data.otp_length,
                otpExpiresIn: data.data.otp_expires_in,
            };
        }

        throw new Error('Unexpected response from GoBiz login');
    }

    async verifyOtp(otp: string, otpToken: string) {
        const payload = {
            client_id: this.clientId,
            data: {
                otp: String(otp),
                otp_token: otpToken,
            },
            grant_type: 'otp',
        };

        const { data } = await this.api.post('/goid/token', payload, {
            headers: { authorization: 'Bearer' },
        });

        if (data.access_token) {
            return {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
            };
        }

        throw new Error('OTP verification failed');
    }

    // ─── Token Refresh ───────────────────────────────────────────────

    /**
     * Refresh the access_token using a valid refresh_token.
     * Calls GoBiz's /goid/token endpoint with grant_type: refresh_token.
     * 
     * @param refreshToken - The plaintext (decrypted) refresh token
     * @returns New access_token and refresh_token pair
     * @throws Error if refresh_token is expired/invalid
     */
    async refreshAccessToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        const payload = {
            client_id: this.clientId,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        };

        const { data } = await this.api.post('/goid/token', payload, {
            headers: { authorization: 'Bearer' },
        });

        if (data.access_token) {
            return {
                accessToken: data.access_token,
                refreshToken: data.refresh_token || refreshToken,
            };
        }

        throw new Error('Failed to refresh access token');
    }

    // ─── Helper: detect if an error is a 401 / token expired ─────────

    private isTokenExpiredError(error: unknown): boolean {
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            if (status === 401) return true;

            // Some APIs return 403 with specific messages for expired tokens
            if (status === 403) {
                const msg = JSON.stringify(error.response?.data || '').toLowerCase();
                if (msg.includes('token') && (msg.includes('expired') || msg.includes('invalid'))) {
                    return true;
                }
            }
        }
        return false;
    }

    // ─── Transactions ────────────────────────────────────────────────

    async getTransactions(accessToken: string, options?: TransactionOptions) {
        const clauses: unknown[] = [
            {
                op: 'not',
                clauses: [
                    {
                        clauses: [
                            {
                                field: 'metadata.source',
                                op: 'in',
                                value: ['GOSAVE_ONLINE', 'GoSave', 'GODEALS_ONLINE'],
                            },
                            {
                                field: 'metadata.gopay.source',
                                op: 'in',
                                value: ['GOSAVE_ONLINE', 'GoSave', 'GODEALS_ONLINE'],
                            },
                        ],
                        op: 'or',
                    },
                ],
            },
            {
                field: 'metadata.transaction.status',
                op: 'in',
                value: ['settlement', 'capture', 'refund', 'partial_refund'],
            },
            {
                op: 'or',
                clauses: [
                    {
                        op: 'or',
                        clauses: [
                            {
                                field: 'metadata.transaction.payment_type',
                                op: 'in',
                                value: ['qris', 'gopay', 'offline_credit_card', 'offline_debit_card', 'credit_card'],
                            },
                        ],
                    },
                ],
            },
        ];

        if (options?.merchantId) {
            clauses.push({
                field: 'metadata.transaction.merchant_id',
                op: 'equal',
                value: options.merchantId,
            });
        }

        if (options?.dateFrom) {
            clauses.push({
                field: 'metadata.transaction.transaction_time',
                op: 'gte',
                value: options.dateFrom,
            });
        }

        if (options?.dateTo) {
            clauses.push({
                field: 'metadata.transaction.transaction_time',
                op: 'lte',
                value: options.dateTo,
            });
        }

        const payload = {
            from: options?.from || 0,
            size: options?.size || 20,
            sort: { time: { order: 'desc' } },
            included_categories: {
                incoming: ['transaction_share', 'action'],
            },
            query: [{ clauses, op: 'and' }],
        };

        const { data } = await this.api.post('/journals/search', payload, {
            headers: { authorization: `Bearer ${accessToken}` },
        });

        return data;
    }

    // ─── Auto-Refresh Transaction Fetch ──────────────────────────────

    /**
     * Fetch transactions with automatic token refresh on 401.
     * 
     * Flow:
     * 1. Try getTransactions with current access_token
     * 2. If 401 → refresh token using refresh_token
     * 3. Update tokens in DB (GoMerchant)
     * 4. Retry the original request with new access_token
     * 5. If refresh also fails → throw TokenExpiredError (needs re-login OTP)
     * 
     * @param merchantId   - GoMerchant DB record id
     * @param encryptedAccessToken  - Encrypted access token from DB
     * @param encryptedRefreshToken - Encrypted refresh token from DB
     * @param options      - Transaction query options
     * @returns Transaction data + flag if token was refreshed
     */
    async getTransactionsWithAutoRefresh(
        merchantId: string,
        encryptedAccessToken: string,
        encryptedRefreshToken: string,
        options?: TransactionOptions
    ): Promise<{
        data: any;
        tokenRefreshed: boolean;
    }> {
        const accessToken = decrypt(encryptedAccessToken);

        // ── Attempt 1: Try with current access_token ──
        try {
            const data = await this.getTransactions(accessToken, options);
            return { data, tokenRefreshed: false };
        } catch (error) {
            // If it's not a token error, re-throw immediately
            if (!this.isTokenExpiredError(error)) {
                throw error;
            }
            console.log(`[GoBiz] Access token expired for merchant ${merchantId}, attempting refresh...`);
        }

        // ── Attempt 2: Refresh token and retry ──
        let refreshToken: string;
        try {
            refreshToken = decrypt(encryptedRefreshToken);
        } catch {
            throw new TokenExpiredError(merchantId, 'Failed to decrypt refresh token. Re-login required.');
        }

        try {
            const newTokens = await this.refreshAccessToken(refreshToken);
            console.log(`[GoBiz] Token refreshed successfully for merchant ${merchantId}`);

            // Update tokens in database
            const newEncryptedAccess = encrypt(newTokens.accessToken);
            const newEncryptedRefresh = encrypt(newTokens.refreshToken);

            await prisma.goMerchant.update({
                where: { id: merchantId },
                data: {
                    accessToken: newEncryptedAccess,
                    refreshToken: newEncryptedRefresh,
                },
            });

            // Retry the original request with new token
            const data = await this.getTransactions(newTokens.accessToken, options);
            return { data, tokenRefreshed: true };
        } catch (refreshError) {
            // If refresh also fails with 401, both tokens are expired
            if (this.isTokenExpiredError(refreshError)) {
                console.error(`[GoBiz] Refresh token also expired for merchant ${merchantId}. Re-login needed.`);
                throw new TokenExpiredError(merchantId);
            }
            // Other errors during refresh
            throw refreshError;
        }
    }
}
