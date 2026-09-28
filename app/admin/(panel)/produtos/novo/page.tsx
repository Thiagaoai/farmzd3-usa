import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { COLLECTIONS } from '@/lib/farmz3d/catalog';
import { ProductForm } from '../../../_components/ProductClient';
import { PageHeader } from '../../../_components/ui';

export default function NewProductPage() {
  return (
    <div>
      <Link href="/admin/produtos" className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Produtos
      </Link>
      <PageHeader title="Novo produto" subtitle="Aparece na loja assim que você salvar (se estiver marcado “à venda”)." />
      <ProductForm
        mode="create"
        collections={COLLECTIONS}
        imageSrc={null}
        decisionPrice={null}
        initial={{
          id: '',
          collection: 'year-round',
          name: '',
          description: '',
          personalizationHint: 'Name + color',
          requiredDetails: 'The name to print.',
          unitLabel: 'each',
          emoji: '🎁',
          price: '',
          cost: '',
          stock: '',
          lowStockAt: '3',
          active: true,
          sortOrder: '1000',
          imageAlt: '',
        }}
      />
    </div>
  );
}
