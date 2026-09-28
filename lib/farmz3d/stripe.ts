import { createHmac, timingSafeEqual } from 'node:crypto';

// Stripe Checkout through the REST API (no SDK). Active only when STRIPE_SECRET_KEY is set.

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function createCheckoutSession(input: {
  orderNumber: string;
  productName: string;
  quantity: number;
  totalCents: number;
  customerEmail: string;
  siteUrl: string;
}): Promise<{ ok: true; id: string; url: string } | { ok: false; message: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, message: 'Stripe não configurado (STRIPE_SECRET_KEY).' };

  const form = new URLSearchParams({
    mode: 'payment',
    customer_email: input.customerEmail,
    client_reference_id: input.orderNumber,
    'metadata[order_number]': input.orderNumber,
    'payment_intent_data[metadata][order_number]': input.orderNumber,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(input.totalCents),
    'line_items[0][price_data][product_data][name]': `Farmz3D order ${input.orderNumber}`,
    'line_items[0][price_data][product_data][description]': `${input.productName} x${input.quantity} (shipping included)`.slice(0, 300),
    success_url: `${input.siteUrl}/thank-you?order=${encodeURIComponent(input.orderNumber)}`,
    cancel_url: `${input.siteUrl}/`,
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const data = (await response.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !data.id || !data.url) return { ok: false, message: data.error?.message ?? `Stripe HTTP ${response.status}` };
  return { ok: true, id: data.id, url: data.url };
}

// Verifies the Stripe-Signature header (t=timestamp,v1=hmac) against the raw body.
export function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSeconds = 300, now = Date.now()) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const [k, ...v] = part.split('=');
      return [k.trim(), v.join('=')];
    }),
  ) as Record<string, string>;
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || Math.abs(now / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  const signatures = header
    .split(',')
    .filter((part) => part.trim().startsWith('v1='))
    .map((part) => part.trim().slice(3));
  return signatures.some((signature) => {
    const a = Buffer.from(signature, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
