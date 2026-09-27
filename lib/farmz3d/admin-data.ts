import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';

export const ORDER_STATUSES = ['new', 'confirmed', 'printing', 'shipped', 'picked_up', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const OrderStatusUpdateSchema = z.object({
  orderNumber: z.string().regex(/^FZ-\d{6}-[A-Z2-9]{4}$/),
  status: z.enum(ORDER_STATUSES),
});

export type AdminOrder = {
  order_number: string;
  status: OrderStatus;
  product_name: string;
  quantity: number;
  estimated_total_cents: number;
  personalization: string;
  needed_by: string | null;
  fulfillment: 'pickup' | 'shipping';
  shipping_zip: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  notes: string | null;
  image_path: string | null;
  campaign: string;
  created_at: string;
};

export type AdminDecisionLog = {
  decision_id: string;
  option_id: string;
  decided_by: string;
  note: string | null;
  created_at: string;
};

export async function getAdminDashboardData() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      configured: false as const,
      orders: [] as AdminOrder[],
      weekOrderCount: 0,
      weekValueCents: 0,
      openOrderCount: 0,
      history: [] as AdminDecisionLog[],
      errors: [] as string[],
    };
  }

  const [orders, history] = await Promise.all([
    supabase.from('farmz3d_orders').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('business_decision_log').select('*').order('created_at', { ascending: false }).limit(30),
  ]);

  const errors = [orders.error, history.error]
    .filter((error): error is NonNullable<typeof error> => Boolean(error))
    .map((error) => error.message);

  const orderRows = (orders.data ?? []) as AdminOrder[];
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const live = orderRows.filter((order) => order.status !== 'cancelled');
  const week = live.filter((order) => new Date(order.created_at).getTime() >= weekAgo);

  return {
    configured: true as const,
    orders: orderRows,
    weekOrderCount: week.length,
    weekValueCents: week.reduce((sum, order) => sum + order.estimated_total_cents, 0),
    openOrderCount: live.filter((order) => ['new', 'confirmed', 'printing'].includes(order.status)).length,
    history: (history.data ?? []) as AdminDecisionLog[],
    errors,
  };
}

export async function updateOrderStatus(orderNumber: string, status: OrderStatus) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, status: 503, message: 'Supabase não configurado.' };

  const { data, error } = await supabase
    .from('farmz3d_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('order_number', orderNumber)
    .select('order_number');

  if (error) return { ok: false as const, status: 500, message: error.message };
  if (!data?.length) return { ok: false as const, status: 404, message: 'Pedido não encontrado.' };
  return { ok: true as const };
}
