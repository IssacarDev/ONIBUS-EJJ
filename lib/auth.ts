import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE = 'ejj_session';
const secret = () => process.env.SESSION_SECRET || 'ejj-local-session-secret-change-before-publication';
const sign = (value: string) => createHmac('sha256', secret()).update(value).digest('hex');

export function validCredentials(username: string, password: string) {
  return username === (process.env.ADMIN_USER || 'admin') && password === (process.env.ADMIN_PASSWORD || 'admin');
}

export function sessionValue() { const value = `admin.${Date.now()}`; return `${value}.${sign(value)}`; }

export async function isAuthenticated() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  const [user, timestamp, signature] = token.split('.');
  if (user !== 'admin' || !timestamp || !signature || Date.now() - Number(timestamp) > 1000 * 60 * 60 * 12) return false;
  const expected = sign(`${user}.${timestamp}`);
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function requireAuth() { if (!(await isAuthenticated())) throw new Error('UNAUTHORIZED'); }
export const sessionCookie = () => ({ name: COOKIE, value: sessionValue(), options: { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 12, path: '/' } });
export const clearSessionCookie = () => ({ name: COOKIE, value: '', options: { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: 0, path: '/' } });
