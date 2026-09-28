import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { matchBasicAuth } from '@/lib/auth/logins';
import { safeEqual } from '@/lib/shared/request-guard';

// First gate for the admin panel page; every admin API route also checks auth itself.
export function proxy(request: NextRequest) {
  const dashboardToken = process.env.ADMIN_DASHBOARD_TOKEN;
  const session = request.cookies.get('farmz3d_admin_session')?.value;

  if ((dashboardToken && session && safeEqual(session, dashboardToken)) || matchBasicAuth(request.headers.get('authorization')) !== null) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // The panel pages; /admin/login stays public.
  matcher: ['/admin', '/admin/((?!login).*)'],
};
