-- =====================================================================
-- Foodrun — Phase 3, step 1: cart tables
-- =====================================================================
-- HOW TO RUN THIS
-- 1. Open your Supabase project dashboard.
-- 2. Click "SQL Editor" in the left sidebar, then "New query".
-- 3. Paste everything below and click "Run".
-- 4. Then check the "Table editor" — you should see carts and cart_items.
--
-- WHAT THIS FILE DOES
-- A cart holds what a customer plans to order, before checkout. One cart
-- per customer, tied to ONE restaurant (the one-restaurant rule is
-- enforced by the website in step 4 — the database just stores it).
-- Prices are copied onto cart_items at the time they are added, so the
-- cart still reads correctly if a restaurant later changes a price.
--
-- IF SOMETHING GOES WRONG
-- "already exists" -> you ran it twice. That is harmless; the first
-- run already did the job. Stop and check the Table editor.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. CARTS — one row per customer
-- ---------------------------------------------------------------------

create table public.carts (
-- Same id as the customer's profile row.
id uuid primary key references public.profiles(id) on delete cascade,
-- Which restaurant this cart belongs to. Empty until the first item lands.
restaurant_id uuid references public.restaurants(id) on delete set null,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2. CART_ITEMS — the lines in the cart
-- ---------------------------------------------------------------------

create table public.cart_items (
id uuid primary key default gen_random_uuid(),
cart_id uuid not null references public.carts(id) on delete cascade,
menu_item_id uuid references public.menu_items(id) on delete set null,
-- Copies, taken when the item is added. If the restaurant later changes
-- a price, the cart keeps showing what the customer actually picked.
item_name text not null,
unit_price integer not null check (unit_price >= 0), -- whole naira
quantity integer not null check (quantity > 0),
created_at timestamptz not null default now()
);

create index cart_items_cart_id_idx on public.cart_items (cart_id);

-- One line per dish: adding the same dish twice raises the quantity
-- instead of adding a second line.
create unique index cart_items_one_line_per_dish
on public.cart_items (cart_id, menu_item_id);


-- ---------------------------------------------------------------------
-- 3. KEEP updated_at HONEST
-- ---------------------------------------------------------------------
-- Same trigger style as the other tables (see 0001_schema.sql section 10).

create trigger carts_set_updated_at
before update on public.carts
for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 4. ROW-LEVEL SECURITY
-- ---------------------------------------------------------------------
-- A customer reads and writes ONLY their own cart. The admin reads and
-- writes everything (via the admin rules below). Guests (anon) get
-- nothing — browsing needs no cart, and checkout asks for login.

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

-- The owner working in the dashboard bypasses these (trusted backend),
-- same as every other table.

-- Customer: their own cart only.
create policy carts_owner_read on public.carts
for select
using (id = auth.uid() or public.is_admin() or public.is_trusted_backend());

create policy carts_owner_write on public.carts
for all
using (id = auth.uid() or public.is_admin() or public.is_trusted_backend())
with check (id = auth.uid() or public.is_admin() or public.is_trusted_backend());

-- Customer: lines in their own cart only. The cart_id check goes through
-- the carts table, so a customer can never touch another person's lines.
create policy cart_items_owner_read on public.cart_items
for select
using (
exists (select 1 from public.carts where carts.id = cart_items.cart_id and (carts.id = auth.uid() or public.is_admin()))
or public.is_trusted_backend()
);

create policy cart_items_owner_write on public.cart_items
for all
using (
exists (select 1 from public.carts where carts.id = cart_items.cart_id and (carts.id = auth.uid() or public.is_admin()))
or public.is_trusted_backend()
)
with check (
exists (select 1 from public.carts where carts.id = cart_items.cart_id and (carts.id = auth.uid() or public.is_admin()))
or public.is_trusted_backend()
);
