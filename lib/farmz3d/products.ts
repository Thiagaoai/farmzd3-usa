import { z } from 'zod';
import { getResolvedNumbers } from '@/lib/decisions/store';
import { getSupabaseAdmin } from '@/lib/supabase';
import { COLLECTION_IDS, PRODUCTS, type PricedProduct } from './catalog';
import { CUSTOM_PRODUCT_ID } from './custom';
import { PRODUCT_MEDIA } from './media';

// Products live in farmz3d_products and are edited in /admin/produtos.
// Until the table has rows (or without a database), the built-in catalog is used.

export const PRODUCT_IMAGE_BUCKET = 'farmz3d-product-images';

export type ProductRow = {
  id: string;
  collection: (typeof COLLECTION_IDS)[number];
  name: string;
  description: string;
  personalization_hint: string;
  required_details: string;
  unit_label: string;
  emoji: string;
  price_cents: number | null;
  cost_cents: number | null;
  stock: number | null;
  low_stock_at: number;
  active: boolean;
  sort_order: number;
  image_path: string | null;
  image_alt: string | null;
  created_at?: string;
  updated_at?: string;
};

export type StoreProduct = PricedProduct & {
  // 'manual' = price typed in the panel; 'decision' = approved/recommended price decision.
  priceSource: 'manual' | 'decision';
  decisionPriceCents: number | null;
  costCents: number | null;
  stock: number | null;
  lowStockAt: number;
  active: boolean;
  sortOrder: number;
  imagePath: string | null;
  imageSrc: string | null;
  imageAlt: string;
  soldOut: boolean;
};

export const priceDecisionId = (productId: string) => `price:${productId}`;

export function catalogRows(): ProductRow[] {
  return PRODUCTS.map((product, index) => ({
    id: product.id,
    collection: product.collection,
    name: product.name,
    description: product.description,
    personalization_hint: product.personalizationHint,
    required_details: product.requiredDetails,
    unit_label: product.unitLabel,
    emoji: product.emoji,
    price_cents: null,
    cost_cents: null,
    stock: null,
    low_stock_at: 3,
    active: true,
    sort_order: (index + 1) * 10,
    image_path: null,
    image_alt: PRODUCT_MEDIA[product.id]?.alt ?? null,
  }));
}

export function productImageUrl(row: Pick<ProductRow, 'id' | 'image_path'>) {
  if (row.image_path) return `/product-images/${row.image_path}`;
  return PRODUCT_MEDIA[row.id]?.src ?? null;
}

function toStoreProduct(row: ProductRow, numbers: Map<string, number>): StoreProduct | null {
  const decisionPriceCents = numbers.get(priceDecisionId(row.id)) ?? null;
  const priceCents = row.price_cents ?? decisionPriceCents;
  if (priceCents === null) return null; // no price anywhere: not sellable

  return {
    id: row.id,
    collection: row.collection,
    name: row.name,
    description: row.description,
    personalizationHint: row.personalization_hint,
    requiredDetails: row.required_details,
    unitLabel: row.unit_label,
    emoji: row.emoji,
    priceCents,
    priceSource: row.price_cents === null ? 'decision' : 'manual',
    decisionPriceCents,
    costCents: row.cost_cents,
    stock: row.stock,
    lowStockAt: row.low_stock_at,
    active: row.active,
    sortOrder: row.sort_order,
    imagePath: row.image_path,
    imageSrc: productImageUrl(row),
    imageAlt: row.image_alt || row.name,
    soldOut: row.stock !== null && row.stock <= 0,
  };
}

async function readRows(): Promise<{ rows: ProductRow[]; fromDatabase: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { rows: catalogRows(), fromDatabase: false };

  const { data, error } = await supabase.from('farmz3d_products').select('*').order('sort_order', { ascending: true });
  if (error) {
    console.error('[products] read failed, using built-in catalog', error.message);
    return { rows: catalogRows(), fromDatabase: false };
  }
  const rows = (data ?? []) as ProductRow[];
  return rows.length ? { rows, fromDatabase: true } : { rows: catalogRows(), fromDatabase: false };
}

export async function listProducts({ includeInactive = false } = {}) {
  const [{ rows, fromDatabase }, numbers] = await Promise.all([readRows(), getResolvedNumbers()]);
  const products = rows
    .map((row) => toStoreProduct(row, numbers))
    .filter((product): product is StoreProduct => product !== null)
    .filter((product) => includeInactive || product.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return { products, fromDatabase };
}

export async function getProductRow(id: string): Promise<ProductRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return catalogRows().find((row) => row.id === id) ?? null;
  const { data } = await supabase.from('farmz3d_products').select('*').eq('id', id).maybeSingle();
  return (data as ProductRow | null) ?? null;
}

