import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getDecision } from '@/lib/decisions/registry';
import { isFarmz3dAdminRequest } from '@/lib/farmz3d/admin-auth';
import { MAX_ORDER_IMAGE_BYTES, readOrderImageUpload } from '@/lib/farmz3d/order-images';
import { ensureProductsSeeded, getProductRow, PRODUCT_IMAGE_BUCKET, priceDecisionId, productInputToRow, ProductInputSchema } from '@/lib/farmz3d/products';
import { deleteObject, newObjectKey, putObject } from '@/lib/farmz3d/storage';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// Create or update a product (multipart: fields + optional photo).
export async function POST(request: Request) {
  if (!isFarmz3dAdminRequest(request)) return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_ORDER_IMAGE_BYTES + 256 * 1024) {
    return NextResponse.json({ ok: false, message: 'A foto deve ter no máximo 8 MB.' }, { status: 413 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false, message: 'Supabase não configurado.' }, { status: 503 });
  const seeded = await ensureProductsSeeded();
  if (!seeded.ok) return NextResponse.json({ ok: false, message: 'Não foi possível preparar a tabela de produtos.' }, { status: 500 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: 'Formulário inválido.' }, { status: 400 });
  }

  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === 'string' ? value : '';
  };
  const parsed = ProductInputSchema.safeParse({
    id: text('id'),
    collection: text('collection'),
    name: text('name'),
    description: text('description'),
    personalizationHint: text('personalizationHint'),
    requiredDetails: text('requiredDetails'),
    unitLabel: text('unitLabel'),
    emoji: text('emoji'),
    price: text('price'),
    cost: text('cost'),
    stock: text('stock'),
    lowStockAt: text('lowStockAt'),
    active: text('active') === 'true',
    sortOrder: text('sortOrder') || '0',
    imageAlt: text('imageAlt'),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ ok: false, message: issue?.message ?? 'Dados inválidos.', field: issue?.path.join('.') }, { status: 400 });
  }

  const isNew = text('mode') === 'create';
  const existing = await getProductRow(parsed.data.id);
  if (isNew && existing) return NextResponse.json({ ok: false, message: 'Já existe um produto com esse código.', field: 'id' }, { status: 409 });
  if (!isNew && !existing) return NextResponse.json({ ok: false, message: 'Produto não encontrado.' }, { status: 404 });

  // Every product needs a price: typed here, or a price decision in the registry.
  if (parsed.data.price === null && !getDecision(priceDecisionId(parsed.data.id))) {
    return NextResponse.json({ ok: false, message: 'Informe o preço de venda.', field: 'price' }, { status: 400 });
  }

  const upload = await readOrderImageUpload(form.get('image'), false);
  if (!upload.ok) return NextResponse.json({ ok: false, message: upload.message, field: 'image' }, { status: 400 });

  let imagePath = existing?.image_path ?? null;
  const oldImage = imagePath;
  if (upload.image) {
    const key = newObjectKey(upload.image.ext);
    const stored = await putObject(PRODUCT_IMAGE_BUCKET, key, upload.image.bytes, upload.image.contentType);
    if (stored.error) return NextResponse.json({ ok: false, message: 'Não foi possível salvar a foto.' }, { status: 500 });
    imagePath = key;
  } else if (text('removeImage') === 'true') {
    imagePath = null;
  }

  const row = { ...productInputToRow(parsed.data), image_path: imagePath, updated_at: new Date().toISOString() };
  const { error } = isNew
    ? await supabase.from('farmz3d_products').insert(row)
    : await supabase.from('farmz3d_products').update(row).eq('id', parsed.data.id);
  if (error) {
    console.error('[products] save failed', error.message);
    return NextResponse.json({ ok: false, message: 'Não foi possível salvar o produto.' }, { status: 500 });
  }
  if (oldImage && oldImage !== imagePath) await deleteObject(PRODUCT_IMAGE_BUCKET, oldImage);

  revalidatePath('/');
  revalidatePath('/admin', 'layout');
  return NextResponse.json({ ok: true, id: parsed.data.id });
}
