import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';
import { escapeHtml } from '@/lib/shared/request-guard';
import { FARMZ3D_WHATSAPP, formatUsPhone, whatsappLink } from './contact';

export type MessageChannel = 'email' | 'whatsapp' | 'note' | 'system';
export type MessageDirection = 'out' | 'in' | 'internal';

export type OrderMessage = {
  id: string;
  order_number: string;
  channel: MessageChannel;
  direction: MessageDirection;
  subject: string | null;
  body: string;
  author: string | null;
  created_at: string;
};

export async function logOrderMessage(input: {
  orderNumber: string;
  channel: MessageChannel;
  direction: MessageDirection;
  body: string;
  subject?: string | null;
  author?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, message: 'Supabase não configurado.' };
  const { error } = await supabase.from('farmz3d_order_messages').insert({
    order_number: input.orderNumber,
    channel: input.channel,
    direction: input.direction,
    subject: input.subject ?? null,
    body: input.body.slice(0, 10000),
    author: input.author ?? null,
  });
  if (error) {
    console.error('[messages] log failed', error.message);
    return { ok: false as const, message: error.message };
  }
  return { ok: true as const };
}

export async function listOrderMessages(orderNumber: string): Promise<OrderMessage[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase
    .from('farmz3d_order_messages')
    .select('*')
    .eq('order_number', orderNumber)
    .order('created_at', { ascending: true });
  return (data ?? []) as OrderMessage[];
}

export async function listRecentMessages(limit = 30): Promise<OrderMessage[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase
    .from('farmz3d_order_messages')
    .select('*')
    .neq('channel', 'system')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as OrderMessage[];
}

function bodyToHtml(body: string) {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;margin:0 0 14px">${escapeHtml(paragraph).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

// Customer email sent from the panel. Replies go to the shop inbox (FARMZ3D_ORDERS_EMAIL).
export async function sendCustomerEmail(input: { orderNumber: string; to: string; subject: string; body: string; author: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false as const, message: 'RESEND_API_KEY não configurada.' };

  const from = process.env.FARMZ3D_FROM_EMAIL || 'Farmz3D <onboarding@resend.dev>';
  const replyTo = process.env.FARMZ3D_ORDERS_EMAIL || undefined;
  const chat = whatsappLink(FARMZ3D_WHATSAPP, `Hi! About my Farmz3D order ${input.orderNumber}.`);
  const footer = `\n\n—\nFarmz3D · Order ${input.orderNumber}\nWhatsApp ${formatUsPhone(FARMZ3D_WHATSAPP)}`;

  const result = await new Resend(apiKey).emails.send({
    from,
    to: input.to,
    replyTo,
    subject: input.subject,
    html: `${bodyToHtml(input.body)}<p style="font-family:Arial,sans-serif;font-size:13px;color:#6b7280;margin-top:24px">— Farmz3D · Order ${escapeHtml(input.orderNumber)}<br/>Questions? Reply to this email or <a href="${escapeHtml(chat)}">message us on WhatsApp</a> (${escapeHtml(formatUsPhone(FARMZ3D_WHATSAPP))}).</p>`,
    text: `${input.body}${footer}`,
  });
  if (result.error) return { ok: false as const, message: result.error.message };

  await logOrderMessage({
    orderNumber: input.orderNumber,
    channel: 'email',
    direction: 'out',
    subject: input.subject,
    body: input.body,
    author: input.author,
  });
  return { ok: true as const };
}

export const CARRIERS = {
  usps: { label: 'USPS', url: (n: string) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}` },
  ups: { label: 'UPS', url: (n: string) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}` },
  fedex: { label: 'FedEx', url: (n: string) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}` },
  other: { label: 'Outra', url: () => null },
} as const;
export type CarrierId = keyof typeof CARRIERS;

export function trackingUrl(carrier: string | null, number: string | null) {
  if (!carrier || !number || !(carrier in CARRIERS)) return null;
  return CARRIERS[carrier as CarrierId].url(number);
}

type TemplateOrder = {
  order_number: string;
  product_id: string;
  personalization: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  estimated_total_cents: number;
  fulfillment: string;
  payment_url: string | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
};

const usd = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

// Ready-to-edit customer messages (English: the customers are in the US).
export function messageTemplates(order: TemplateOrder) {
  const hi = `Hi ${firstName(order.customer_name)},`;
  const item = `${order.product_name} x${order.quantity}`;
  const track = trackingUrl(order.tracking_carrier, order.tracking_number);
  const quote =
    order.product_id === 'custom-quote'
      ? [
          {
            id: 'quote',
            label: 'Enviar orçamento',
            subject: `Your Farmz3D custom quote ${order.order_number}`,
            body: `${hi}\n\nThank you for your custom request! Here is your quote:\n\n${order.personalization.slice(0, 300)}\n\nTotal: ${
              order.estimated_total_cents > 0 ? usd(order.estimated_total_cents) : '$__ (set the amount in the panel first)'
            } (shipping included)\nReady in about __ business days after payment.\n\n${
              order.payment_url ? `To approve, pay securely here: ${order.payment_url}` : 'Reply "yes" to approve and we will send you a secure payment link.'
            }\n\nHappy to adjust anything — just reply to this email.`,
          },
        ]
      : [];
  return [
    ...quote,
    {
      id: 'confirm',
      label: 'Confirmar + pagamento',
      subject: `Your Farmz3D order ${order.order_number} is confirmed`,
      body: `${hi}\n\nGreat news — we reviewed your order (${item}) and everything looks good. Your total is ${usd(order.estimated_total_cents)}.\n\n${
        order.payment_url ? `You can pay securely here: ${order.payment_url}` : 'We will send you a secure payment link shortly.'
      }\n\nAs soon as the payment goes through we start printing. Thank you!`,
    },
    {
      id: 'details',
      label: 'Pedir detalhes',
      subject: `Quick question about your Farmz3D order ${order.order_number}`,
      body: `${hi}\n\nThanks for your order (${item})! Before we start printing, could you confirm a few details?\n\n- \n\nJust reply to this email (or send a WhatsApp) and we will get started.`,
    },
    {
      id: 'printing',
      label: 'Em produção',
      subject: `Your Farmz3D order ${order.order_number} is printing`,
      body: `${hi}\n\nYour ${item} is on the printer right now. We will let you know as soon as it is ready.`,
    },
    order.fulfillment === 'shipping'
      ? {
          id: 'shipped',
          label: 'Enviado (rastreio)',
          subject: `Your Farmz3D order ${order.order_number} has shipped`,
          body: `${hi}\n\nYour ${item} is on its way!${
            order.tracking_number ? `\n\nTracking (${order.tracking_carrier?.toUpperCase() ?? ''}): ${order.tracking_number}${track ? `\n${track}` : ''}` : ''
          }\n\nThank you for supporting our small shop. We would love to see it in its new home — tag us or send a photo!`,
        }
      : {
          id: 'pickup',
          label: 'Pronto p/ retirar',
          subject: `Your Farmz3D order ${order.order_number} is ready for pickup`,
          body: `${hi}\n\nYour ${item} is ready! Reply here or on WhatsApp to set a pickup time that works for you.`,
        },
    {
      id: 'thanks',
      label: 'Agradecer',
      subject: `Thank you from Farmz3D`,
      body: `${hi}\n\nThank you again for your order. If you loved it, a quick review or a photo would mean the world to our little family business.`,
    },
  ];
}
