import { getSupabaseAdmin } from '@/lib/supabase';
import { DECISIONS, getDecision } from './registry';
import type { Decision, DecisionApproval, DecisionOption, DecisionState } from './schema';

type DecisionRow = {
  decision_id: string;
  option_id: string;
  decided_by: string;
  decided_at: string;
  note: string | null;
};

export async function getDecisionStates(): Promise<Map<string, DecisionState>> {
  const states = new Map<string, DecisionState>();
  const supabase = getSupabaseAdmin();
  if (!supabase) return states;

  const { data, error } = await supabase.from('business_decisions').select('decision_id, option_id, decided_by, decided_at, note');
  if (error) {
    console.error('[decisions] read failed', error.message);
    return states;
  }

  for (const row of (data ?? []) as DecisionRow[]) {
    states.set(row.decision_id, {
      optionId: row.option_id,
      decidedBy: row.decided_by,
      decidedAt: row.decided_at,
      note: row.note,
    });
  }
  return states;
}

export type ResolvedDecision = {
  decision: Decision;
  option: DecisionOption;
  approved: DecisionState | null;
};

// Approved option when there is a valid approval; otherwise the recommendation.
export function resolveDecision(decision: Decision, states: Map<string, DecisionState>): ResolvedDecision {
  const state = states.get(decision.id);
  const approvedOption = state ? decision.options.find((option) => option.id === state.optionId) : undefined;
  const option = approvedOption ?? decision.options.find((item) => item.id === decision.recommendedOptionId)!;
  return { decision, option, approved: approvedOption && state ? state : null };
}

export async function getResolvedDecisions() {
  const states = await getDecisionStates();
  return DECISIONS.map((decision) => resolveDecision(decision, states));
}

export async function getResolvedNumbers(): Promise<Map<string, number>> {
  const numbers = new Map<string, number>();
  for (const { decision, option } of await getResolvedDecisions()) {
    if (typeof option.value === 'number') numbers.set(decision.id, option.value);
  }
  return numbers;
}

export async function approveDecision(input: DecisionApproval) {
  const decision = getDecision(input.decisionId);
  if (!decision) return { ok: false as const, status: 404, message: 'Decisão não encontrada.' };
  if (!decision.options.some((option) => option.id === input.optionId)) {
    return { ok: false as const, status: 400, message: 'Opção inválida para esta decisão.' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, status: 503, message: 'Supabase não configurado.' };

  const decidedAt = new Date().toISOString();
  const { error } = await supabase.from('business_decisions').upsert(
    {
      decision_id: decision.id,
      option_id: input.optionId,
      decided_by: input.decidedBy,
      note: input.note || null,
      decided_at: decidedAt,
    },
    { onConflict: 'decision_id' },
  );
  if (error) return { ok: false as const, status: 500, message: error.message };

  const { error: logError } = await supabase.from('business_decision_log').insert({
    decision_id: decision.id,
    option_id: input.optionId,
    decided_by: input.decidedBy,
    note: input.note || null,
  });
  if (logError) console.error('[decisions] history insert failed', logError.message);

  return { ok: true as const, decidedAt };
}

export async function resetDecision(decisionId: string) {
  if (!getDecision(decisionId)) return { ok: false as const, status: 404, message: 'Decisão não encontrada.' };
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, status: 503, message: 'Supabase não configurado.' };
  const { error } = await supabase.from('business_decisions').delete().eq('decision_id', decisionId);
  return error ? { ok: false as const, status: 500, message: error.message } : { ok: true as const };
}
