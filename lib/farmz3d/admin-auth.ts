import { isAdminAuthorized } from '@/lib/auth/admin-auth';
import { isSameOriginRequest } from '@/lib/shared/request-guard';

const SESSION_COOKIE = 'farmz3d_admin_session';

function readCookie(cookieHeader: string | null, name: string) {
  return (cookieHeader ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

// Admin credentials: login cookie, Bearer ADMIN_API_TOKEN or Basic auth,
// with no development bypass.
// Cross-site POST/PATCH are rejected (CSRF), since browsers attach the cookie and Basic auth automatically.
export function isFarmz3dAdminRequest(request: Request) {
  if (!isSameOriginRequest(request)) return false;
  return isAdminAuthorized({
    authorization: request.headers.get('authorization'),
    token: readCookie(request.headers.get('cookie'), SESSION_COOKIE),
  });
}
