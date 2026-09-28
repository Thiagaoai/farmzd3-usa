import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';

export const ORDER_STATUSES = ['new', 'confirmed', 'printing', 'shipped', 'picked_up', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Novo',
  confirmed: 'Confirmado',
  printing: 'Imprimindo',
  shipped: 'Enviado',
  picked_up: 'Retirado',
  cancelled: 'Cancelado',
};

export const PAYMENT_STATUSES = ['unpaid', 'link_sent', 'paid', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Não pago',
  link_sent: 'Link enviado',
  paid: 'Pago',
  refunded: 'Reembolsado',
};

export const ORDER_NUMBER = /^FZ-\d{6}-[A-Z2-9]{4}$/;

export const OrderStatusUpdateSchema = z.object({
  orderNumber: z.string().regex(ORDER_NUMBER),
  status: z.enum(ORDER_STATUSES),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null));

export const OrderUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  trackingCarrier: z.enum(['usps', 'ups', 'fedex', 'other']).nullable().optional(),
  trackingNumber: optionalText(60),
  shipLine1: optionalText(120),
  shipLine2: optionalText(120),
  shipCity: optionalText(80),
  shipState: optionalText(2),
  shippingZip: optionalText(10),
  internalNotes: optionalText(4000),
});
export type OrderUpdate = z.infer<typeof OrderUpdateSchema>;

export type AdminOrder = {
  order_number: string;
  status: OrderStatus;
  product_id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  shipping_cents: number;
  estimated_total_cents: number;
  personalization: string;
  needed_by: string | null;
  fulfillment: 'pickup' | 'shipping';
  shipping_zip: string | null;
  ship_line1: string | null;
  ship_line2: string | null;
  ship_city: string | null;
  ship_state: string | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  payment_status: PaymentStatus;
  payment_url: string | null;
  paid_at: string | null;
  stripe_session_id: string | null;
  internal_notes: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  notes: string | null;
  image_path: string | null;
  campaign: string;
  created_at: string;
  updated_at: string;
};

export type AdminDecisionLog = {
  decision_id: string;
  option_id: string;
  decided_by: string;
  note: string | null;
  created_at: string;
};

const OPEN: OrderStatus[] = ['new', 'confirmed', 'printing'];

export async function listOrders(filters: { status?: string; q?: string; limit?: number } = {}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { configured: false as const, orders: [] as AdminOrder[], error: null };

  let query = supabase.from('farmz3d_orders').select('*').order('created_at', { ascending: false }).limit(filters.limit ?? 500);
  if (filters.status === 'open') query = query.in('status', OPEN);
  else if (filters.status && (ORDER_STATUSES as readonly string[]).includes(filters.status)) query = query.eq('status', filters.status);

  const { data, error } = await query;
  let orders = (data ?? []) as AdminOrder[];
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    orders = orders.filter((order) =>
      [order.order_number, order.customer_name, order.customer_email, order.customer_phone, order.product_name, order.personalization]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }
  return { configured: true as const, orders, error: error?.message ?? null };
}

export async function getOrder(orderNumber: string): Promise<AdminOrder | null> {
  if (!ORDER_NUMBER.test(orderNumber)) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase.from('farmz3d_orders').select('*').eq('order_number', orderNumber).maybeSingle();
  return (data as AdminOrder | null) ?? null;
}

export async function updateOrder(orderNumber: string, patch: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, status: 503, message: 'Supabase não configurado.' };

  const { data, error } = await supabase
    .from('farmz3d_orders')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('order_number', orderNumber)
    .select('*');

  if (error) {
    console.error('[orders] update failed', error.message);
    return { ok: false as const, status: 500, message: 'Não foi possível salvar o pedido.' };
  }
  if (!data?.length) return { ok: false as const, status: 404, message: 'Pedido não encontrado.' };
  return { ok: true as const, order: data[0] as AdminOrder };
}

export async function updateOrderStatus(orderNumber: string, status: OrderStatus) {
  const result = await updateOrder(orderNumber, status === 'shipped' ? { status, shipped_at: new Date().toISOString() } : { status });
  return result.ok ? { ok: true as const } : result;
}

export async function getDashboardMetrics() {
  const { configured, orders, error } = await listOrders({ limit: 1000 });
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const live = orders.filter((order) => order.status !== 'cancelled');
  const sum = (list: AdminOrder[]) => list.reduce((total, order) => total + order.estimated_total_cents, 0);
  const week = live.filter((order) => new Date(order.created_at).getTime() >= weekAgo);
  const month = live.filter((order) => new Date(order.created_at).getTime() >= monthAgo);

  return {
    configured,
    error,
    orders,
    newCount: orders.filter((order) => order.status === 'new').length,
    openCount: live.filter((order) => OPEN.includes(order.status)).length,
    toShip: live.filter((order) => order.fulfillment === 'shipping' && ['confirmed', 'printing'].includes(order.status)).length,
    unpaidOpen: live.filter((order) => OPEN.includes(order.status) && order.payment_status !== 'paid').length,
    weekCount: week.length,
    weekValueCents: sum(week),
    monthValueCents: sum(month),
    monthPaidCents: sum(month.filter((order) => order.payment_status === 'paid')),
  };
}

export async function getDecisionHistory(): Promise<AdminDecisionLog[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase.from('business_decision_log').select('*').order('created_at', { ascending: false }).limit(30);
  return (data ?? []) as AdminDecisionLog[];
}
