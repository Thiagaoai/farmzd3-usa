import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { AlertTriangle, ClipboardList, Hourglass, ImageIcon, ShieldCheck, Scale } from 'lucide-react';
import { isAdminAuthorized } from '@/lib/auth/admin-auth';
import { DECISION_GROUPS } from '@/lib/decisions/registry';
import { formatDecisionValue } from '@/lib/decisions/schema';
import { getResolvedDecisions } from '@/lib/decisions/store';
import { getAdminDashboardData } from '@/lib/farmz3d/admin-data';
import { isTypeSafeConfigured } from '@/lib/typesafe/client';
import { getMediations, getOrderTriage, getPositions } from '@/lib/typesafe/store';
import { formatUsd } from '@/lib/farmz3d/catalog';
import { toWhatsappDigits, whatsappLink } from '@/lib/farmz3d/contact';
import { DecisionCard, DeciderSwitch, OrderStatusSelect, OrderTriageCell, type DecisionView } from './AdminClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Painel Farmz3D',
  robots: { index: false, follow: false },
};

function formatWhen(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/New_York' }).format(new Date(value));
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Scale }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
      <Icon className="h-5 w-5 text-cyan-300" />
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-300">{label}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

export default async function AdminFarmz3dPage() {
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const authorized = isAdminAuthorized({
    authorization: requestHeaders.get('authorization'),
    token: cookieStore.get('farmz3d_admin_session')?.value,
  });

  if (!authorized) {
    return (
      <main className="min-h-screen bg-black px-6 py-24 text-white">
        <div className="mx-auto max-w-3xl rounded-[34px] border border-zinc-800 bg-zinc-950/80 p-8">
          <ShieldCheck className="h-10 w-10 text-amber-200" />
          <h1 className="mt-8 text-4xl font-semibold">Painel protegido</h1>
          <p className="mt-5 text-zinc-400">Entre pelo login do painel para ver pedidos, decisões e métricas.</p>
          <Link href="/admin/login" className="mt-8 inline-flex rounded-full border border-white/10 px-5 py-3 text-sm font-bold">
            Ir para login
          </Link>
        </div>
      </main>
    );
  }

  const [resolved, data, positions, mediations, triage] = await Promise.all([
    getResolvedDecisions(),
    getAdminDashboardData(),
    getPositions(),
    getMediations(),
    getOrderTriage(),
  ]);
  const jevEnabled = isTypeSafeConfigured() && data.configured;

  const decisions: DecisionView[] = resolved.map(({ decision, option, approved }) => ({
    id: decision.id,
    group: decision.group,
    title: decision.title,
    question: decision.question,
    owner: decision.owner,
    unit: decision.unit,
    unitCostCents: decision.unitCostCents ?? null,
    evidence: decision.evidence,
    activeOptionId: option.id,
    approved: approved ? { by: approved.decidedBy, at: approved.decidedAt, note: approved.note } : null,
    positions: positions.get(decision.id) ?? {},
    mediation: mediations.get(decision.id) ?? null,
    options: decision.options.map((item) => ({
      id: item.id,
      label: item.label,
      value: item.value,
      display: formatDecisionValue(decision.unit, item.value),
      rationale: item.rationale,
      recommended: item.id === decision.recommendedOptionId,
    })),
  }));

  const pending = decisions.filter((decision) => !decision.approved).length;
  const withImage = data.orders.filter((order) => order.image_path).length;
  const newOrders = data.orders.filter((order) => order.status === 'new').length;
  const decisionTitles = new Map(decisions.map((decision) => [decision.id, decision]));

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Thiago + Bruna</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Farmz3D</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <a href="#decisoes" className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/10">Decisões</a>
            <a href="#pedidos" className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/10">Pedidos</a>
            <Link href="/" className="rounded-full bg-white px-4 py-2 font-bold text-black">Ver loja</Link>
          </nav>
        </header>

        {!data.configured && (
          <div className="mt-6 flex gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Supabase não configurado: as decisões aparecem com a recomendação, mas não é possível salvar aprovações nem ver pedidos.
          </div>
        )}
        {data.errors.length > 0 && (
          <div className="mt-6 rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">
            Erro ao ler o banco (rode as migrations em supabase/migrations): {data.errors.join(' · ')}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Scale} label="Decisões pendentes" value={String(pending)} detail={`${decisions.length - pending} aprovadas de ${decisions.length}`} />
          <Metric icon={ClipboardList} label="Pedidos (7 dias)" value={String(data.weekOrderCount)} detail={`${formatUsd(data.weekValueCents)} estimado · ${data.openOrderCount} em aberto`} />
          <Metric icon={Hourglass} label="Novos para responder" value={String(newOrders)} detail="Pedidos com status Novo" />
          <Metric icon={ImageIcon} label="Pedidos com imagem" value={String(withImage)} detail={`de ${data.orders.length} pedidos recentes`} />
        </section>

        <section id="decisoes" className="mt-12 scroll-mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Decisões</h2>
              <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                Cada decisão mostra o preço de mercado com fonte. Aprovar muda o site na hora. Enquanto estiver pendente, o site usa a opção recomendada.
              </p>
            </div>
            <DeciderSwitch />
          </div>

          {DECISION_GROUPS.map((group) => {
            const items = decisions.filter((decision) => decision.group === group.id);
            if (!items.length) return null;
            return (
              <div key={group.id} className="mt-8">
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-zinc-500">{group.title}</h3>
                <div className="mt-4 grid gap-4">
                  {items.map((decision) => (
                    <DecisionCard key={decision.id} decision={decision} canWrite={data.configured} jevEnabled={jevEnabled} />
                  ))}
                </div>
              </div>
            );
          })}

          {data.history.length > 0 && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
              <h3 className="font-semibold">Histórico de decisões</h3>
              <ul className="mt-3 grid gap-2 text-sm text-zinc-400">
                {data.history.map((entry) => {
                  const decision = decisionTitles.get(entry.decision_id);
                  const option = decision?.options.find((item) => item.id === entry.option_id);
                  return (
                    <li key={`${entry.decision_id}-${entry.created_at}`}>
                      <span className="text-zinc-500">{formatWhen(entry.created_at)}</span> · {entry.decided_by === 'bruna' ? 'Bruna' : 'Thiago'} escolheu{' '}
                      <strong className="text-zinc-200">{option?.display ?? entry.option_id}</strong> em {decision?.title ?? entry.decision_id}
                      {entry.note && <> — “{entry.note}”</>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        <section id="pedidos" className="mt-12 scroll-mt-6">
          <h2 className="text-2xl font-semibold">Pedidos Farmz3D</h2>
          {data.orders.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Nenhum pedido ainda.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-3xl border border-white/10">
              <table className="w-full min-w-[1020px] text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Pedido</th>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Personalização</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Entrega</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Jev</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.orders.map((order) => (
                    <tr key={order.order_number} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold">{order.order_number}</p>
                        <p className="text-xs text-zinc-500">{formatWhen(order.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {order.product_name} <span className="text-zinc-500">×{order.quantity}</span>
                      </td>
                      <td className="max-w-[220px] whitespace-pre-wrap px-4 py-3 text-zinc-300">
                        {order.personalization}
                        {order.notes && <p className="mt-1 text-xs text-zinc-500">Nota: {order.notes}</p>}
                        {order.image_path && (
                          <a
                            href={`/api/admin/orders/image?order=${order.order_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block w-fit"
                            title="Abrir imagem do cliente"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-protected image */}
                            <img
                              src={`/api/admin/orders/image?order=${order.order_number}`}
                              alt={`Imagem enviada no pedido ${order.order_number}`}
                              className="h-20 w-20 rounded-lg border border-white/10 object-cover"
                              loading="lazy"
                            />
                            <span className="text-[11px] text-cyan-300">Imagem do cliente ↗</span>
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p>{order.customer_name}</p>
                        <a href={`mailto:${order.customer_email}`} className="text-xs text-cyan-300">{order.customer_email}</a>
                        {order.customer_phone && <p className="text-xs text-zinc-500">{order.customer_phone}</p>}
                        {toWhatsappDigits(order.customer_phone) && (
                          <a
                            href={whatsappLink(
                              toWhatsappDigits(order.customer_phone)!,
                              `Hi ${order.customer_name}! This is Bruna from Farmz3D about your order ${order.order_number} (${order.product_name}).`,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex rounded-full bg-[#25D366]/15 px-2.5 py-1 text-[11px] font-semibold text-[#6BE39A] hover:bg-[#25D366]/25"
                          >
                            WhatsApp do cliente
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-300">
                        {order.fulfillment === 'shipping' ? `Envio · ZIP ${order.shipping_zip}` : 'Retirada'}
                        {order.needed_by && <p className="text-amber-200">Precisa até {order.needed_by}</p>}
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatUsd(order.estimated_total_cents)}</td>
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
        </section>

      </div>
    </main>
  );
}
