import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Mail, MessageCircle, Phone } from 'lucide-react';
import { getOrder, PAYMENT_LABELS, STATUS_LABELS } from '@/lib/farmz3d/admin-data';
import { toWhatsappDigits, whatsappLink } from '@/lib/farmz3d/contact';
import { listOrderMessages, messageTemplates, trackingUrl, type OrderMessage } from '@/lib/farmz3d/messages';
import { formatShipAddress } from '@/lib/farmz3d/orders';
import { isStripeConfigured } from '@/lib/farmz3d/stripe';
import { getOrderTriage } from '@/lib/typesafe/store';
import { MessageComposer, OrderEditor, PaymentLinkBox } from '../../../_components/OrderClient';
import { Card, formatWhen, gmailSearchUrl, PaymentBadge, StatusBadge, usd } from '../../../_components/ui';

const CHANNEL = {
  email: { label: 'Email', className: 'bg-sky-400/15 text-sky-200' },
  whatsapp: { label: 'WhatsApp', className: 'bg-emerald-400/15 text-emerald-200' },
  note: { label: 'Nota', className: 'bg-amber-400/15 text-amber-200' },
  system: { label: 'Sistema', className: 'bg-zinc-500/15 text-zinc-400' },
} as const;

function Timeline({ messages }: { messages: OrderMessage[] }) {
  if (!messages.length) return <p className="text-sm text-zinc-500">Nenhum registro ainda.</p>;
  return (
    <ol className="grid gap-3">
      {[...messages].reverse().map((message) => (
        <li key={message.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-bold ${CHANNEL[message.channel].className}`}>{CHANNEL[message.channel].label}</span>
            {message.direction === 'out' && <span className="text-zinc-500">enviado</span>}
            {message.author && <span className="text-zinc-400">{message.author}</span>}
            <span className="ml-auto text-zinc-500">{formatWhen(message.created_at)}</span>
          </div>
          {message.subject && <p className="mt-2 text-sm font-semibold text-zinc-200">{message.subject}</p>}
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{message.body}</p>
        </li>
      ))}
    </ol>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="min-w-0 break-words text-zinc-200">{children}</dd>
    </div>
  );
}

export default async function OrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const order = await getOrder(orderNumber);
  if (!order) notFound();

  const [messages, triage] = await Promise.all([listOrderMessages(orderNumber), getOrderTriage()]);
  const verdict = triage.get(orderNumber);
  const whatsappDigits = toWhatsappDigits(order.customer_phone);
  const track = trackingUrl(order.tracking_carrier, order.tracking_number);
  const address = formatShipAddress({
    shipLine1: order.ship_line1,
    shipLine2: order.ship_line2,
    shipCity: order.ship_city,
    shipState: order.ship_state,
    shippingZip: order.shipping_zip,
  });
  const replySubject = `Re: Your Farmz3D order ${order.order_number}`;
  const emailReady = Boolean(process.env.RESEND_API_KEY);

  return (
    <div>
      <Link href="/admin/pedidos" className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Pedidos
      </Link>

      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold sm:text-3xl">{order.order_number}</h1>
        <StatusBadge status={order.status} />
        <PaymentBadge status={order.payment_status} />
        <span className="text-sm text-zinc-500">{formatWhen(order.created_at)}</span>
        <span className="ml-auto text-2xl font-black">{usd(order.estimated_total_cents)}</span>
      </header>

      {/* Quick actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        <a href={`mailto:${order.customer_email}?subject=${encodeURIComponent(replySubject)}`} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black">
          <Mail className="h-4 w-4" /> Responder email
        </a>
        <a href={gmailSearchUrl(`${order.order_number} OR ${order.customer_email}`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10">
          <ExternalLink className="h-4 w-4" /> Abrir conversa no Gmail
        </a>
        {whatsappDigits && (
          <a
            href={whatsappLink(whatsappDigits, `Hi ${order.customer_name.split(' ')[0]}! This is Bruna from Farmz3D about your order ${order.order_number} (${order.product_name}).`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp do cliente
          </a>
        )}
        {order.customer_phone && (
          <a href={`tel:${order.customer_phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10">
            <Phone className="h-4 w-4" /> Ligar
          </a>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="grid content-start gap-6">
          <Card title="Pedido">
            <dl>
              <Row label="Produto">
                {order.product_name} <span className="text-zinc-500">×{order.quantity}</span>
              </Row>
              <Row label="Preço unitário">{usd(order.unit_price_cents)}</Row>
              <Row label="Frete">{order.fulfillment === 'shipping' ? usd(order.shipping_cents) : 'Retirada — sem frete'}</Row>
              <Row label="Total">
                <strong>{usd(order.estimated_total_cents)}</strong>
              </Row>
              <Row label="Personalização">
                <span className="whitespace-pre-wrap">{order.personalization}</span>
              </Row>
              {order.notes && (
                <Row label="Obs. do cliente">
                  <span className="whitespace-pre-wrap">{order.notes}</span>
                </Row>
              )}
              <Row label="Precisa até">{order.needed_by ?? '—'}</Row>
              <Row label="Campanha">{order.campaign}</Row>
              {verdict && (
                <Row label="Jev">
                  {verdict.verdict} {verdict.reasons.length > 0 && <span className="text-zinc-500">— {verdict.reasons.join(' · ')}</span>}
                </Row>
              )}
            </dl>
            {order.image_path && (
              <a href={`/api/admin/orders/image?order=${order.order_number}`} target="_blank" rel="noopener noreferrer" className="mt-4 block w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-protected image */}
                <img
                  src={`/api/admin/orders/image?order=${order.order_number}`}
                  alt={`Imagem enviada no pedido ${order.order_number}`}
                  className="max-h-72 rounded-2xl border border-white/10 object-contain"
                />
                <span className="text-xs text-cyan-300">Abrir imagem do cliente em tamanho real ↗</span>
              </a>
            )}
          </Card>

          <Card title="Cliente">
            <dl>
              <Row label="Nome">{order.customer_name}</Row>
              <Row label="Email">
                <a href={`mailto:${order.customer_email}?subject=${encodeURIComponent(replySubject)}`} className="text-cyan-300">
                  {order.customer_email}
                </a>
              </Row>
              <Row label="WhatsApp">{order.customer_phone ?? '—'}</Row>
              <Row label="Entrega">{order.fulfillment === 'shipping' ? address || '—' : 'Retirada local'}</Row>
              {order.tracking_number && (
                <Row label="Rastreio">
                  {track ? (
                    <a href={track} target="_blank" rel="noopener noreferrer" className="text-cyan-300">
                      {order.tracking_carrier?.toUpperCase()} {order.tracking_number} ↗
                    </a>
                  ) : (
                    order.tracking_number
                  )}
                </Row>
              )}
              {order.shipped_at && <Row label="Enviado em">{formatWhen(order.shipped_at)}</Row>}
              {order.paid_at && <Row label="Pago em">{formatWhen(order.paid_at)}</Row>}
            </dl>
          </Card>

          <Card title="Pagamento">
            <PaymentLinkBox orderNumber={order.order_number} paymentUrl={order.payment_url} stripeReady={isStripeConfigured()} paid={order.payment_status === 'paid'} />
          </Card>

          <Card title="Atualizar pedido">
            <OrderEditor order={order} statusLabels={STATUS_LABELS} paymentLabels={PAYMENT_LABELS} />
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card title="Falar com o cliente">
            <MessageComposer
              orderNumber={order.order_number}
              customerEmail={order.customer_email}
              whatsappDigits={whatsappDigits}
              templates={messageTemplates(order)}
              emailReady={emailReady}
            />
          </Card>
          <Card title="Histórico">
            <Timeline messages={messages} />
          </Card>
        </div>
      </div>
    </div>
  );
}
