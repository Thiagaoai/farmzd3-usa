-- Each partner's position on a decision (preferred option + reason), used by the Jev mediation.
create table if not exists public.business_decision_positions (
  decision_id text not null,
  person text not null check (person in ('thiago', 'bruna')),
  option_id text not null,
  reason text not null,
  updated_at timestamptz not null default now(),
  primary key (decision_id, person)
);

-- Latest Jev "common ground" result per decision.
create table if not exists public.business_decision_mediations (
  decision_id text primary key,
  result jsonb not null,
  model text not null,
  created_at timestamptz not null default now()
);

-- Jev production-readiness check per order.
create table if not exists public.farmz3d_order_triage (
  order_number text primary key references public.farmz3d_orders (order_number) on delete cascade,
  verdict text not null check (verdict in ('ready', 'check', 'ask_details', 'review')),
  reasons text[] not null default '{}',
  nouls jsonb not null,
  model text not null,
  created_at timestamptz not null default now()
);

alter table public.business_decision_positions enable row level security;
alter table public.business_decision_mediations enable row level security;
alter table public.farmz3d_order_triage enable row level security;
