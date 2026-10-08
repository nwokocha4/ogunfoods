-- =====================================================================
-- Foodrun — Step 2: database schema
-- =====================================================================
-- HOW TO RUN THIS
--   1. Open your Supabase project dashboard.
--   2. Click "SQL Editor" in the left sidebar, then "New query".
--   3. Paste everything below and click "Run".
--   4. Then check the "Table editor" — you should see 7 tables.
--
-- Nothing here touches money rules or order statuses beyond storing
-- them safely. Row-level security is switched on at the BOTTOM of this
-- file, but the policies that open the doors come in Step 3.
--
-- IF SOMETHING GOES WRONG
--   "already exists" -> you ran it twice. That is harmless; the first
--   run already did the job. Stop and check the Table editor.
--   Want to start over from scratch? In the SQL editor run:
--     drop table if exists public.order_items, public.orders,
--       public.settings, public.delivery_areas, public.menu_items,
--       public.restaurants, public.profiles cascade;
--     drop type if exists public.order_status, public.user_role cascade;
--     drop sequence if exists public.order_reference_seq;
--   then run this file again from the top.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TYPES (enums)
-- Enums are fixed lists. The database itself refuses any other value,
-- so a typo can never invent a new order status.
-- ---------------------------------------------------------------------

-- Who a person is: a customer, the owner (admin), or a delivery agent.
create type public.user_role as enum ('customer', 'admin', 'agent');

-- The order statuses, in the order they happen.
create type public.order_status as enum (
  'received',      -- order placed, payment not verified yet
  'confirmed',     -- admin verified the payment  (order is now locked)
  'agent_buying',  -- agent is at the restaurant buying the food
  'picked_up',     -- food collected
  'on_the_way',    -- agent is delivering
  'delivered',     -- finished
  'cancelled'      -- dead end, not a step on the progress bar
);


-- ---------------------------------------------------------------------
-- 2. PROFILES — one row per signed-in user
-- ---------------------------------------------------------------------

