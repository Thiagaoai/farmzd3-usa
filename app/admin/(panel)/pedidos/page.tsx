import Link from 'next/link';
import { Search } from 'lucide-react';
import { listOrders } from '@/lib/farmz3d/admin-data';
import { isTypeSafeConfigured } from '@/lib/typesafe/client';
import { getOrderTriage } from '@/lib/typesafe/store';
import { OrderStatusSelect, OrderTriageCell } from '../../_components/AdminClient';
import { formatWhen, PageHeader, PaymentBadge, usd } from '../../_components/ui';

const FILTERS = [
  { id: 'open', label: 'Em aberto' },
  { id: 'new', label: 'Novos' },
  { id: 'confirmed', label: 'Confirmados' },
  { id: 'printing', label: 'Imprimindo' },
  { id: 'shipped', label: 'Enviados' },
  { id: 'picked_up', label: 'Retirados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'all', label: 'Todos' },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const params = await searchParams;
  const status = FILTERS.some((filter) => filter.id === params.status) ? params.status! : 'open';
  const q = (params.q ?? '').slice(0, 100);
  const [{ orders, error }, triage] = await Promise.all([listOrders({ status: status === 'all' ? undefined : status, q }), getOrderTriage()]);
  const jevEnabled = isTypeSafeConfigured();

  return (
    <div>
      <PageHeader title="Pedidos" subtitle="Clique no pedido para ver tudo: cliente, imagem, envio, pagamento e conversas." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.id}
            href={`/admin/pedidos?status=${filter.id}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${status === filter.id ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:text-white'}`}
          >
            {filter.label}
          </Link>
        ))}
        <form className="ml-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5" action="/admin/pedidos">
          <input type="hidden" name="status" value={status} />
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Nome, email, telefone, nº do pedido…"
            className="w-64 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </form>
      </div>

      {error && <p className="mb-4 rounded-2xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">Erro ao ler pedidos.</p>}

      {orders.length === 0 ? (
        <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-zinc-500">Nenhum pedido neste filtro.</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Entrega</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3">Jev</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((order) => (
                <tr key={order.order_number} className="align-top hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pedidos/${order.order_number}`} className="font-mono font-bold text-cyan-200 hover:underline">
                      {order.order_number}
                    </Link>
                    <p className="text-xs text-zinc-500">{formatWhen(order.created_at)}</p>
                    {order.image_path && <p className="text-[11px] text-zinc-400">📎 com imagem</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p>{order.customer_name}</p>
                    <p className="text-xs text-zinc-500">{order.customer_email}</p>
                  </td>
                  <td className="max-w-[240px] px-4 py-3">
                    {order.product_name} <span className="text-zinc-500">×{order.quantity}</span>
                    <p className="line-clamp-2 text-xs text-zinc-500">{order.personalization}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-300">
                    {order.fulfillment === 'shipping' ? `Envio · ${order.ship_state ?? ''} ${order.shipping_zip ?? ''}` : 'Retirada'}
                    {order.needed_by && <p className="text-amber-200">Até {order.needed_by}</p>}
                    {order.tracking_number && <p className="text-emerald-300">Rastreio ✓</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold">{usd(order.estimated_total_cents)}</td>
                  <td className="px-4 py-3">
                    <PaymentBadge status={order.payment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <OrderTriageCell orderNumber={order.order_number} triage={triage.get(order.order_number) ?? null} jevEnabled={jevEnabled} />
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusSelect orderNumber={order.order_number} status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
