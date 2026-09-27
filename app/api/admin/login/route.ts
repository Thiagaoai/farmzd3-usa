import { NextResponse } from 'next/server';
import { getClientIp, isRateLimited, isSameOriginRequest, safeEqual } from '@/lib/shared/request-guard';

export const runtime = 'nodejs';

const MAX_ATTEMPTS_PER_HOUR = 10;

// Single admin login from the environment (ADMIN_DASHBOARD_USER / ADMIN_DASHBOARD_PASSWORD).
// The session cookie holds ADMIN_DASHBOARD_TOKEN; rotating it logs everyone out.
export async function POST(request: Request) {
  const user = process.env.ADMIN_DASHBOARD_USER;
  const password = process.env.ADMIN_DASHBOARD_PASSWORD;
  const sessionToken = process.env.ADMIN_DASHBOARD_TOKEN;

  if (!user || !password || !sessionToken) {
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

  if (
    isRateLimited(`admin-login:ip:${getClientIp(request)}`, MAX_ATTEMPTS_PER_HOUR) ||
    isRateLimited(`admin-login:user:${providedUser.toLowerCase()}`, MAX_ATTEMPTS_PER_HOUR)
  ) {
    return NextResponse.json({ ok: false, message: 'Muitas tentativas. Tente de novo em 1 hora.' }, { status: 429 });
  }

  // Evaluate both comparisons so the response time does not reveal which one failed.
  const userOk = safeEqual(providedUser, user);
  const passwordOk = safeEqual(providedPassword, password);
  if (!userOk || !passwordOk) {
    return NextResponse.json({ ok: false, message: 'Usuário ou senha inválidos.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, redirectTo: '/admin' });
  response.cookies.set('farmz3d_admin_session', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}
