import { safeEqual } from '@/lib/shared/request-guard';
import { matchBasicAuth } from './logins';

export function isAdminAuthorized({
  authorization,
  token,
}: {
  authorization?: string | null;
  token?: string | null;
}) {
  const dashboardToken = process.env.ADMIN_DASHBOARD_TOKEN;
  const apiToken = process.env.ADMIN_API_TOKEN;

  if (dashboardToken && token && safeEqual(token, dashboardToken)) {
    return true;
  }

  if (apiToken && authorization && /^Bearer\s+/i.test(authorization) && safeEqual(authorization.replace(/^Bearer\s+/i, ''), apiToken)) {
    return true;
  }

  return matchBasicAuth(authorization) !== null;
}
