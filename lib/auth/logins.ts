import { safeEqual } from '../shared/request-guard.ts';

// Panel logins from the environment. Two people can have their own:
//   ADMIN_DASHBOARD_USER   / ADMIN_DASHBOARD_PASSWORD     (e.g. thiago)
//   ADMIN_DASHBOARD_USER_2 / ADMIN_DASHBOARD_PASSWORD_2   (e.g. bruna)
export function adminLogins() {
  return [
    [process.env.ADMIN_DASHBOARD_USER, process.env.ADMIN_DASHBOARD_PASSWORD],
    [process.env.ADMIN_DASHBOARD_USER_2, process.env.ADMIN_DASHBOARD_PASSWORD_2],
  ]
    .filter((pair): pair is [string, string] => Boolean(pair[0]?.trim() && pair[1]))
    .map(([user, password]) => ({ user: user.trim(), password }));
}

// Returns the matching user name, or null. Usernames ignore case; every login is
// compared so the response time does not reveal which part was wrong.
export function matchLogin(user: string, password: string): string | null {
  let matched: string | null = null;
  for (const login of adminLogins()) {
    const userOk = safeEqual(user.trim().toLowerCase(), login.user.toLowerCase());
    const passwordOk = safeEqual(password, login.password);
    if (userOk && passwordOk && !matched) matched = login.user;
  }
  return matched;
}

export function matchBasicAuth(authorization: string | null | undefined) {
  if (!authorization?.startsWith('Basic ')) return null;
  let decoded: string;
  try {
    decoded = atob(authorization.replace(/^Basic\s+/i, ''));
  } catch {
    return null;
  }
  const separator = decoded.indexOf(':');
  if (separator === -1) return null;
  return matchLogin(decoded.slice(0, separator), decoded.slice(separator + 1));
}
