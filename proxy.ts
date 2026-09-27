import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { safeEqual } from '@/lib/shared/request-guard';

function isBasicAuthorized(authorization: string | null) {
  const user = process.env.ADMIN_DASHBOARD_USER;
  const password = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (!user || !password || !authorization?.startsWith('Basic ')) return false;

  let decoded: string;
  try {
    decoded = atob(authorization.replace(/^Basic\s+/i, ''));
  } catch {
    return false;
  }
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return false;
  return safeEqual(decoded.slice(0, separatorIndex), user) && safeEqual(decoded.slice(separatorIndex + 1), password);
}

// First gate for the admin panel page; every admin API route also checks auth itself.
export function proxy(request: NextRequest) {
  const dashboardToken = process.env.ADMIN_DASHBOARD_TOKEN;
  const session = request.cookies.get('farmz3d_admin_session')?.value;

  if ((dashboardToken && session && safeEqual(session, dashboardToken)) || isBasicAuthorized(request.headers.get('authorization'))) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin'],
};
