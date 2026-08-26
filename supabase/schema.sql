-- VYORE Supabase schema.
-- Run this once in Supabase SQL Editor before seed.sql.

create extension if not exists pgcrypto;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'admin',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_vyore_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and active = true
  );
$$;

grant execute on function public.is_vyore_admin() to anon, authenticated;

create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  name text not null,
  category text not null default 'Blusas y tops',
  description text not null default '',
  fabric text not null default '',
  detail text not null default '',
  sizes text[] not null default array[]::text[],
  price_public numeric(10,2) not null default 0,
  price_regular numeric(10,2) not null default 0,
  reference_image text not null default 'assets/vyore/isotipo-vyore.png',
  is_featured boolean not null default false,
  is_new boolean not null default false,
  sort_order integer not null default 99,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  sku text not null unique,
  color_id text not null,
  color_name text not null,
  color_hex text not null default '#817A75',
  image text not null default 'assets/vyore/isotipo-vyore.png',
  stock integer check (stock is null or stock >= 0),
  status text not null default 'disponible' check (status in ('disponible', 'bajo', 'consultar', 'agotado')),
  is_featured boolean not null default false,
  sort_order integer not null default 99,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, color_id)
);

create table if not exists public.catalog_meta (
  id text primary key default 'catalog',
  updated_prices date,
  updated_stock date,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

alter table public.admin_profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.catalog_meta enable row level security;

drop policy if exists admin_profiles_self_read on public.admin_profiles;
drop policy if exists public_read_active_products on public.products;
drop policy if exists admin_manage_products on public.products;
drop policy if exists public_read_active_variants on public.product_variants;
drop policy if exists admin_manage_variants on public.product_variants;
drop policy if exists public_read_catalog_meta on public.catalog_meta;
drop policy if exists admin_manage_catalog_meta on public.catalog_meta;

create policy admin_profiles_self_read
on public.admin_profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_vyore_admin());

create policy public_read_active_products
on public.products
for select
to anon, authenticated
using (active = true or public.is_vyore_admin());

create policy admin_manage_products
on public.products
for all
to authenticated
using (public.is_vyore_admin())
with check (public.is_vyore_admin());

create policy public_read_active_variants
on public.product_variants
for select
to anon, authenticated
using (
  (active = true and exists (
    select 1 from public.products
    where products.id = product_variants.product_id
      and products.active = true
  ))
  or public.is_vyore_admin()
);

create policy admin_manage_variants
on public.product_variants
for all
to authenticated
using (public.is_vyore_admin())
with check (public.is_vyore_admin());

create policy public_read_catalog_meta
on public.catalog_meta
for select
to anon, authenticated
using (true);

create policy admin_manage_catalog_meta
on public.catalog_meta
for all
to authenticated
using (public.is_vyore_admin())
with check (public.is_vyore_admin());

grant usage on schema public to anon, authenticated;
grant select on public.products, public.product_variants, public.catalog_meta to anon, authenticated;
grant select on public.admin_profiles to authenticated;
grant insert, update, delete on public.products, public.product_variants, public.catalog_meta to authenticated;
