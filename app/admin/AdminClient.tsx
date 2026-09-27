'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, CheckCircle2, ExternalLink, Handshake, Loader2, RotateCcw, Sparkles } from 'lucide-react';

export type DecisionView = {
  id: string;
  group: string;
  title: string;
  question: string;
  owner: 'thiago' | 'bruna' | 'both';
  unitCostCents: number | null;
  options: { id: string; label: string; display: string; value: number | string; rationale: string; recommended: boolean }[];
  evidence: { label: string; value: string; sourceUrl?: string }[];
  activeOptionId: string;
  approved: { by: string; at: string; note: string | null } | null;
  unit: 'usd_cents' | 'days' | 'text';
  positions: Partial<Record<'thiago' | 'bruna', { optionId: string; reason: string; updatedAt: string }>>;
  mediation: {
    suggestedOptionId: string;
    strength: 'strong' | 'moderate' | 'none';
    choice: { optionId: string; confidence: number };
    fairness: Record<string, { thiago: number; bruna: number; both: number }>;
    conflict: number;
    model: string;
    createdAt: string;
  } | null;
};

const pct = (value: number) => `${Math.round(value * 100)}%`;

type Decider = 'thiago' | 'bruna';

const OWNER_LABEL = { thiago: 'Thiago', bruna: 'Bruna', both: 'Thiago + Bruna' } as const;

function formatWhen(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/New_York' }).format(new Date(value));
}

function margin(priceCents: number, costCents: number) {
  if (priceCents <= 0) return null;
  return Math.round(((priceCents - costCents) / priceCents) * 100);
}

