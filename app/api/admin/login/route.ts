import { NextResponse } from 'next/server';
import { adminLogins, matchLogin } from '@/lib/auth/logins';
import { getClientIp, isBlocked, isRateLimited, isSameOriginRequest } from '@/lib/shared/request-guard';

export const runtime = 'nodejs';

// Only wrong passwords count, so testing a correct login never locks anyone out.
const MAX_FAILURES_PER_HOUR = 20;

// Panel logins from the environment (see lib/auth/logins.ts: up to two people).
// The session cookie holds ADMIN_DASHBOARD_TOKEN; rotating it logs everyone out.
export async function POST(request: Request) {
  const sessionToken = process.env.ADMIN_DASHBOARD_TOKEN;

  if (!adminLogins().length || !sessionToken) {
    return NextResponse.json({ ok: false, message: 'Login não configurado.' }, { status: 500 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Origem inválida.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const providedUser = body?.email?.trim() ?? '';
  const providedPassword = body?.password ?? '';

  if (!providedUser || !providedPassword) {
    return NextResponse.json({ ok: false, message: 'Informe usuário e senha.' }, { status: 400 });
  }

  const ipKey = `admin-login:ip:${getClientIp(request)}`;
  const userKey = `admin-login:user:${providedUser.toLowerCase()}`;
  if (isBlocked(ipKey, MAX_FAILURES_PER_HOUR) || isBlocked(userKey, MAX_FAILURES_PER_HOUR)) {
    return NextResponse.json({ ok: false, message: 'Muitas tentativas erradas. Tente de novo em 1 hora.' }, { status: 429 });
  }

  const matched = matchLogin(providedUser, providedPassword);
  if (!matched) {
    isRateLimited(ipKey, MAX_FAILURES_PER_HOUR);
    isRateLimited(userKey, MAX_FAILURES_PER_HOUR);
    return NextResponse.json({ ok: false, message: 'Usuário ou senha inválidos.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, redirectTo: '/admin', user: matched });
  response.cookies.set('farmz3d_admin_session', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}
