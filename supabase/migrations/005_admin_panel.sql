-- Admin panel: products managed in the database, shipping/payment on orders,
-- and a message log per order. Idempotent.

create table if not exists public.farmz3d_products (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  collection text not null check (collection in ('halloween', 'thanksgiving', 'christmas', 'year-round', 'business')),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '',
  personalization_hint text not null default '',
  required_details text not null default '',
  unit_label text not null default 'each',
  emoji text not null default '🎁',
  -- null = follow the approved (or recommended) price decision
  price_cents integer check (price_cents is null or price_cents between 0 and 10000000),
  cost_cents integer check (cost_cents is null or cost_cents >= 0),
  -- null = made to order (no stock limit)
  stock integer check (stock is null or stock >= 0),
  low_stock_at integer not null default 3 check (low_stock_at >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  image_path text,
  image_alt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists farmz3d_products_collection_idx on public.farmz3d_products (collection, sort_order);
alter table public.farmz3d_products enable row level security;

alter table public.farmz3d_orders add column if not exists ship_line1 text;
alter table public.farmz3d_orders add column if not exists ship_line2 text;
alter table public.farmz3d_orders add column if not exists ship_city text;
alter table public.farmz3d_orders add column if not exists ship_state text;
alter table public.farmz3d_orders add column if not exists tracking_carrier text;
alter table public.farmz3d_orders add column if not exists tracking_number text;
alter table public.farmz3d_orders add column if not exists shipped_at timestamptz;
alter table public.farmz3d_orders add column if not exists payment_status text not null default 'unpaid';
alter table public.farmz3d_orders add column if not exists payment_url text;
alter table public.farmz3d_orders add column if not exists paid_at timestamptz;
alter table public.farmz3d_orders add column if not exists stripe_session_id text;
alter table public.farmz3d_orders add column if not exists internal_notes text;

do $$ begin
  alter table public.farmz3d_orders
    add constraint farmz3d_orders_payment_status_check check (payment_status in ('unpaid', 'link_sent', 'paid', 'refunded'));
exception when duplicate_object then null; end $$;

create table if not exists public.farmz3d_order_messages (
  id uuid primary key default gen_random_uuid(),
  order_number text not null references public.farmz3d_orders(order_number) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp', 'note', 'system')),
  direction text not null check (direction in ('out', 'in', 'internal')),
  subject text,
  body text not null,
  author text,
  created_at timestamptz not null default now()
);

create index if not exists farmz3d_order_messages_order_idx on public.farmz3d_order_messages (order_number, created_at);
alter table public.farmz3d_order_messages enable row level security;

-- Product photos: private bucket, served by the app at /product-images/<key>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('farmz3d-product-images', 'farmz3d-product-images', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