create table public.profiles (
  -- Same id as the row Supabase keeps in its own auth.users table.
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  -- New users are customers until the owner changes it by hand.
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

-- A phone number should identify one person only.
create unique index profiles_phone_key on public.profiles (phone) where phone is not null;


-- ---------------------------------------------------------------------
-- 3. RESTAURANTS — the partner restaurants
-- ---------------------------------------------------------------------

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  address text,                -- where the restaurant is
  opening_hours text,          -- free text, e.g. "8:00 AM - 9:00 PM"
  image_url text,              -- a web address of a photo, not an upload
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 4. MENU_ITEMS — the food on each restaurant's menu
-- ---------------------------------------------------------------------

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  price integer not null check (price >= 0),  -- whole naira only, e.g. 3500
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_items_restaurant_id_idx on public.menu_items (restaurant_id);


-- ---------------------------------------------------------------------
-- 5. DELIVERY_AREAS — the fixed list of areas you deliver to
-- ---------------------------------------------------------------------

create table public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 6. SETTINGS — fees and bank details, all in ONE row
-- ---------------------------------------------------------------------
-- The check on id stops a second row being added by accident, because
-- the whole app reads these numbers from this single row.
-- Every fee lives here so nothing is hardcoded in the website.

create table public.settings (
  id integer primary key default 1 check (id = 1),
  delivery_fee integer not null default 1000 check (delivery_fee >= 0),        -- flat, in naira
  service_fee_percent numeric(5,2) not null default 5 check (service_fee_percent >= 0),
  minimum_order integer not null default 500 check (minimum_order >= 0),      -- food subtotal must reach this
  bank_name text,
  account_number text,
  account_name text,
  support_whatsapp text,
  updated_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 7. ORDER REFERENCE NUMBERS — e.g. LFD-4821
-- ---------------------------------------------------------------------
-- A counter, not random numbers, so references are short and never clash.
-- Starting at 1001 means the first order looks like LFD-1001.

create sequence public.order_reference_seq start 1001;

create or replace function public.next_order_reference()
returns text
language sql
volatile
as $$
  select 'LFD-' || lpad(nextval('public.order_reference_seq')::text, 4, '0');
$$;


-- ---------------------------------------------------------------------
-- 8. ORDERS — one row per order
-- ---------------------------------------------------------------------
-- Money columns are integers holding whole naira (no kobo, no decimals).

create table public.orders (
  id uuid primary key default gen_random_uuid(),

  -- The short code the customer puts in their transfer narration.
  reference text not null default public.next_order_reference()
    unique check (reference ~ '^LFD-[0-9]{4,}$'),

  customer_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,

  -- Which agent is handling this delivery. Empty until the admin assigns one.
  agent_id uuid references public.profiles(id) on delete set null,

  status public.order_status not null default 'received',

  -- Copy of the details the customer typed, so the order still reads
  -- correctly even if they later change their profile.
  customer_name text not null,
  customer_phone text not null,
  delivery_address text not null,
  delivery_area_id uuid references public.delivery_areas(id) on delete set null,
  notes text,

  food_subtotal integer not null check (food_subtotal >= 0),
  delivery_fee integer not null check (delivery_fee >= 0),
  service_fee integer not null check (service_fee >= 0),
  total integer not null check (total >= 0),

  -- Set the moment the admin verifies payment. This is what "confirmed"
  -- means, and it is what locks the order against cancellation.
  payment_confirmed_at timestamptz,

  -- Placed time + 30 minutes. An order still waiting for payment when
  -- this moment passes gets cancelled automatically (Phase 4).
  expires_at timestamptz not null default (now() + interval '30 minutes'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Speeds up "my orders" lookups for each customer.
create index orders_customer_id_idx on public.orders (customer_id);

-- Speeds up "all orders waiting for payment" and agent filters.
create index orders_status_idx on public.orders (status);

-- Speeds up finding the orders assigned to one agent.
create index orders_agent_id_idx on public.orders (agent_id);


-- ---------------------------------------------------------------------
-- 9. ORDER_ITEMS — the food lines on an order
-- ---------------------------------------------------------------------
-- item_name and unit_price are COPIES on purpose. If a restaurant renames
-- a dish or changes its price tomorrow, yesterday's order must still show
-- what the customer actually paid. menu_item_id is optional so deleting a
-- menu item never deletes history.

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  unit_price integer not null check (unit_price >= 0),  -- whole naira
  quantity integer not null check (quantity > 0)
);

create index order_items_order_id_idx on public.order_items (order_id);


-- ---------------------------------------------------------------------
-- 10. KEEP updated_at HONEST
-- ---------------------------------------------------------------------
-- Postgres will not update updated_at on its own, so this trigger does it
-- every time a row changes.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 11. CREATE A PROFILE FOR EVERY NEW USER
-- ---------------------------------------------------------------------
-- Supabase creates its own row in auth.users when someone confirms their
-- phone code. This trigger copies that into our profiles table, so every
-- signed-in person has a profile with a role (default: customer).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Catch up on anyone who already signed up before this file was run.
insert into public.profiles (id, full_name, phone)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', ''),
  phone
from auth.users
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 12. ROW-LEVEL SECURITY: LOCK EVERYTHING DOWN
-- ---------------------------------------------------------------------
-- Turning RLS on with NO policies yet means every table is completely
-- closed — no reads, no writes, for anybody. That is deliberate: between
-- this step and Step 3 the database is sealed rather than wide open.
-- Step 3 (0002_rls.sql) adds the rules that let each role see exactly
-- what it should.

alter table public.profiles       enable row level security;
alter table public.restaurants    enable row level security;
alter table public.menu_items     enable row level security;
alter table public.delivery_areas enable row level security;
alter table public.settings       enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;


-- =====================================================================
-- DONE. You now have 7 tables:
--   profiles, restaurants, menu_items, delivery_areas,
--   settings, orders, order_items
-- Next: run 0002_rls.sql to open the right doors.
-- =====================================================================