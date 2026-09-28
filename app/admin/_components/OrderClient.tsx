'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, CreditCard, Loader2, Mail, MessageCircle, StickyNote } from 'lucide-react';
import { useDecider } from './AdminClient';

const input =
  'w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/60 placeholder:text-zinc-600';
const label = 'grid gap-1.5 text-xs font-semibold text-zinc-400';

async function send(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; url?: string };
  if (!response.ok || !data.ok) throw new Error(data.message ?? 'Falha ao salvar.');
  return data;
}

type EditableOrder = {
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment: 'pickup' | 'shipping';
  ship_line1: string | null;
  ship_line2: string | null;
  ship_city: string | null;
  ship_state: string | null;
  shipping_zip: string | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  internal_notes: string | null;
};

export function OrderEditor({
  order,
  statusLabels,
  paymentLabels,
}: {
  order: EditableOrder;
  statusLabels: Record<string, string>;
  paymentLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [actor] = useDecider();
  const [form, setForm] = useState({
    status: order.status,
    paymentStatus: order.payment_status,
    shipLine1: order.ship_line1 ?? '',
    shipLine2: order.ship_line2 ?? '',
    shipCity: order.ship_city ?? '',
    shipState: order.ship_state ?? '',
    shippingZip: order.shipping_zip ?? '',
    trackingCarrier: order.tracking_carrier ?? 'usps',
    trackingNumber: order.tracking_number ?? '',
    internalNotes: order.internal_notes ?? '',
  });
  const [state, setState] = useState<{ busy: boolean; error: string; saved: boolean }>({ busy: false, error: '', saved: false });
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function save() {
    setState({ busy: true, error: '', saved: false });
    try {
      await send(`/api/admin/orders/${order.order_number}`, 'PATCH', {
        ...form,
        trackingCarrier: form.trackingNumber ? form.trackingCarrier : null,
        author: actor,
      });
      setState({ busy: false, error: '', saved: true });
      router.refresh();
    } catch (error) {
      setState({ busy: false, error: error instanceof Error ? error.message : 'Falha', saved: false });
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          Status do pedido
          <select value={form.status} onChange={set('status')} className={input}>
            {Object.entries(statusLabels).map(([key, text]) => (
              <option key={key} value={key}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Pagamento
          <select value={form.paymentStatus} onChange={set('paymentStatus')} className={input}>
            {Object.entries(paymentLabels).map(([key, text]) => (
              <option key={key} value={key}>
                {text}
              </option>
            ))}
          </select>
        </label>
      </div>

      {order.fulfillment === 'shipping' && (
        <>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Endereço de envio</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${label} sm:col-span-2`}>
              Endereço
              <input value={form.shipLine1} onChange={set('shipLine1')} className={input} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Complemento
              <input value={form.shipLine2} onChange={set('shipLine2')} className={input} />
            </label>
            <label className={label}>
              Cidade
              <input value={form.shipCity} onChange={set('shipCity')} className={input} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>
                Estado
                <input value={form.shipState} onChange={set('shipState')} maxLength={2} className={`${input} uppercase`} />
              </label>
              <label className={label}>
                ZIP
                <input value={form.shippingZip} onChange={set('shippingZip')} className={input} />
              </label>
            </div>
          </div>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Rastreio</p>
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <label className={label}>
              Transportadora
              <select value={form.trackingCarrier} onChange={set('trackingCarrier')} className={input}>
                <option value="usps">USPS</option>
                <option value="ups">UPS</option>
                <option value="fedex">FedEx</option>
                <option value="other">Outra</option>
              </select>
            </label>
            <label className={label}>
              Código de rastreio
              <input value={form.trackingNumber} onChange={set('trackingNumber')} placeholder="9400 1000 0000 0000 0000 00" className={input} />
            </label>
          </div>
        </>
      )}

      <label className={label}>
        Notas internas (só vocês veem)
        <textarea value={form.internalNotes} onChange={set('internalNotes')} rows={3} className={input} placeholder="Cor do filamento, tempo de impressão, combinado com o cliente…" />
      </label>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={state.busy} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black disabled:opacity-50">
          {state.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar pedido
        </button>
        {state.saved && <span className="text-sm text-emerald-300">Salvo.</span>}
        {state.error && <span className="text-sm text-red-300">{state.error}</span>}
      </div>
    </div>
  );
}

type Template = { id: string; label: string; subject: string; body: string };

export function MessageComposer({
  orderNumber,
  customerEmail,
  whatsappDigits,
  templates,
  emailReady,
}: {
  orderNumber: string;
  customerEmail: string;
  whatsappDigits: string | null;
  templates: Template[];
  emailReady: boolean;
}) {
  const router = useRouter();
  const [actor] = useDecider();
  const [channel, setChannel] = useState<'email' | 'whatsapp' | 'note'>('email');
  const [subject, setSubject] = useState(`About your Farmz3D order ${orderNumber}`);
  const [body, setBody] = useState('');
  const [state, setState] = useState<{ busy: boolean; error: string; done: string }>({ busy: false, error: '', done: '' });

  function applyTemplate(template: Template) {
    setSubject(template.subject);
    setBody(template.body);
    setState({ busy: false, error: '', done: '' });
  }

  async function submit() {
    if (!body.trim()) {
      setState({ busy: false, error: 'Escreva a mensagem.', done: '' });
      return;
    }
    // Open WhatsApp synchronously (popup blockers), then record it.
    if (channel === 'whatsapp' && whatsappDigits) {
      window.open(`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
    }
    setState({ busy: true, error: '', done: '' });
    try {
      await send(`/api/admin/orders/${orderNumber}/messages`, 'POST', { channel, subject, body, author: actor });
      setBody('');
      setState({
        busy: false,
        error: '',
        done: channel === 'email' ? `Email enviado para ${customerEmail}.` : channel === 'whatsapp' ? 'WhatsApp aberto e registrado.' : 'Nota salva.',
      });
      router.refresh();
    } catch (error) {
      setState({ busy: false, error: error instanceof Error ? error.message : 'Falha', done: '' });
    }
  }

  const tabs = [
    { id: 'email' as const, label: 'Email', icon: Mail, disabled: !emailReady },
    { id: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle, disabled: !whatsappDigits },
    { id: 'note' as const, label: 'Nota interna', icon: StickyNote, disabled: false },
  ];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label: text, icon: Icon, disabled }) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => setChannel(id)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold disabled:opacity-30 ${
              channel === id ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" /> {text}
          </button>
        ))}
      </div>

      {channel !== 'note' && (
        <div className="flex flex-wrap gap-1.5">
          <span className="self-center text-xs text-zinc-500">Modelos:</span>
          {templates.map((template) => (
            <button key={template.id} type="button" onClick={() => applyTemplate(template)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 hover:border-cyan-300/50 hover:text-white">
              {template.label}
            </button>
          ))}
        </div>
      )}

      {channel === 'email' && (
        <input value={subject} onChange={(event) => setSubject(event.target.value)} className={input} placeholder="Assunto" aria-label="Assunto" />
      )}
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={7}
        className={input}
        placeholder={channel === 'note' ? 'Anotação interna sobre o pedido…' : 'Escreva para o cliente (em inglês)…'}
        aria-label="Mensagem"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={submit} disabled={state.busy} className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-black disabled:opacity-50">
          {state.busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {channel === 'email' ? `Enviar email para ${customerEmail}` : channel === 'whatsapp' ? 'Abrir no WhatsApp' : 'Salvar nota'}
        </button>
        {state.done && <span className="text-sm text-emerald-300">{state.done}</span>}
        {state.error && <span className="text-sm text-red-300">{state.error}</span>}
      </div>
      {channel === 'email' && <p className="text-xs text-zinc-500">As respostas do cliente chegam no email da loja (Gmail) — use “Abrir conversa no Gmail”.</p>}
    </div>
  );
}

export function PaymentLinkBox({ orderNumber, paymentUrl, stripeReady, paid }: { orderNumber: string; paymentUrl: string | null; stripeReady: boolean; paid: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; error: string; copied: boolean }>({ busy: false, error: '', copied: false });

  async function create() {
    setState({ busy: true, error: '', copied: false });
    try {
      await send(`/api/admin/orders/${orderNumber}/payment-link`, 'POST', {});
      setState({ busy: false, error: '', copied: false });
      router.refresh();
    } catch (error) {
      setState({ busy: false, error: error instanceof Error ? error.message : 'Falha', copied: false });
    }
  }

  async function copy() {
    if (!paymentUrl) return;
    await navigator.clipboard.writeText(paymentUrl).catch(() => undefined);
    setState((current) => ({ ...current, copied: true }));
  }

  if (paid) return <p className="text-sm text-emerald-300">Pagamento recebido ✓</p>;

  return (
    <div className="grid gap-2">
      {paymentUrl && (
        <div className="flex items-center gap-2">
          <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="truncate text-sm text-cyan-300 underline">
            {paymentUrl}
          </a>
          <button type="button" onClick={copy} className="rounded-full bg-white/5 p-2 text-zinc-300 hover:text-white" aria-label="Copiar link">
            {state.copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={create}
        disabled={!stripeReady || state.busy}
        className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-40"
      >
        {state.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        {paymentUrl ? 'Gerar novo link Stripe' : 'Gerar link de pagamento (Stripe)'}
      </button>
      {!stripeReady && <p className="text-xs text-zinc-500">Stripe ainda não conectado (falta STRIPE_SECRET_KEY no Dokploy). Marque “Pago” manualmente quando receber (Zelle, Venmo, dinheiro).</p>}
      {paymentUrl && <p className="text-xs text-zinc-500">Dica: use o modelo “Confirmar + pagamento” no email — ele já inclui este link.</p>}
      {state.error && <p className="text-sm text-red-300">{state.error}</p>}
    </div>
  );
}