export function DeciderSwitch() {
  const [decider, setDecider] = useDecider();
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1 text-sm">
      {(['thiago', 'bruna'] as const).map((person) => (
        <button
          key={person}
          type="button"
          onClick={() => setDecider(person)}
          className={`rounded-full px-4 py-1.5 font-semibold transition ${decider === person ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
        >
          Decidindo como {OWNER_LABEL[person]}
        </button>
      ))}
    </div>
  );
}

const DECIDER_KEY = 'farmz3d-decider';
const DECIDER_EVENT = 'farmz3d-decider';

function readDecider(): Decider {
  try {
    return window.localStorage.getItem(DECIDER_KEY) === 'bruna' ? 'bruna' : 'thiago';
  } catch {
    return 'thiago';
  }
}

function subscribeDecider(onChange: () => void) {
  window.addEventListener(DECIDER_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(DECIDER_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

// Who is approving on this device (remembered per browser).
function useDecider(): [Decider, (value: Decider) => void] {
  const decider = useSyncExternalStore(subscribeDecider, readDecider, () => 'thiago' as Decider);

  function setDecider(value: Decider) {
    try {
      window.localStorage.setItem(DECIDER_KEY, value);
    } catch {
      // storage unavailable: the choice lasts only for this page view
    }
    window.dispatchEvent(new Event(DECIDER_EVENT));
  }

  return [decider, setDecider];
}

export function DecisionCard({ decision, canWrite, jevEnabled }: { decision: DecisionView; canWrite: boolean; jevEnabled: boolean }) {
  const router = useRouter();
  const [decider] = useDecider();
  const [selected, setSelected] = useState(decision.activeOptionId);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [jevBusy, setJevBusy] = useState(false);

  async function call(url: string, method: string, payload: unknown) {
    const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    if (!response.ok || !data.ok) throw new Error(data.message ?? 'Falha ao salvar.');
  }

  async function savePosition() {
    setBusy(true);
    setError('');
    try {
      await call('/api/admin/positions', 'POST', { decisionId: decision.id, person: decider, optionId: selected, reason: note });
      setNote('');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao salvar.');
    } finally {
      setBusy(false);
    }
  }

  async function askJev() {
    setJevBusy(true);
    setError('');
    try {
      await call('/api/admin/mediate', 'POST', { decisionId: decision.id });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha no Jev.');
    } finally {
      setJevBusy(false);
    }
  }

  const optionLabel = (id: string) => {
    const option = decision.options.find((item) => item.id === id);
    return option ? `${option.display} · ${option.label}` : id;
  };
  const { thiago, bruna } = decision.positions;
  const bothPositions = Boolean(thiago && bruna);
  const agree = bothPositions && thiago!.optionId === bruna!.optionId;
  const latestPosition = [thiago?.updatedAt, bruna?.updatedAt].filter(Boolean).sort().at(-1);
  const mediationStale = Boolean(decision.mediation && latestPosition && latestPosition > decision.mediation.createdAt);

  async function send(method: 'POST' | 'DELETE') {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/decisions', {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(method === 'POST' ? { decisionId: decision.id, optionId: selected, decidedBy: decider, note } : { decisionId: decision.id }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.message ?? 'Falha ao salvar.');
      setNote('');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao salvar.');
    } finally {
      setBusy(false);
    }
  }

  const changed = selected !== decision.activeOptionId || !decision.approved;

  return (
    <article id={decision.id} className="scroll-mt-24 rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">{decision.title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{decision.question}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-300">Dono: {OWNER_LABEL[decision.owner]}</span>
          {decision.approved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> Aprovado por {decision.approved.by === 'bruna' ? 'Bruna' : 'Thiago'} · {formatWhen(decision.approved.at)}
            </span>
          ) : (
            <span className="rounded-full bg-amber-400/15 px-3 py-1 text-amber-200">Pendente — site usa a recomendação</span>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Mercado hoje (fontes)</p>
          <ul className="mt-3 grid gap-2 text-sm">
            {decision.evidence.map((item) => (
              <li key={`${item.label}-${item.value}`} className="flex items-start justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                <span className="text-zinc-400">{item.label}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-right font-semibold text-zinc-100">
                  {item.value}
                  {item.sourceUrl && (
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200" aria-label="Fonte">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </span>
              </li>
            ))}
            {decision.unitCostCents !== null && (
              <li className="flex justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                <span className="text-zinc-400">Custo estimado (só material; sem mão de obra, embalagem e taxas)</span>
                <span className="font-semibold text-zinc-100">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(decision.unitCostCents / 100)}
                </span>
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Opções</p>
          <div className="mt-3 grid gap-2">
            {decision.options.map((option) => {
              const optionMargin =
                decision.unit === 'usd_cents' && typeof option.value === 'number' && decision.unitCostCents !== null
                  ? margin(option.value, decision.unitCostCents)
                  : null;
              return (
                <label
                  key={option.id}
                  className={`cursor-pointer rounded-2xl border p-3 transition ${
                    selected === option.id ? 'border-cyan-300/60 bg-cyan-300/10' : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <input type="radio" name={decision.id} value={option.id} checked={selected === option.id} onChange={() => setSelected(option.id)} className="sr-only" />
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-black text-white">{option.display}</span>
                    <span className="text-sm text-zinc-300">{option.label}</span>
                    {option.recommended && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-300/15 px-2 py-0.5 text-[11px] font-bold text-cyan-200">
                        <Sparkles className="h-3 w-3" /> Recomendado
                      </span>
                    )}
                    {optionMargin !== null && <span className="text-xs text-zinc-500">margem sobre o custo listado ~{optionMargin}%</span>}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-400">{option.rationale}</span>
                </label>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
              <Handshake className="h-3.5 w-3.5" /> Posições
            </p>
            {(['thiago', 'bruna'] as const).map((person) => {
              const position = decision.positions[person];
              return (
                <p key={person} className="mt-2 text-zinc-300">
                  <strong className="text-white">{OWNER_LABEL[person]}:</strong>{' '}
                  {position ? (
                    <>
                      {optionLabel(position.optionId)} <span className="text-zinc-500">— “{position.reason}”</span>
                    </>
                  ) : (
                    <span className="text-zinc-500">ainda não registrou</span>
                  )}
                </p>
              );
            })}
            {agree && <p className="mt-2 font-semibold text-emerald-300">Vocês concordam — é só aprovar.</p>}
            {bothPositions && !agree && (
              <div className="mt-3 border-t border-white/10 pt-3">
                {decision.mediation && (
                  <div className="mb-3">
                    <p className="flex flex-wrap items-center gap-2">
                      <Bot className="h-4 w-4 text-fuchsia-300" />
                      <span className="text-zinc-400">Jev sugere:</span>
                      <strong className="text-white">{optionLabel(decision.mediation.suggestedOptionId)}</strong>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          decision.mediation.strength === 'strong'
                            ? 'bg-emerald-400/15 text-emerald-200'
                            : decision.mediation.strength === 'moderate'
                              ? 'bg-amber-400/15 text-amber-200'
                              : 'bg-red-400/15 text-red-200'
                        }`}
                      >
                        {decision.mediation.strength === 'strong'
                          ? 'Denominador comum forte'
                          : decision.mediation.strength === 'moderate'
                            ? 'Sugestão moderada — conversem'
                            : 'Nenhuma opção atende os dois — conversem'}
                      </span>
                    </p>
                    <ul className="mt-2 grid gap-1 text-xs text-zinc-400">
                      {decision.options.map((option) => {
                        const fit = decision.mediation!.fairness[option.id];
                        if (!fit) return null;
                        return (
                          <li key={option.id} className="grid grid-cols-[1fr_auto] items-center gap-2">
                            <span>
                              {option.display} · atende Thiago {pct(fit.thiago)} · Bruna {pct(fit.bruna)}
                            </span>
                            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                              <span className="block h-full bg-fuchsia-300" style={{ width: pct(fit.both) }} />
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-2 text-xs text-zinc-500">
                      Escolha direta do Jev: {optionLabel(decision.mediation.choice.optionId)} (confiança {pct(decision.mediation.choice.confidence)}) ·
                      conflito entre os motivos {pct(decision.mediation.conflict)} · {decision.mediation.model}
                    </p>
                    {mediationStale && <p className="mt-1 text-xs text-amber-300">As posições mudaram depois desta análise — rode de novo.</p>}
                    <button
                      type="button"
                      onClick={() => setSelected(decision.mediation!.suggestedOptionId)}
                      className="mt-2 text-xs font-semibold text-fuchsia-200 underline"
                    >
                      Selecionar a sugestão (ainda precisa aprovar)
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  disabled={!jevEnabled || jevBusy}
                  onClick={askJev}
                  className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/40 px-4 py-2 text-xs font-bold text-fuchsia-100 hover:bg-fuchsia-300/10 disabled:opacity-40"
                >
                  {jevBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                  {decision.mediation ? 'Rodar o Jev de novo' : 'Jev: encontrar o denominador comum'}
                </button>
                {!jevEnabled && <p className="mt-1 text-xs text-zinc-500">Configure TYPESAFE_API_KEY para usar o Jev.</p>}
              </div>
            )}
          </div>

          {canWrite ? (
            <div className="mt-3 grid gap-2">
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                placeholder="Motivo / comentário — por que esta opção?"
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !changed}
                  onClick={() => send('POST')}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-cyan-100 disabled:opacity-40"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Aprovar como {decider === 'bruna' ? 'Bruna' : 'Thiago'}
                </button>
                <button
                  type="button"
                  disabled={busy || note.trim().length < 3}
                  onClick={savePosition}
                  title="Registra sua preferência e o motivo, sem mudar o site"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-200 hover:text-white disabled:opacity-40"
                >
                  <Handshake className="h-3.5 w-3.5" /> Registrar minha posição
                </button>
                {decision.approved && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => send('DELETE')}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Desfazer
                  </button>
                )}
              </div>
              {decision.approved?.note && <p className="text-xs text-zinc-500">Última nota: “{decision.approved.note}”</p>}
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            </div>
          ) : (
            <p className="mt-3 text-xs text-amber-200">Configure o Supabase para salvar aprovações.</p>
          )}
        </div>
      </div>
    </article>
  );
}

const STATUS_LABEL: Record<string, string> = {
  new: 'Novo',
  confirmed: 'Confirmado',
  printing: 'Imprimindo',
  shipped: 'Enviado',
  picked_up: 'Retirado',
  cancelled: 'Cancelado',
};

export function OrderStatusSelect({ orderNumber, status }: { orderNumber: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function change(next: string) {
    const previous = value;
    setValue(next);
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderNumber, status: next }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.message ?? 'Falha ao salvar.');
      router.refresh();
    } catch (caught) {
      setValue(previous);
      setError(caught instanceof Error ? caught.message : 'Falha');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <select
        value={value}
        disabled={busy}
        onChange={(event) => change(event.target.value)}
        aria-label={`Status do pedido ${orderNumber}`}
        className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs font-semibold text-white"
      >
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-300">{error}</span>}
    </span>
  );
}

const VERDICT = {
  ready: { label: 'Pronto para produzir', className: 'bg-emerald-400/15 text-emerald-200' },
  check: { label: 'Conferir detalhes', className: 'bg-amber-400/15 text-amber-200' },
  ask_details: { label: 'Pedir detalhes ao cliente', className: 'bg-orange-400/15 text-orange-200' },
  review: { label: 'Revisar antes (risco)', className: 'bg-red-400/15 text-red-200' },
} as const;

export function OrderTriageCell({
  orderNumber,
  triage,
  jevEnabled,
}: {
  orderNumber: string;
  triage: { verdict: keyof typeof VERDICT; reasons: string[] } | null;
  jevEnabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/triage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderNumber }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.message ?? 'Falha no Jev.');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha no Jev.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-1">
      {triage ? (
        <>
          <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${VERDICT[triage.verdict].className}`}>{VERDICT[triage.verdict].label}</span>
          {triage.reasons.map((reason) => (
            <span key={reason} className="text-[11px] text-zinc-400">{reason}</span>
          ))}
        </>
      ) : (
        <span className="text-[11px] text-zinc-500">Sem análise do Jev</span>
      )}
      {jevEnabled && (
        <button type="button" onClick={run} disabled={busy} className="inline-flex w-fit items-center gap-1 text-[11px] font-semibold text-fuchsia-200 underline disabled:opacity-40">
          {busy && <Loader2 className="h-3 w-3 animate-spin" />} {triage ? 'Reanalisar' : 'Analisar com Jev'}
        </button>
      )}
      {error && <span className="text-[11px] text-red-300">{error}</span>}
    </div>
  );
}
