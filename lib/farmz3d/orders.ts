import { randomBytes } from 'node:crypto';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';
import { escapeHtml } from '@/lib/shared/request-guard';
import { formatUsd, type OrderInput } from './catalog';
import { FARMZ3D_WHATSAPP, formatUsPhone, toWhatsappDigits, whatsappLink } from './contact';
import type { OrderImage } from './order-images';
import { getLiveCatalog } from './pricing';
import { getActiveCampaign, newYorkToday } from './season';

const ORDER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createOrderNumber(now: Date = new Date()) {
  const day = newYorkToday(now).replace(/-/g, '').slice(2);
  const suffix = Array.from(randomBytes(4), (byte) => ORDER_ALPHABET[byte % ORDER_ALPHABET.length]).join('');
  return `FZ-${day}-${suffix}`;
}

export function getFarmz3dConfigStatus() {
  return {
    database: Boolean(getSupabaseAdmin()),
    email: Boolean(process.env.RESEND_API_KEY && process.env.FARMZ3D_ORDERS_EMAIL),
  };
}

type SavedOrder = {
  orderNumber: string;
  productName: string;
  unitPriceCents: number;
  shippingCents: number;
  estimatedTotalCents: number;
  campaign: string;
};

export async function saveOrder(order: OrderInput, imagePath: string | null = null): Promise<{ saved: SavedOrder; stored: boolean; storeError?: string }> {
  // Price and campaign come from the approved decisions, never from the browser.
  const { products, leadDays, shippingCents: flatShipping } = await getLiveCatalog();
  const product = products.find((item) => item.id === order.productId);
  if (!product) throw new Error('Unknown product.');

  const campaign = getActiveCampaign(new Date(), leadDays).id;
  const shippingCents = order.fulfillment === 'shipping' ? flatShipping : 0;
  const base = {
    productName: product.name,
    unitPriceCents: product.priceCents,
    shippingCents,
    estimatedTotalCents: product.priceCents * order.quantity + shippingCents,
    campaign,
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { saved: { orderNumber: createOrderNumber(), ...base }, stored: false, storeError: 'Supabase not configured.' };
  }

  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const orderNumber = createOrderNumber();
    const { error } = await supabase.from('farmz3d_orders').insert({
      order_number: orderNumber,
      product_id: product.id,
      product_name: product.name,
      unit_price_cents: product.priceCents,
      quantity: order.quantity,
      shipping_cents: shippingCents,
      estimated_total_cents: base.estimatedTotalCents,
      personalization: order.personalization,
      needed_by: order.neededBy ?? null,
      fulfillment: order.fulfillment,
      shipping_zip: order.fulfillment === 'shipping' ? order.shippingZip ?? null : null,
      customer_name: order.name,
      customer_email: order.email.toLowerCase(),
      customer_phone: order.phone ?? null,
      notes: order.notes ?? null,
      image_path: imagePath,
      campaign,
    });

    if (!error) return { saved: { orderNumber, ...base }, stored: true };
    lastError = error.message;
    // 23505 = unique violation on order_number; retry with a new number.
    if (error.code !== '23505') break;
  }

  return { saved: { orderNumber: createOrderNumber(), ...base }, stored: false, storeError: lastError };
}

function orderRows(order: OrderInput, saved: SavedOrder) {
  return [
    ['Order', saved.orderNumber],
    ['Product', saved.productName],
    ['Quantity', String(order.quantity)],
    ['Unit price', formatUsd(saved.unitPriceCents)],
    ['Shipping', saved.shippingCents ? formatUsd(saved.shippingCents) : 'Local pickup — no shipping'],
    ['Estimated total', formatUsd(saved.estimatedTotalCents)],
    ['Personalization', order.personalization],
    ['Needed by', order.neededBy ?? '—'],
    ['Fulfillment', order.fulfillment === 'shipping' ? `Shipping to ZIP ${order.shippingZip}` : 'Local pickup'],
    ['Name', order.name],
    ['Email', order.email],
    ['WhatsApp / phone', order.phone],
    ['Notes', order.notes ?? '—'],
  ];
}

function rowsToHtml(rows: string[][]) {
  return `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b5a4a;vertical-align:top"><strong>${escapeHtml(label)}</strong></td><td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
    )
    .join('')}</table>`;
}

export async function sendOrderEmails(order: OrderInput, saved: SavedOrder, image: OrderImage | null = null) {
  const apiKey = process.env.RESEND_API_KEY;
  const ordersEmail = process.env.FARMZ3D_ORDERS_EMAIL;
  if (!apiKey || !ordersEmail) return { emailed: false, error: 'RESEND_API_KEY and FARMZ3D_ORDERS_EMAIL are required.' };

  const resend = new Resend(apiKey);
  // Must be an address on a domain verified in Resend (e.g. orders@farmz3d.shop).
  const from = process.env.FARMZ3D_FROM_EMAIL || 'Farmz3D <onboarding@resend.dev>';
  const rows = orderRows(order, saved);
  if (image) rows.push(['Reference image', `${image.originalName} (attached)`]);
  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');

  const customerWhatsapp = toWhatsappDigits(order.phone);
  const replyOnWhatsapp = customerWhatsapp
    ? whatsappLink(customerWhatsapp, `Hi ${order.name}! This is Bruna from Farmz3D about your order ${saved.orderNumber} (${saved.productName}).`)
    : null;
  const shopWhatsapp = whatsappLink(FARMZ3D_WHATSAPP, `Hi! My Farmz3D order is ${saved.orderNumber}.`);

  const owner = await resend.emails.send({
    from,
    to: ordersEmail,
    replyTo: order.email,
    subject: `New Farmz3D order ${saved.orderNumber} — ${saved.productName} x${order.quantity}`,
    html: `<h2 style="font-family:Arial,sans-serif">New order</h2>${rowsToHtml(rows)}${
      replyOnWhatsapp
        ? `<p style="font-family:Arial,sans-serif;margin-top:20px"><a href="${escapeHtml(replyOnWhatsapp)}" style="background:#25D366;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Reply on WhatsApp</a></p>`
        : ''
    }`,
    text: replyOnWhatsapp ? `${text}\n\nReply on WhatsApp: ${replyOnWhatsapp}` : text,
    attachments: image ? [{ filename: `${saved.orderNumber}.${image.ext}`, content: Buffer.from(image.bytes), contentType: image.contentType }] : undefined,
  });

  if (owner.error) return { emailed: false, error: owner.error.message };

  // Customer confirmation is best effort: the owner already has the order.
  const customer = await resend.emails.send({
    from,
    to: order.email,
    replyTo: ordersEmail,
    subject: `We got your Farmz3D order ${saved.orderNumber}`,
    html: `<p style="font-family:Arial,sans-serif">Hi ${escapeHtml(order.name)},</p>
<p style="font-family:Arial,sans-serif">Thanks for your order! We will review the details and reply with a confirmation and a payment link. Nothing is charged until you approve it.</p>
${rowsToHtml(rows)}
<p style="font-family:Arial,sans-serif">Questions? Reply to this email or message us on WhatsApp: <a href="${escapeHtml(shopWhatsapp)}">${escapeHtml(formatUsPhone(FARMZ3D_WHATSAPP))}</a>.<br/>— Farmz3D</p>`,
    text: `Hi ${order.name},\n\nThanks for your order! We will reply with a confirmation and a payment link. Nothing is charged until you approve it.\n\n${text}\n\nQuestions? Reply to this email or message us on WhatsApp: ${shopWhatsapp}\n\n— Farmz3D`,
  });

  return { emailed: true, customerEmailed: !customer.error };
}
