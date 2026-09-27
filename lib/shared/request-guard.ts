const WINDOW_MS = 60 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

// The reverse proxy (Traefik on Dokploy) appends the real client address as the LAST
// X-Forwarded-For entry; earlier entries come from the client and can be forged.
export function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown-ip'
  );
}

// Constant-time string comparison (runtime-agnostic, no node:crypto needed).
export function safeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let diff = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return diff === 0;
}

// Blocks cross-site form/fetch posts to cookie-authenticated routes (CSRF).
// Browsers always send Origin on POST/PATCH/DELETE; server-to-server calls without it pass.
export function isSameOriginRequest(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}

// In-memory, per-instance limiter .
export function isRateLimited(key: string, max: number) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > max;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Reuse the verified sender address (from NEWSLETTER_FROM) under another display name.
export function senderWithName(displayName: string, configuredFrom: string) {
  const address = configuredFrom.match(/<([^>]+)>/)?.[1] ?? configuredFrom.trim();
  return `${displayName} <${address}>`;
}
