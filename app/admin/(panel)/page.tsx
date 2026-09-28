import Link from 'next/link';
import { AlertTriangle, Boxes, CircleDollarSign, Hourglass, Mail, Package, Truck } from 'lucide-react';
import { getDashboardMetrics } from '@/lib/farmz3d/admin-data';
import { listRecentMessages } from '@/lib/farmz3d/messages';
import { listProducts } from '@/lib/farmz3d/products';
import { Card, formatWhen, gmailSearchUrl, PageHeader, PaymentBadge, StatusBadge, usd } from '../_components/ui';

function Metric({ label, value, detail, icon: Icon, href }: { label: string; value: string; detail: string; icon: typeof Package; href?: string }) {
  const body = (
    <div className="h-full rounded-3xl border border-white/10 bg-zinc-950/70 p-5 transition hover:border-white/25">
      <Icon className="h-5 w-5 text-cyan-300" />
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-300">{label}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminHome() {
  const [metrics, { products }, messages] = await Promise.all([getDashboardMetrics(), listProducts({ includeInactive: true }), listRecentMessages(8)]);
  const lowStock = products.filter((product) => product.active && product.stock !== null && product.stock <= product.lowStockAt);
  const attention = metrics.orders.filter((order) => order.status === 'new').slice(0, 8);
  const ordersEmail = process.env.FARMZ3D_ORDERS_EMAIL;

  return (
    <div>
      <PageHeader title="Visão geral" subtitle="O que precisa de atenção hoje na Farmz3D." />

      {!metrics.configured && (
        <p className="mb-6 flex gap-2 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="h-5 w-5 shrink-0" /> Supabase não configurado: pedidos e produtos não podem ser salvos.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Hourglass} label="Novos para responder" value={String(metrics.newCount)} detail="Pedidos com status Novo" href="/admin/pedidos?status=new" />
        <Metric icon={Truck} label="Para enviar" value={String(metrics.toShip)} detail="Confirmados/imprimindo com envio" href="/admin/pedidos?status=open" />
        <Metric icon={CircleDollarSign} label="Em aberto sem pagamento" value={String(metrics.unpaidOpen)} detail={`${metrics.openCount} pedidos em aberto`} href="/admin/pedidos?status=open" />
        <Metric icon={Package} label="Vendas (30 dias)" value={usd(metrics.monthValueCents)} detail={`${usd(metrics.monthPaidCents)} pago · ${metrics.weekCount} pedidos em 7 dias`} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Pedidos novos" action={<Link href="/admin/pedidos" className="text-xs font-bold text-cyan-300">Ver todos →</Link>}>
          {attention.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum pedido novo. 🎉</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {attention.map((order) => (
                <li key={order.order_number}>
                  <Link href={`/admin/pedidos/${order.order_number}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-white/[0.02]">
                    <span className="font-mono text-sm font-bold">{order.order_number}</span>
                    <span className="text-sm text-zinc-300">{order.customer_name}</span>
                    <span className="text-sm text-zinc-500">
                      {order.product_name} ×{order.quantity}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <PaymentBadge status={order.payment_status} />
                      <StatusBadge status={order.status} />
                      <span className="text-sm font-semibold">{order.product_id === 'custom-quote' && order.estimated_total_cents <= 0 ? 'Orçamento' : usd(order.estimated_total_cents)}</span>
                    </span>
                    <span className="w-full text-xs text-zinc-500">{formatWhen(order.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid content-start gap-6">
          <Card title="Estoque baixo" action={<Link href="/admin/produtos" className="text-xs font-bold text-cyan-300">Produtos →</Link>}>
            {lowStock.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-zinc-500">
                <Boxes className="h-4 w-4" /> Nada acabando. Produtos sob encomenda não entram aqui.
              </p>
            ) : (
              <ul className="grid gap-2">
                {lowStock.map((product) => (
                  <li key={product.id}>
                    <Link href={`/admin/produtos/${product.id}`} className="flex justify-between text-sm hover:text-white">
                      <span className="text-zinc-300">{product.name}</span>
                      <span className={product.stock === 0 ? 'font-bold text-red-300' : 'font-bold text-amber-200'}>
                        {product.stock === 0 ? 'Esgotado' : `${product.stock} un.`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Últimas conversas"
            action={
              <a href={gmailSearchUrl(ordersEmail ? `to:${ordersEmail} OR from:${ordersEmail}` : 'Farmz3D')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300">
                <Mail className="h-3.5 w-3.5" /> Abrir Gmail
              </a>
            }
          >
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma mensagem registrada ainda.</p>
            ) : (
              <ul className="grid gap-3">
                {messages.map((message) => (
                  <li key={message.id} className="text-sm">
                    <Link href={`/admin/pedidos/${message.order_number}`} className="hover:text-white">
                      <span className="font-mono text-xs text-zinc-500">{message.order_number}</span>{' '}
                      <span className="text-xs font-bold uppercase text-cyan-300">{message.channel === 'note' ? 'nota' : message.channel}</span>
                      <p className="line-clamp-2 text-zinc-300">{message.subject ?? message.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
