import { URLSearchParams } from 'url';
import prisma from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

const API_URL = 'https://app.orderkuota.com/api/v2';
const HOST = 'app.orderkuota.com';
const USER_AGENT = 'okhttp/4.12.0';
const APP_VERSION_NAME = '25.08.11';
const APP_VERSION_CODE = '250811';
const APP_REG_ID = 'cUx8YuXhS5yLKPOaY6_zv_:APA91bH7c1pEuuxtYnTgJAegkbDkj8cicnpkEEQkp0v2yr3bEfWKqIYCuNkwX_VdUjQuJ3UpP75mb72I3kowTpXGomHsspEfIaNnVabdrCEeHFG2IEWWLPU';

// ─── Interfaces sesuai response API OrderKuota ────────────────────────

export interface OKMutasiEntry {
    id: number;
    debet: string;
    kredit: string;
    saldo_akhir: string;
    keterangan: string;
    tanggal: string;
    status: string;
    fee: string;
    brand?: { name: string; logo: string };
}

export interface OKMutasiResponse {
    result?: OKMutasiEntry[];
    error?: string;
}

/** Response login step 1: OTP required */
export interface OKLoginOtpResult {
    otp: string;       // "email"
    otp_value: string; // "reyd****mail.com"
}

/** Response login step 2: OTP verified, token received */
export interface OKLoginSuccessResult {
    otp: string;       // "" (empty)
    id: string;        // "2447632"
    name: string;      // "reydhojunico"
    username: string;  // "reydhojunico"
    balance: string;   // "311"
    token: string;     // "2447632:QfdaPV4JBzXgUYRNZkxO6nsD3FAMS2pr"
}

/** Unified login response from OrderKuota API */
export interface OKLoginResponse {
    result?: OKLoginOtpResult | OKLoginSuccessResult;
    error?: string;
}

/** Helper: check if login result is OTP step */
export function isOtpRequired(result: OKLoginOtpResult | OKLoginSuccessResult): result is OKLoginOtpResult {
    return result.otp !== '' && result.otp !== undefined;
}

/** Helper: check if login result has token (OTP success) */
export function hasToken(result: OKLoginOtpResult | OKLoginSuccessResult): result is OKLoginSuccessResult {
    return 'token' in result && typeof (result as OKLoginSuccessResult).token === 'string' && (result as OKLoginSuccessResult).token.length > 0;
}

// ─── HTTP ─────────────────────────────────────────────────────────────

function buildHeaders() {
    return {
        'Host': HOST,
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
    };
}

async function request<T>(method: string, url: string, body?: URLSearchParams): Promise<T> {
    const res = await fetch(url, {
        method,
        headers: buildHeaders(),
        body: body ? body.toString() : undefined,
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await res.json() as T;
    }
    return await res.text() as unknown as T;
}

// ─── Login & OTP ──────────────────────────────────────────────────────

/**
 * Step 1: Login with username + password.
 * Expected response:
 *   Success → { result: { otp: "email", otp_value: "reyd****mail.com" } }
 *   Fail    → { error: "Nama pengguna atau kata sandi tidak benar." }
 */
export async function okLoginRequest(username: string, password: string): Promise<OKLoginResponse> {
    const payload = new URLSearchParams({
        username,
        password,
        app_reg_id: APP_REG_ID,
        app_version_code: APP_VERSION_CODE,
        app_version_name: APP_VERSION_NAME,
    });
    return request<OKLoginResponse>('POST', `${API_URL}/login`, payload);
}

/**
 * Step 2: Verify OTP.
 * Expected response:
 *   Success → { result: { otp: "", id, name, username, balance, token } }
 *   Fail    → { error: "OTP salah atau kadaluarsa" }
 */
export async function okVerifyOtp(username: string, otp: string): Promise<OKLoginResponse> {
    const payload = new URLSearchParams({
        username,
        password: otp,
        app_reg_id: APP_REG_ID,
        app_version_code: APP_VERSION_CODE,
        app_version_name: APP_VERSION_NAME,
    });
    return request<OKLoginResponse>('POST', `${API_URL}/login`, payload);
}

// ─── Mutasi ───────────────────────────────────────────────────────────

/**
 * Get mutasi QRIS for the given merchant.
 * `encryptedAuthToken` is the encrypted token stored in DB.
 */
export async function okGetMutasi(
    okUsername: string,
    encryptedAuthToken: string
): Promise<OKMutasiResponse> {
    const authToken = decrypt(encryptedAuthToken);
    const userId = authToken.split(':')[0];

    const payload = new URLSearchParams({
        auth_token: authToken,
        auth_username: okUsername,
        'requests[qris_history][jumlah]': '',
        'requests[qris_history][jenis]': '',
        'requests[qris_history][page]': '1',
        'requests[qris_history][dari_tanggal]': '',
        'requests[qris_history][ke_tanggal]': '',
        'requests[qris_history][keterangan]': '',
        'requests[0]': 'account',
        app_version_name: APP_VERSION_NAME,
        app_version_code: APP_VERSION_CODE,
        app_reg_id: APP_REG_ID,
    });

    const endpoint = userId
        ? `${API_URL}/qris/mutasi/${userId}`
        : `${API_URL}/get`;

    return request<OKMutasiResponse>('POST', endpoint, payload);
}

// ─── QRIS ─────────────────────────────────────────────────────────────

function convertCRC16(str: string): string {
    let crc = 0xFFFF;
    for (let c = 0; c < str.length; c++) {
        crc ^= str.charCodeAt(c) << 8;
        for (let i = 0; i < 8; i++) {
            crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
        }
    }
    return ('000' + (crc & 0xFFFF).toString(16).toUpperCase()).slice(-4);
}

export function createOKQRIS(amount: number, staticQrString: string): {
    qr_string: string;
    qr_image: string;
} {
    let qrisData = staticQrString;
    qrisData = qrisData.slice(0, -4);
    const step1 = qrisData.replace('010211', '010212');
    const step2 = step1.split('5802ID');
    const amountStr = amount.toString();
    const amountTLV = '54' + ('0' + amountStr.length).slice(-2) + amountStr;
    const final = step2[0] + amountTLV + '5802ID' + step2[1];
    const qr_string = final + convertCRC16(final);
    const qr_image = `https://quickchart.io/qr?text=${encodeURIComponent(qr_string)}&size=300`;
    return { qr_string, qr_image };
}

// ─── Utils ────────────────────────────────────────────────────────────

export async function countAllMerchants(userId: string): Promise<number> {
    const [goCount, okCount] = await Promise.all([
        prisma.goMerchant.count({ where: { userId } }),
        prisma.orderKuotaMerchant.count({ where: { userId } }),
    ]);
    return goCount + okCount;
}

export { encrypt, decrypt };
