import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { COLLECTIONS } from '@/lib/farmz3d/catalog';
import { ensureProductsSeeded, getProductRow, listProducts, productImageUrl } from '@/lib/farmz3d/products';
import { ProductForm } from '../../../_components/ProductClient';
import { PageHeader, usd } from '../../../_components/ui';

const dollars = (cents: number | null) => (cents === null ? '' : (cents / 100).toFixed(2));

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ensureProductsSeeded();
  const row = await getProductRow(id);
  if (!row) notFound();
  const { products } = await listProducts({ includeInactive: true });
  const store = products.find((product) => product.id === id);

  return (
    <div>
      <Link href="/admin/produtos" className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Produtos
      </Link>
      <PageHeader title={row.name} subtitle={store ? `Na loja por ${usd(store.priceCents)} ${store.unitLabel}.` : 'Sem preço definido: não aparece na loja.'} />
      <ProductForm
        mode="edit"
        collections={COLLECTIONS}
        imageSrc={productImageUrl(row)}
        hasUpload={Boolean(row.image_path)}
        decisionPrice={store?.decisionPriceCents != null ? usd(store.decisionPriceCents) : null}
        initial={{
          id: row.id,
          collection: row.collection,
          name: row.name,
          description: row.description,
          personalizationHint: row.personalization_hint,
          requiredDetails: row.required_details,
          unitLabel: row.unit_label,
          emoji: row.emoji,
          price: dollars(row.price_cents),
          cost: dollars(row.cost_cents),
          stock: row.stock === null ? '' : String(row.stock),
          lowStockAt: String(row.low_stock_at),
          active: row.active,
          sortOrder: String(row.sort_order),
          imageAlt: row.image_alt ?? '',
        }}
      />
    </div>
  );
}
