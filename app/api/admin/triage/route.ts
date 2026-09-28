import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isFarmz3dAdminRequest } from '@/lib/farmz3d/admin-auth';
import { findProduct } from '@/lib/farmz3d/pricing';
import { isTypeSafeConfigured } from '@/lib/typesafe/client';
import { triageOrder } from '@/lib/typesafe/order-triage';
import { saveOrderTriage } from '@/lib/typesafe/store';

export const runtime = 'nodejs';

const BodySchema = z.object({ orderNumber: z.string().regex(/^FZ-\d{6}-[A-Z2-9]{4}$/) });

// (Re)run the Jev production-readiness check for one order.
export async function POST(request: Request) {
  if (!isFarmz3dAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });
  }
  if (!isTypeSafeConfigured()) {
    return NextResponse.json({ ok: false, message: 'Configure TYPESAFE_API_KEY para usar o Jev.' }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Dados inválidos.' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false, message: 'Supabase não configurado.' }, { status: 503 });

  const { data, error } = await supabase
    .from('farmz3d_orders')
    .select('order_number, product_id, personalization, notes')
    .eq('order_number', parsed.data.orderNumber)
    .limit(1);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  const order = data?.[0];
  if (!order) return NextResponse.json({ ok: false, message: 'Pedido não encontrado.' }, { status: 404 });

  const product = await findProduct(order.product_id);
  if (!product) return NextResponse.json({ ok: false, message: 'Produto não existe mais no catálogo.' }, { status: 422 });

  const result = await triageOrder(product, order);
  if (!result.ok) return NextResponse.json({ ok: false, message: `Jev indisponível: ${result.error}` }, { status: 502 });

  await saveOrderTriage(order.order_number, result.triage);
  revalidatePath('/admin');
  return NextResponse.json({ ok: true, triage: result.triage });
}
