import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getOrder, ORDER_NUMBER, updateOrder } from '@/lib/farmz3d/admin-data';
import { formatUsd } from '@/lib/farmz3d/catalog';
import { logOrderMessage } from '@/lib/farmz3d/messages';
import { siteUrl } from '@/lib/farmz3d/orders';
import { verifyStripeSignature } from '@/lib/farmz3d/stripe';

export const runtime = 'nodejs';

type CheckoutSession = { id: string; payment_status?: string; amount_total?: number; metadata?: { order_number?: string } };

// Stripe → "checkout.session.completed": marks the order paid and tells the shop.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, message: 'Webhook not configured.' }, { status: 503 });

  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ ok: false, message: 'Invalid signature.' }, { status: 400 });
  }

  const event = JSON.parse(payload) as { type: string; data: { object: CheckoutSession } };
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const session = event.data.object;
  const orderNumber = session.metadata?.order_number ?? '';
  if (!ORDER_NUMBER.test(orderNumber) || session.payment_status !== 'paid') return NextResponse.json({ ok: true, ignored: 'not paid' });

  const order = await getOrder(orderNumber);
  if (!order || order.payment_status === 'paid') return NextResponse.json({ ok: true });

  await updateOrder(orderNumber, {
    payment_status: 'paid',
    paid_at: new Date().toISOString(),
    stripe_session_id: session.id,
    status: order.status === 'new' ? 'confirmed' : order.status,
  });
  const amount = typeof session.amount_total === 'number' ? formatUsd(session.amount_total) : '';
  await logOrderMessage({ orderNumber, channel: 'system', direction: 'internal', body: `Pagamento recebido pelo Stripe ${amount}.` });

  const apiKey = process.env.RESEND_API_KEY;
  const shop = process.env.FARMZ3D_ORDERS_EMAIL;
  if (apiKey && shop) {
    await new Resend(apiKey).emails.send({
      from: process.env.FARMZ3D_FROM_EMAIL || 'Farmz3D <onboarding@resend.dev>',
      to: shop,
      subject: `Paid: Farmz3D order ${orderNumber} ${amount}`,
      text: `Order ${orderNumber} (${order.product_name} x${order.quantity}) was paid ${amount}.\n\nOpen: ${siteUrl()}/admin/pedidos/${orderNumber}`,
    });
  }

  revalidatePath('/admin', 'layout');
  return NextResponse.json({ ok: true });
}
