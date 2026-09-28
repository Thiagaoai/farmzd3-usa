import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isFarmz3dAdminRequest } from '@/lib/farmz3d/admin-auth';
import { getOrder, OrderStatusUpdateSchema, STATUS_LABELS, updateOrderStatus } from '@/lib/farmz3d/admin-data';
import { logOrderMessage } from '@/lib/farmz3d/messages';
import { CUSTOM_PRODUCT_ID } from '@/lib/farmz3d/custom';
import { releaseStock } from '@/lib/farmz3d/products';

export const runtime = 'nodejs';

// Quick status change from the orders list.
export async function PATCH(request: Request) {
  if (!isFarmz3dAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });
  }

  const parsed = OrderStatusUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Dados inválidos.' }, { status: 400 });

  const current = await getOrder(parsed.data.orderNumber);
  if (!current) return NextResponse.json({ ok: false, message: 'Pedido não encontrado.' }, { status: 404 });
  if (current.status === 'cancelled' && parsed.data.status !== 'cancelled') {
    return NextResponse.json({ ok: false, message: 'Para reabrir um pedido cancelado, use a página do pedido.' }, { status: 409 });
  }

  const result = await updateOrderStatus(parsed.data.orderNumber, parsed.data.status);
  if (!result.ok) return NextResponse.json(result, { status: result.status });

  if (current.status !== parsed.data.status) {
    if (parsed.data.status === 'cancelled' && current.product_id !== CUSTOM_PRODUCT_ID) await releaseStock(current.product_id, current.quantity);
    await logOrderMessage({
      orderNumber: current.order_number,
      channel: 'system',
      direction: 'internal',
      body: `Status: ${STATUS_LABELS[current.status]} → ${STATUS_LABELS[parsed.data.status]}`,
    });
  }

  revalidatePath('/admin', 'layout');
  return NextResponse.json(result);
}
