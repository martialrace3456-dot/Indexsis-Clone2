
create table public.advertiser_load_payments (
  id uuid primary key default gen_random_uuid(),
  identifier text not null default 'admin',
  amount numeric not null check (amount > 0),
  payment_method text not null,
  crypto_currency text,
  from_address text,
  to_address text,
  payment_status text not null default 'pending',
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
grant select, insert, update, delete on public.advertiser_load_payments to anon, authenticated;
grant all on public.advertiser_load_payments to service_role;
alter table public.advertiser_load_payments enable row level security;
create policy "open select" on public.advertiser_load_payments for select using (true);
create policy "open insert" on public.advertiser_load_payments for insert with check (true);
create policy "open update" on public.advertiser_load_payments for update using (true);
create policy "open delete" on public.advertiser_load_payments for delete using (true);

create table public.ad_bids (
  id uuid primary key default gen_random_uuid(),
  identifier text not null default 'admin',
  country_targets text[] not null default '{}',
  age_target text not null default 'all',
  contest_targets uuid[] not null default '{}',
  window_start timestamptz not null,
  window_end timestamptz not null,
  runtime_minutes int not null check (runtime_minutes >= 10 and runtime_minutes % 10 = 0),
  rate_per_slot numeric not null check (rate_per_slot >= 0),
  status text not null default 'ongoing',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
grant select, insert, update, delete on public.ad_bids to anon, authenticated;
grant all on public.ad_bids to service_role;
alter table public.ad_bids enable row level security;
create policy "open select" on public.ad_bids for select using (true);
create policy "open insert" on public.ad_bids for insert with check (true);
create policy "open update" on public.ad_bids for update using (true);
create policy "open delete" on public.ad_bids for delete using (true);
