import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { actorName } from '@/lib/farmz3d/admin-actor';
import { isFarmz3dAdminRequest } from '@/lib/farmz3d/admin-auth';
import { getOrder, OrderUpdateSchema, PAYMENT_LABELS, STATUS_LABELS, updateOrder } from '@/lib/farmz3d/admin-data';
import { formatUsd } from '@/lib/farmz3d/catalog';
import { isCustomOrder } from '@/lib/farmz3d/custom';
import { logOrderMessage } from '@/lib/farmz3d/messages';
import { releaseStock, reserveStock } from '@/lib/farmz3d/products';

export const runtime = 'nodejs';

export async function PATCH(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  if (!isFarmz3dAdminRequest(request)) return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });

  const { orderNumber } = await params;
  const current = await getOrder(orderNumber);
  if (!current) return NextResponse.json({ ok: false, message: 'Pedido não encontrado.' }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = OrderUpdateSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  const input = parsed.data;
  const author = actorName(body?.author);

  const patch: Record<string, unknown> = {};
  const changes: string[] = [];
  const now = new Date().toISOString();

  if (input.quotedTotal !== undefined && input.quotedTotal !== current.estimated_total_cents) {
    if (!isCustomOrder(current)) {
      return NextResponse.json({ ok: false, message: 'Só pedidos personalizados têm orçamento.' }, { status: 400 });
    }
    if (current.payment_status === 'paid') {
      return NextResponse.json({ ok: false, message: 'O pedido já foi pago; o valor não pode mudar.' }, { status: 409 });
    }
    patch.estimated_total_cents = input.quotedTotal;
    patch.unit_price_cents = Math.round(input.quotedTotal / current.quantity);
    // A new amount makes an old payment link wrong.
    if (current.payment_url) {
      patch.payment_url = null;
      patch.stripe_session_id = null;
      if (current.payment_status === 'link_sent') patch.payment_status = 'unpaid';
    }
    changes.push(`Orçamento: ${formatUsd(input.quotedTotal)}${current.payment_url ? ' (link de pagamento antigo descartado)' : ''}`);
  }

  if (input.status && input.status !== current.status) {
    // Cancelling returns the units to stock; reopening takes them again.
    if (input.status === 'cancelled' && !isCustomOrder(current)) await releaseStock(current.product_id, current.quantity);
    if (current.status === 'cancelled' && !isCustomOrder(current)) {
      const stock = await reserveStock(current.product_id, current.quantity);
      if (!stock.ok) return NextResponse.json({ ok: false, message: `Sem estoque para reabrir: ${stock.message}` }, { status: 409 });
    }
    patch.status = input.status;
    if (input.status === 'shipped' && !current.shipped_at) patch.shipped_at = now;
    changes.push(`Status: ${STATUS_LABELS[current.status]} → ${STATUS_LABELS[input.status]}`);
  }
  if (input.paymentStatus && input.paymentStatus !== current.payment_status) {
    patch.payment_status = input.paymentStatus;
    if (input.paymentStatus === 'paid' && !current.paid_at) patch.paid_at = now;
    changes.push(`Pagamento: ${PAYMENT_LABELS[current.payment_status]} → ${PAYMENT_LABELS[input.paymentStatus]}`);
  }

  const fields: [keyof typeof input, string, string][] = [
    ['trackingCarrier', 'tracking_carrier', 'Transportadora'],
    ['trackingNumber', 'tracking_number', 'Rastreio'],
    ['shipLine1', 'ship_line1', 'Endereço'],
    ['shipLine2', 'ship_line2', 'Complemento'],
    ['shipCity', 'ship_city', 'Cidade'],
    ['shipState', 'ship_state', 'Estado'],
    ['shippingZip', 'shipping_zip', 'ZIP'],
    ['internalNotes', 'internal_notes', 'Notas internas'],
  ];
  for (const [key, column, label] of fields) {
    const value = input[key];
    if (value === undefined) continue;
    const next = key === 'shipState' && typeof value === 'string' ? value.toUpperCase() : value;
    if (next !== current[column as keyof typeof current]) {
      patch[column] = next;
      if (key !== 'internalNotes') changes.push(`${label}: ${next ?? '—'}`);
    }
  }

  if (!Object.keys(patch).length) return NextResponse.json({ ok: true, order: current });

  const result = await updateOrder(orderNumber, patch);
  if (!result.ok) return NextResponse.json(result, { status: result.status });

  if (changes.length) {
    await logOrderMessage({ orderNumber, channel: 'system', direction: 'internal', body: changes.join('\n'), author });
  }
  revalidatePath('/admin', 'layout');
  return NextResponse.json({ ok: true, order: result.order });
}
