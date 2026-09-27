import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Mediation, PartnerPosition } from './decision-mediation';
import type { OrderTriage } from './order-triage';

export const PositionInputSchema = z.object({
  decisionId: z.string().min(1).max(120),
  person: z.enum(['thiago', 'bruna']),
  optionId: z.string().min(1).max(60),
  reason: z.string().trim().min(3, 'Explique o motivo (mín. 3 letras).').max(500),
});

export type PositionsByDecision = Map<string, Partial<Record<'thiago' | 'bruna', PartnerPosition & { updatedAt: string }>>>;

export async function getPositions(): Promise<PositionsByDecision> {
  const map: PositionsByDecision = new Map();
  const supabase = getSupabaseAdmin();
  if (!supabase) return map;
  const { data, error } = await supabase.from('business_decision_positions').select('decision_id, person, option_id, reason, updated_at');
  if (error) {
    console.error('[jev] positions read failed', error.message);
    return map;
  }
  for (const row of data ?? []) {
    const entry = map.get(row.decision_id) ?? {};
    entry[row.person as 'thiago' | 'bruna'] = { optionId: row.option_id, reason: row.reason, updatedAt: row.updated_at };
    map.set(row.decision_id, entry);
  }
  return map;
}

export async function savePosition(input: z.infer<typeof PositionInputSchema>) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, status: 503, message: 'Supabase não configurado.' };
  const { error } = await supabase.from('business_decision_positions').upsert(
    {
      decision_id: input.decisionId,
      person: input.person,
      option_id: input.optionId,
      reason: input.reason,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'decision_id,person' },
  );
  return error ? { ok: false as const, status: 500, message: error.message } : { ok: true as const };
}

export async function getMediations(): Promise<Map<string, Mediation & { createdAt: string }>> {
  const map = new Map<string, Mediation & { createdAt: string }>();
  const supabase = getSupabaseAdmin();
  if (!supabase) return map;
  const { data, error } = await supabase.from('business_decision_mediations').select('decision_id, result, created_at');
  if (error) {
    console.error('[jev] mediations read failed', error.message);
    return map;
  }
  for (const row of data ?? []) map.set(row.decision_id, { ...(row.result as Mediation), createdAt: row.created_at });
  return map;
}

export async function saveMediation(decisionId: string, mediation: Mediation) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase.from('business_decision_mediations').upsert(
    { decision_id: decisionId, result: mediation, model: mediation.model, created_at: new Date().toISOString() },
    { onConflict: 'decision_id' },
  );
  if (error) console.error('[jev] mediation save failed', error.message);
}

export async function getOrderTriage(): Promise<Map<string, OrderTriage & { createdAt: string }>> {
  const map = new Map<string, OrderTriage & { createdAt: string }>();
  const supabase = getSupabaseAdmin();
  if (!supabase) return map;
  const { data, error } = await supabase.from('farmz3d_order_triage').select('order_number, verdict, reasons, nouls, model, created_at');
  if (error) {
    console.error('[jev] triage read failed', error.message);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.order_number, { verdict: row.verdict, reasons: row.reasons ?? [], nouls: row.nouls, model: row.model, createdAt: row.created_at });
  }
  return map;
}

export async function saveOrderTriage(orderNumber: string, triage: OrderTriage) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase.from('farmz3d_order_triage').upsert(
    { order_number: orderNumber, verdict: triage.verdict, reasons: triage.reasons, nouls: triage.nouls, model: triage.model, created_at: new Date().toISOString() },
    { onConflict: 'order_number' },
  );
  if (error) console.error('[jev] triage save failed', error.message);
}
