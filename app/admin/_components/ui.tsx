import type { ReactNode } from 'react';
import { PAYMENT_LABELS, STATUS_LABELS, type OrderStatus, type PaymentStatus } from '@/lib/farmz3d/admin-data';

export function formatWhen(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/New_York' }).format(new Date(value));
}

export function usd(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  new: 'bg-cyan-400/15 text-cyan-200 ring-cyan-300/30',
  confirmed: 'bg-blue-400/15 text-blue-200 ring-blue-300/30',
  printing: 'bg-violet-400/15 text-violet-200 ring-violet-300/30',
  shipped: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30',
  picked_up: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30',
  cancelled: 'bg-zinc-500/15 text-zinc-400 ring-zinc-400/20',
};

const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  unpaid: 'bg-amber-400/15 text-amber-200 ring-amber-300/30',
  link_sent: 'bg-sky-400/15 text-sky-200 ring-sky-300/30',
  paid: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30',
  refunded: 'bg-zinc-500/15 text-zinc-300 ring-zinc-400/20',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${STATUS_STYLE[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${PAYMENT_STYLE[status]}`}>{PAYMENT_LABELS[status]}</span>;
}

export function Card({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-white/10 bg-zinc-950/70 p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-black uppercase tracking-[0.16em] text-zinc-400">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function gmailSearchUrl(query: string) {
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
}
