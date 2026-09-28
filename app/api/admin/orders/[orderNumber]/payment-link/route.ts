import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isFarmz3dAdminRequest } from '@/lib/farmz3d/admin-auth';
import { getOrder, updateOrder } from '@/lib/farmz3d/admin-data';
import { logOrderMessage } from '@/lib/farmz3d/messages';
import { siteUrl } from '@/lib/farmz3d/orders';
import { createCheckoutSession } from '@/lib/farmz3d/stripe';

export const runtime = 'nodejs';

// Creates a Stripe Checkout link for the order total (the price was already set by the server).
export async function POST(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  if (!isFarmz3dAdminRequest(request)) return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });

  const { orderNumber } = await params;
  const order = await getOrder(orderNumber);
  if (!order) return NextResponse.json({ ok: false, message: 'Pedido não encontrado.' }, { status: 404 });
  if (order.payment_status === 'paid') return NextResponse.json({ ok: false, message: 'Este pedido já está pago.' }, { status: 409 });
  if (order.estimated_total_cents <= 0) {
    return NextResponse.json({ ok: false, message: 'Defina o valor do orçamento primeiro (em “Atualizar pedido”).' }, { status: 409 });
  }

  const session = await createCheckoutSession({
    orderNumber,
    productName: order.product_name,
    quantity: order.quantity,
    totalCents: order.estimated_total_cents,
    customerEmail: order.customer_email,
    siteUrl: siteUrl(),
  });
  if (!session.ok) return NextResponse.json({ ok: false, message: session.message }, { status: 502 });

  const result = await updateOrder(orderNumber, { payment_url: session.url, stripe_session_id: session.id, payment_status: 'link_sent' });
  if (!result.ok) return NextResponse.json(result, { status: result.status });

  await logOrderMessage({ orderNumber, channel: 'system', direction: 'internal', body: `Link de pagamento Stripe criado: ${session.url}` });
  revalidatePath(`/admin/pedidos/${orderNumber}`);
  return NextResponse.json({ ok: true, url: session.url });
}
