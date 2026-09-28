import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isFarmz3dAdminRequest } from '@/lib/farmz3d/admin-auth';
import { ensureProductsSeeded, getProductRow, PRODUCT_IMAGE_BUCKET } from '@/lib/farmz3d/products';
import { deleteObject } from '@/lib/farmz3d/storage';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// Quick edits from the product list: stock, active, or a stock adjustment.
const QuickSchema = z.object({
  active: z.boolean().optional(),
  stock: z.number().int().min(0).max(1000000).nullable().optional(),
  adjust: z.number().int().min(-100000).max(100000).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isFarmz3dAdminRequest(request)) return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false, message: 'Supabase não configurado.' }, { status: 503 });
  await ensureProductsSeeded();

  const { id } = await params;
  const product = await getProductRow(id);
  if (!product) return NextResponse.json({ ok: false, message: 'Produto não encontrado.' }, { status: 404 });

  const parsed = QuickSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Dados inválidos.' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.active !== undefined) patch.active = parsed.data.active;
  if (parsed.data.stock !== undefined) patch.stock = parsed.data.stock;
  if (parsed.data.adjust !== undefined) {
    if (product.stock === null) return NextResponse.json({ ok: false, message: 'Produto sob encomenda: defina um estoque primeiro.' }, { status: 409 });
    patch.stock = Math.max(0, product.stock + parsed.data.adjust);
  }

  const { data, error } = await supabase.from('farmz3d_products').update(patch).eq('id', id).select('*');
  if (error || !data?.length) return NextResponse.json({ ok: false, message: 'Não foi possível salvar.' }, { status: 500 });

  revalidatePath('/');
  revalidatePath('/admin', 'layout');
  return NextResponse.json({ ok: true, product: data[0] });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isFarmz3dAdminRequest(request)) return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false, message: 'Supabase não configurado.' }, { status: 503 });
  await ensureProductsSeeded();

  const { id } = await params;
  const product = await getProductRow(id);
  if (!product) return NextResponse.json({ ok: false, message: 'Produto não encontrado.' }, { status: 404 });

  // Past orders keep the product name and price, so deleting is safe.
  const { error } = await supabase.from('farmz3d_products').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, message: 'Não foi possível excluir.' }, { status: 500 });
  if (product.image_path) await deleteObject(PRODUCT_IMAGE_BUCKET, product.image_path);

  revalidatePath('/');
  revalidatePath('/admin', 'layout');
  return NextResponse.json({ ok: true });
}
