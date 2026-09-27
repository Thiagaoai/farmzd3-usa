import { z } from 'zod';

// A business decision the team agrees on in the admin panel. Every option carries a
// typed value; the site reads the approved option (or the recommendation while pending).

export const DecisionUnitSchema = z.enum(['usd_cents', 'days', 'text']);
export type DecisionUnit = z.infer<typeof DecisionUnitSchema>;

export const EvidenceSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  sourceUrl: z.url().optional(),
});

export const DecisionOptionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  value: z.union([z.number().int().nonnegative(), z.string().min(1)]),
  rationale: z.string().min(1),
});

export const DecisionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9:-]+$/),
    group: z.enum(['farmz3d-pricing', 'operations']),
    title: z.string().min(1),
    question: z.string().min(1),
    owner: z.enum(['thiago', 'bruna', 'both']),
    unit: DecisionUnitSchema,
    unitCostCents: z.number().int().nonnegative().optional(),
    options: z.array(DecisionOptionSchema).min(2),
    recommendedOptionId: z.string(),
    evidence: z.array(EvidenceSchema).min(1),
  })
  .superRefine((decision, ctx) => {
    const ids = decision.options.map((option) => option.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: `${decision.id}: duplicate option ids` });
    }
    if (!ids.includes(decision.recommendedOptionId)) {
      ctx.addIssue({ code: 'custom', message: `${decision.id}: recommendedOptionId is not an option` });
    }
    for (const option of decision.options) {
      const numeric = typeof option.value === 'number';
      if ((decision.unit === 'text') === numeric) {
        ctx.addIssue({ code: 'custom', message: `${decision.id}/${option.id}: value does not match unit ${decision.unit}` });
      }
    }
  });

export type Decision = z.infer<typeof DecisionSchema>;
export type DecisionOption = z.infer<typeof DecisionOptionSchema>;

export const DecisionApprovalSchema = z.object({
  decisionId: z.string().min(1).max(120),
  optionId: z.string().min(1).max(60),
  decidedBy: z.enum(['thiago', 'bruna']),
  note: z.string().trim().max(500).optional(),
});

export type DecisionApproval = z.infer<typeof DecisionApprovalSchema>;

export type DecisionState = {
  optionId: string;
  decidedBy: string;
  decidedAt: string;
  note: string | null;
};

export function formatDecisionValue(unit: DecisionUnit, value: number | string) {
  if (unit === 'usd_cents' && typeof value === 'number') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
  }
  if (unit === 'days' && typeof value === 'number') return `${value} dias`;
  return String(value);
}