// Copies the built-in catalog into the table the first time the panel is used.
export async function ensureProductsSeeded() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, message: 'Supabase não configurado.' };

  const { count, error } = await supabase.from('farmz3d_products').select('id', { count: 'exact', head: true });
  if (error) return { ok: false as const, message: error.message };
  if ((count ?? 0) > 0) return { ok: true as const, seeded: 0 };

  const { error: insertError } = await supabase
    .from('farmz3d_products')
    .upsert(catalogRows(), { onConflict: 'id', ignoreDuplicates: true });
  if (insertError) return { ok: false as const, message: insertError.message };
  return { ok: true as const, seeded: PRODUCTS.length };
}

// Reserves stock for an order with a compare-and-set update, so two orders
// cannot both take the last unit. Made-to-order products (stock null) always pass.
export async function reserveStock(productId: string, quantity: number): Promise<{ ok: true; reserved: boolean } | { ok: false; message: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: true, reserved: false };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data } = await supabase.from('farmz3d_products').select('stock').eq('id', productId).maybeSingle();
    const stock = (data as { stock: number | null } | null)?.stock ?? null;
    if (stock === null) return { ok: true, reserved: false };
    if (stock < quantity) {
      return { ok: false, message: stock <= 0 ? 'Sorry, this item is sold out.' : `Sorry, only ${stock} left in stock.` };
    }

    const { data: updated } = await supabase
      .from('farmz3d_products')
      .update({ stock: stock - quantity, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('stock', stock)
      .select('id');
    if (updated?.length) return { ok: true, reserved: true };
  }
  return { ok: false, message: 'This item is in high demand. Please try again.' };
}

export async function releaseStock(productId: string, quantity: number) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data } = await supabase.from('farmz3d_products').select('stock').eq('id', productId).maybeSingle();
    const stock = (data as { stock: number | null } | null)?.stock ?? null;
    if (stock === null) return;
    const { data: updated } = await supabase
      .from('farmz3d_products')
      .update({ stock: stock + quantity, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('stock', stock)
      .select('id');
    if (updated?.length) return;
  }
}

const optionalCents = z
  .union([z.number(), z.string(), z.null()])
  .transform((value, ctx) => {
    if (value === null || value === '') return null;
    const dollars = typeof value === 'number' ? value : Number(String(value).replace(/[$,\s]/g, ''));
    if (!Number.isFinite(dollars) || dollars < 0 || dollars > 100000) {
      ctx.addIssue({ code: 'custom', message: 'Valor inválido.' });
      return z.NEVER;
    }
    return Math.round(dollars * 100);
  });

const optionalCount = z
  .union([z.number(), z.string(), z.null()])
  .transform((value, ctx) => {
    if (value === null || value === '') return null;
    const count = Number(value);
    if (!Number.isInteger(count) || count < 0 || count > 1000000) {
      ctx.addIssue({ code: 'custom', message: 'Use um número inteiro.' });
      return z.NEVER;
    }
    return count;
  });

// Admin form input. Money comes in dollars ("19.90") and is stored in cents.
export const ProductInputSchema = z.object({
  id: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,59}$/, 'Código: letras minúsculas, números e hífen (ex.: caneca-nome).')
    .refine((id) => id !== CUSTOM_PRODUCT_ID, 'Esse código é reservado para pedidos personalizados.'),
  collection: z.enum(COLLECTION_IDS),
  name: z.string().trim().min(2, 'Nome muito curto.').max(80),
  description: z.string().trim().max(600),
  personalizationHint: z.string().trim().max(200),
  requiredDetails: z.string().trim().max(300),
  unitLabel: z.string().trim().min(1).max(40),
  emoji: z.string().trim().max(8),
  price: optionalCents,
  cost: optionalCents,
  stock: optionalCount,
  lowStockAt: optionalCount.transform((value) => value ?? 3),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(100000),
  imageAlt: z.string().trim().max(200),
});

export type ProductInput = z.infer<typeof ProductInputSchema>;

export function productInputToRow(input: ProductInput): Omit<ProductRow, 'image_path'> {
  return {
    id: input.id,
    collection: input.collection,
    name: input.name,
    description: input.description,
    personalization_hint: input.personalizationHint,
    required_details: input.requiredDetails,
    unit_label: input.unitLabel,
    emoji: input.emoji || '🎁',
    price_cents: input.price,
    cost_cents: input.cost,
    stock: input.stock,
    low_stock_at: input.lowStockAt,
    active: input.active,
    sort_order: input.sortOrder,
    image_alt: input.imageAlt || null,
  };
}
