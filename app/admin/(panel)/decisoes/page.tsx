import { DECISION_GROUPS } from '@/lib/decisions/registry';
import { formatDecisionValue } from '@/lib/decisions/schema';
import { getResolvedDecisions } from '@/lib/decisions/store';
import { getDecisionHistory } from '@/lib/farmz3d/admin-data';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isTypeSafeConfigured } from '@/lib/typesafe/client';
import { getMediations, getPositions } from '@/lib/typesafe/store';
import { DecisionCard, DeciderSwitch, type DecisionView } from '../../_components/AdminClient';
import { formatWhen, PageHeader } from '../../_components/ui';

export default async function DecisionsPage() {
  const [resolved, history, positions, mediations] = await Promise.all([
    getResolvedDecisions(),
    getDecisionHistory(),
    getPositions(),
    getMediations(),
  ]);
  const configured = Boolean(getSupabaseAdmin());
  const jevEnabled = isTypeSafeConfigured() && configured;

  const decisions: DecisionView[] = resolved.map(({ decision, option, approved }) => ({
    id: decision.id,
    group: decision.group,
    title: decision.title,
    question: decision.question,
    owner: decision.owner,
    unit: decision.unit,
    unitCostCents: decision.unitCostCents ?? null,
    evidence: decision.evidence,
    activeOptionId: option.id,
    approved: approved ? { by: approved.decidedBy, at: approved.decidedAt, note: approved.note } : null,
    positions: positions.get(decision.id) ?? {},
    mediation: mediations.get(decision.id) ?? null,
    options: decision.options.map((item) => ({
      id: item.id,
      label: item.label,
      value: item.value,
      display: formatDecisionValue(decision.unit, item.value),
      rationale: item.rationale,
      recommended: item.id === decision.recommendedOptionId,
    })),
  }));

  const decisionTitles = new Map(decisions.map((decision) => [decision.id, decision]));

  return (
    <div>
      <PageHeader
        title="Preços e decisões"
        subtitle="Preço de mercado com fonte para cada produto e para a operação. Aprovar muda o site na hora (se o produto não tiver preço manual no cadastro)."
      />
      {!configured && (
        <p className="mb-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
          Supabase não configurado: as decisões aparecem com a recomendação, mas não é possível salvar aprovações.
        </p>
      )}
        <section id="decisoes">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="max-w-2xl text-sm text-zinc-400">Enquanto uma decisão estiver pendente, o site usa a opção recomendada.</p>
            </div>
            <DeciderSwitch />
          </div>

          {DECISION_GROUPS.map((group) => {
            const items = decisions.filter((decision) => decision.group === group.id);
            if (!items.length) return null;
            return (
              <div key={group.id} className="mt-8">
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-zinc-500">{group.title}</h3>
                <div className="mt-4 grid gap-4">
                  {items.map((decision) => (
                    <DecisionCard key={decision.id} decision={decision} canWrite={configured} jevEnabled={jevEnabled} />
                  ))}
                </div>
              </div>
            );
          })}

          {history.length > 0 && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
              <h3 className="font-semibold">Histórico de decisões</h3>
              <ul className="mt-3 grid gap-2 text-sm text-zinc-400">
                {history.map((entry) => {
                  const decision = decisionTitles.get(entry.decision_id);
                  const option = decision?.options.find((item) => item.id === entry.option_id);
                  return (
                    <li key={`${entry.decision_id}-${entry.created_at}`}>
                      <span className="text-zinc-500">{formatWhen(entry.created_at)}</span> · {entry.decided_by === 'bruna' ? 'Bruna' : 'Thiago'} escolheu{' '}
                      <strong className="text-zinc-200">{option?.display ?? entry.option_id}</strong> em {decision?.title ?? entry.decision_id}
                      {entry.note && <> — “{entry.note}”</>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
    </div>
  );
}
