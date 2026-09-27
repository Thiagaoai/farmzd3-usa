-- Farmz3D orders. Idempotent: safe to run on a project that already has the table.
create extension if not exists pgcrypto;

create table if not exists public.farmz3d_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'printing', 'shipped', 'picked_up', 'cancelled')),
  product_id text not null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 50),
  estimated_total_cents integer not null check (estimated_total_cents >= 0),
  personalization text not null,
  needed_by date,
  fulfillment text not null check (fulfillment in ('pickup', 'shipping')),
  shipping_zip text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  notes text,
  campaign text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists farmz3d_orders_status_created_at_idx
  on public.farmz3d_orders (status, created_at desc);

-- Server-only access through the service role; no public policies.
alter table public.farmz3d_orders enable row level security;
