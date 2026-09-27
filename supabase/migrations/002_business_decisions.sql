-- Approved business decisions (prices, deadlines) shared by the team in /admin/farmz3d.
create table if not exists public.business_decisions (
  decision_id text primary key,
  option_id text not null,
  decided_by text not null check (decided_by in ('thiago', 'bruna')),
  note text,
  decided_at timestamptz not null default now()
);

-- Full history: who chose what, and when.
create table if not exists public.business_decision_log (
  id uuid primary key default gen_random_uuid(),
  decision_id text not null,
  option_id text not null,
  decided_by text not null check (decided_by in ('thiago', 'bruna')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists business_decision_log_decision_created_at_idx
  on public.business_decision_log (decision_id, created_at desc);

alter table public.business_decisions enable row level security;
alter table public.business_decision_log enable row level security;

-- Flat shipping charged on the order (decision "shipping:flat"); estimated_total_cents includes it.
alter table public.farmz3d_orders add column if not exists shipping_cents integer not null default 0 check (shipping_cents >= 0);
