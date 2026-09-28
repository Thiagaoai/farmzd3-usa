import { cookies, headers } from 'next/headers';
import { isAdminAuthorized } from './admin-auth';

// Server components: true when the request carries a valid admin session or Basic auth.
export async function isAdminSession() {
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  return isAdminAuthorized({
    authorization: requestHeaders.get('authorization'),
    token: cookieStore.get('farmz3d_admin_session')?.value,
  });
}
