import { NextRequest, NextResponse } from 'next/server';
import { sessionCookie, validCredentials } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();
  if (!validCredentials(String(username || ''), String(password || ''))) return NextResponse.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 });
  const cookie = sessionCookie(); const response = NextResponse.json({ ok: true }); response.cookies.set(cookie.name, cookie.value, cookie.options); return response;
}
