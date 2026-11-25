create sequence if not exists order_no_seq start 1001;

create table if not exists orders (
  id serial primary key,
  order_no text unique not null,
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','confirmed','out for delivery','delivered','cancelled')),
  name text not null,
  phone text not null,
  email text not null,
  city text not null,
  address text not null,
  notes text not null default '',
  card text not null default '',
  subtotal integer not null check (subtotal > 0),
  delivery integer not null check (delivery >= 0),
  total integer not null,
  eta_range text,
  eta_days text,
  payment text not null default 'Cash on delivery',
  quoted_total integer,
  price_verified boolean not null default false,
  verified_at timestamptz,
  constraint orders_total_matches check (total = subtotal + delivery)
);

create table if not exists order_items (
  id serial primary key,
  order_id integer not null references orders(id) on delete cascade,
  name text not null,
  detail text not null default '',
  unit integer not null check (unit > 0),
  qty integer not null check (qty between 1 and 99),
  spec jsonb not null
);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on orders (status, created_at desc);
create index if not exists order_items_order_idx on order_items (order_id);
