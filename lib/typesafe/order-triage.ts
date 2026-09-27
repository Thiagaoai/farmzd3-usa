import type { Product } from '@/lib/farmz3d/catalog';
import { systemOne, type NoulQuestion } from './client.ts';

// Production-readiness check for a Farmz3D order. Jev answers narrow yes/no questions
// about the personalization text; code composes them into a verdict. Thresholds are
// conservative starting points — tune them on real orders.

export const TRIAGE_THRESHOLDS = {
  flag: 0.5, // licensed IP / inappropriate content: review at >= 0.5
  detailsReady: 0.8, // complete details: ready at >= 0.8
  detailsMissing: 0.5, // complete details: ask the customer below 0.5
  rush: 0.6,
} as const;

export type TriageVerdict = 'ready' | 'check' | 'ask_details' | 'review';

export type OrderTriage = {
  verdict: TriageVerdict;
  reasons: string[];
  nouls: { has_required_details: number; licensed_ip: number; inappropriate: number; rush_request: number };
  model: string;
};

export function buildTriageQuestions() {
  return {
    has_required_details: {
      type: 'noul',
      instructions: {
        question: 'Does `order.personalization` give every detail listed in `product.required_details`?',
        focus: 'Check each listed detail. Details that `product.required_details` says are attached or sent later (email/WhatsApp) are not required in the text.',
      },
      criteria: {
        true: {
          what: 'Every required detail is present and readable',
          examples: ['Required: a name, a year and a shape. Given: "Emma, 2026, star"'],
        },
        false: {
          what: 'At least one required detail is absent, contradictory, or unreadable',
          examples: ['Required: a name, a year and a shape. Given: "Emma"'],
        },
      },
    },
    licensed_ip: {
      type: 'noul',
      instructions: {
        question: 'Do `order.personalization` or `order.notes` ask to reproduce a trademarked or copyrighted character, logo, or brand owned by someone else?',
        examples_of_protected: ['Disney or Pixar characters', 'Marvel heroes', 'Pokémon', 'NFL or MLB team logos'],
      },
      criteria: {
        true: 'Asks for a character, logo, or brand owned by a company or team',
        false: {
          what: 'Only names, dates, generic shapes, or the customer’s own business name/logo',
          examples: ['"Emma, pumpkin shape"', '"Roberts Landscape logo" for the business stand'],
        },
      },
    },
    inappropriate: {
      type: 'noul',
      instructions: 'Does `order.personalization` or `order.notes` contain profanity, slurs, sexual content, threats, or harassment?',
      criteria: {
        true: 'Contains profanity, slurs, sexual content, threats, or harassment',
        false: 'Ordinary names, dates, and gift messages',
      },
    },
    rush_request: {
      type: 'noul',
      instructions: 'Do `order.notes` ask for faster production or delivery than normal?',
      criteria: {
        true: { what: 'Explicitly asks to hurry', examples: ['"Need it by Friday, rush please"', '"ASAP"'] },
        false: 'No request about speed, or no notes',
      },
    },
  } satisfies Record<string, NoulQuestion>;
}

export function composeTriage(nouls: OrderTriage['nouls']): { verdict: TriageVerdict; reasons: string[] } {
  const t = TRIAGE_THRESHOLDS;
  const reasons: string[] = [];
  if (nouls.licensed_ip >= t.flag) reasons.push('Pede personagem/marca de terceiros — risco de direitos autorais');
  if (nouls.inappropriate >= t.flag) reasons.push('Texto possivelmente ofensivo');
  if (nouls.rush_request >= t.rush) reasons.push('Cliente pediu urgência');

  if (nouls.licensed_ip >= t.flag || nouls.inappropriate >= t.flag) return { verdict: 'review', reasons };
  if (nouls.has_required_details < t.detailsMissing) {
    return { verdict: 'ask_details', reasons: ['Faltam detalhes para produzir', ...reasons] };
  }
  if (nouls.has_required_details < t.detailsReady) {
    return { verdict: 'check', reasons: ['Detalhes incertos — confira antes de imprimir', ...reasons] };
  }
  return { verdict: 'ready', reasons };
}

export async function triageOrder(
  product: Pick<Product, 'name' | 'requiredDetails'>,
  order: { personalization: string; notes?: string | null },
): Promise<{ ok: true; triage: OrderTriage } | { ok: false; error: string }> {
  // Only the fields the questions need — no customer contact data.
  const state = {
    product: { name: product.name, required_details: product.requiredDetails },
    order: { personalization: order.personalization, notes: order.notes || '' },
  };

  const result = await systemOne(state, buildTriageQuestions(), { timeoutMs: 6000 });
  if (!result.ok) return { ok: false, error: result.error };

  const nouls = {
    has_required_details: result.answers.has_required_details.noul,
    licensed_ip: result.answers.licensed_ip.noul,
    inappropriate: result.answers.inappropriate.noul,
    rush_request: result.answers.rush_request.noul,
  };
  return { ok: true, triage: { ...composeTriage(nouls), nouls, model: result.model } };
}
