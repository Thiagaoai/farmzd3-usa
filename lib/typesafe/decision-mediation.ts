import type { Decision } from '@/lib/decisions/schema';
import { systemOne, type ChoiceQuestion, type NoulQuestion } from './client.ts';

// "Denominador comum": Thiago and Bruna each state a preferred option and a reason.
// Jev judges, per option, whether it satisfies each partner's stated priority (Nouls) and
// which option best serves both (Choice). Code picks the fairest option — the one whose
// less-satisfied partner is best served (max of the min) — and gates on confidence.
// Prices and margins stay in code: options reach Jev as text plus a named margin bucket.

export type PartnerPosition = { optionId: string; reason: string };

export type Mediation = {
  suggestedOptionId: string;
  strength: 'strong' | 'moderate' | 'none';
  choice: { optionId: string; probabilities: Record<string, number>; confidence: number };
  fairness: Record<string, { thiago: number; bruna: number; both: number }>;
  conflict: number;
  model: string;
};

export const MEDIATION_THRESHOLDS = { satisfied: 0.5, choiceConfidence: 0.6 } as const;

function marginBucket(decision: Decision, value: number | string) {
  if (decision.unit !== 'usd_cents' || typeof value !== 'number' || decision.unitCostCents === undefined || value <= 0) {
    return 'not applicable';
  }
  const margin = (value - decision.unitCostCents) / value;
  if (margin >= 0.7) return 'high margin';
  if (margin >= 0.4) return 'medium margin';
  return 'low margin';
}

export function buildMediationRequest(
  decision: Decision,
  positions: { thiago: PartnerPosition; bruna: PartnerPosition },
) {
  const optionText = (id: string) => {
    const option = decision.options.find((item) => item.id === id)!;
    return { label: option.label, rationale: option.rationale, margin: marginBucket(decision, option.value) };
  };

  const state = {
    decision: decision.question,
    partners: {
      thiago: { prefers: optionText(positions.thiago.optionId).label, reason: positions.thiago.reason },
      bruna: { prefers: optionText(positions.bruna.optionId).label, reason: positions.bruna.reason },
    },
  };

  const questions: Record<string, NoulQuestion | ChoiceQuestion> = {
    common_ground: {
      type: 'choice',
      instructions: {
        question: 'Which option best satisfies the reasons in `partners.thiago.reason` and `partners.bruna.reason` at the same time?',
        focus: 'Give both partners equal weight. Judge each option by its rationale, not by who proposed it.',
      },
      criteria: Object.fromEntries(decision.options.map((option) => [option.id, optionText(option.id)])),
    },
    conflict: {
      type: 'noul',
      instructions: 'Do `partners.thiago.reason` and `partners.bruna.reason` state priorities that pull in opposite directions?',
      criteria: {
        true: 'Satisfying one partner’s stated priority works against the other’s',
        false: 'The two reasons are compatible or point the same way',
      },
    },
  };

  for (const option of decision.options) {
    for (const person of ['thiago', 'bruna'] as const) {
      questions[`fits_${person}__${option.id}`] = {
        type: 'noul',
        instructions: {
          option: optionText(option.id),
          question: `Does \`option\` satisfy the priority stated in \`partners.${person}.reason\`?`,
        },
        criteria: {
          true: `Choosing \`option\` would achieve what \`partners.${person}.reason\` asks for`,
          false: `Choosing \`option\` would work against or ignore \`partners.${person}.reason\``,
        },
      };
    }
  }

  return { state, questions };
}

export function composeMediation(
  decision: Decision,
  answers: Record<string, { type: string; noul?: number; choice?: string; probabilities?: Record<string, number>; confidence?: number }>,
  model: string,
): Mediation {
  const fairness: Mediation['fairness'] = {};
  for (const option of decision.options) {
    const thiago = answers[`fits_thiago__${option.id}`].noul ?? 0;
    const bruna = answers[`fits_bruna__${option.id}`].noul ?? 0;
    fairness[option.id] = { thiago, bruna, both: Math.min(thiago, bruna) };
  }

  const fairest = decision.options.map((option) => option.id).sort((a, b) => fairness[b].both - fairness[a].both)[0];
  const choice = answers.common_ground;
  const choiceId = choice.choice!;
  const confidence = choice.confidence ?? 0;

  let strength: Mediation['strength'] = 'none';
  if (fairness[fairest].both >= MEDIATION_THRESHOLDS.satisfied) {
    strength = choiceId === fairest && confidence >= MEDIATION_THRESHOLDS.choiceConfidence ? 'strong' : 'moderate';
  }

  return {
    suggestedOptionId: fairest,
    strength,
    choice: { optionId: choiceId, probabilities: choice.probabilities ?? {}, confidence },
    fairness,
    conflict: answers.conflict.noul ?? 0,
    model,
  };
}

export async function mediateDecision(decision: Decision, positions: { thiago: PartnerPosition; bruna: PartnerPosition }) {
  const { state, questions } = buildMediationRequest(decision, positions);
  const result = await systemOne(state, questions, { timeoutMs: 8000 });
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, mediation: composeMediation(decision, result.answers, result.model) };
}
