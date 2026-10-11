/**
 * Minimal, dependency-free admin session handling.
 *
 * The login cookie is an HMAC-signed expiry timestamp. It is stateless, so no
 * server-side session store is required. All helpers rely on the Web Crypto
 * API (available in both the Node.js and Edge runtimes).
 */

export const ADMIN_COOKIE = 'ls_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function requireSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not set.');
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(requireSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return toBase64Url(new Uint8Array(signature));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createAdminToken(): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return `${expiry}.${await hmac(String(expiry))}`;
}

export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [expiryStr, signature] = token.split('.');
  if (!expiryStr || !signature) return false;
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || expiry * 1000 < Date.now()) return false;
  return safeEqual(signature, await hmac(expiryStr));
}

export async function verifyAdminPassword(input: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !input) return false;
  // Compare fixed-length HMACs so neither value's length leaks via timing.
  return safeEqual(await hmac(`pw:${input}`), await hmac(`pw:${expected}`));
}

export const ADMIN_COOKIE_MAX_AGE = SESSION_TTL_SECONDS;
