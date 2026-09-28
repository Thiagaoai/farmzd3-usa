import Link from 'next/link';
import { Plus } from 'lucide-react';
import { COLLECTIONS } from '@/lib/farmz3d/catalog';
import { ensureProductsSeeded, listProducts } from '@/lib/farmz3d/products';
import { StockControl } from '../../_components/ProductClient';
import { PageHeader, usd } from '../../_components/ui';

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  // First visit copies the built-in catalog into the database so it can be edited.
  await ensureProductsSeeded();
  const { products, fromDatabase } = await listProducts({ includeInactive: true });
  const active = products.filter((product) => product.active).length;
  const tracked = products.filter((product) => product.stock !== null);
  const units = tracked.reduce((sum, product) => sum + (product.stock ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Produtos e estoque"
        subtitle={`${active} à venda de ${products.length}. ${tracked.length} com estoque controlado (${units} unidades). Os demais são sob encomenda.`}
        action={
          <Link href="/admin/produtos/novo" className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-black">
            <Plus className="h-4 w-4" /> Novo produto
          </Link>
        }
      />
      {saved && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100">Produto salvo. A loja já mostra a versão nova.</p>}
      {!fromDatabase && (
        <p className="mb-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
          Mostrando o catálogo padrão (banco indisponível). Edições precisam do Supabase configurado.
        </p>
      )}

      {COLLECTIONS.map((collection) => {
        const items = products.filter((product) => product.collection === collection.id);
        if (!items.length) return null;
        return (
          <section key={collection.id} className="mb-8">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-zinc-500">
              {collection.name} <span className="text-zinc-700">· {items.length}</span>
            </h2>
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <ul className="divide-y divide-white/5">
                {items.map((product) => (
                  <li key={product.id} className={`flex flex-wrap items-center gap-4 p-3 ${product.active ? '' : 'opacity-50'}`}>
                    <Link href={`/admin/produtos/${product.id}`} className="flex min-w-[260px] flex-1 items-center gap-3">
                      <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-900">
                        {product.imageSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                          <img src={product.imageSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="grid h-full place-items-center text-2xl">{product.emoji}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold hover:underline">{product.name}</p>
                        <p className="text-xs text-zinc-500">
                          {product.unitLabel} · {product.imagePath ? 'foto real' : 'prévia IA'}
                        </p>
                      </div>
                    </Link>
                    <div className="w-32 text-right">
                      <p className="font-mono font-bold">{usd(product.priceCents)}</p>
                      <p className="text-[11px] text-zinc-500">
                        {product.priceSource === 'manual' ? 'preço manual' : 'pela decisão'}
                        {product.costCents !== null && ` · margem ${Math.round(((product.priceCents - product.costCents) / product.priceCents) * 100)}%`}
                      </p>
                    </div>
                    <div className="w-[340px]">
                      <StockControl id={product.id} stock={product.stock} lowStockAt={product.lowStockAt} active={product.active} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
}
