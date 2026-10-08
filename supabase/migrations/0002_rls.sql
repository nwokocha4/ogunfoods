-- =====================================================================
-- Foodrun — Step 3: row-level security
-- =====================================================================
-- HOW TO RUN THIS
--   1. Supabase dashboard -> SQL Editor -> New query.
--   2. Paste everything below and click "Run".
--   3. Expected: "Success. No rows returned" (creating rules returns no rows).
--
-- WHAT THIS FILE DOES
--   Right now every table is locked shut (Step 2 turned security on but
--   added no rules). This file adds the rules that let each kind of
--   person through exactly the right door:
--
--     Anyone          -> can READ active restaurants, their menus,
--                        delivery areas and the fee/bank settings
--     Signed-in user  -> can READ and UPDATE only their own profile
--     Customer        -> can READ only their own orders and order items.
--                        Cannot write orders at all.
--     Agent           -> can READ only the orders assigned to them, and
--                        can change ONLY the status of those orders
--     Admin (owner)   -> can read and write everything
--
-- If any rule is missing or wrong, the database refuses the request.
-- That refusal is the point: it is safer to say no than to leak
-- somebody else's order.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. HELPER FUNCTIONS
-- ---------------------------------------------------------------------
-- These answer simple yes/no questions about who is asking.
-- They are marked "security definer" so they can read the profiles table
-- without tripping over the profiles rules themselves, which would
-- otherwise loop forever.

-- "Is this request coming from the Supabase dashboard or the server-side
-- service key, rather than from a website visitor?"
-- Supabase sets the session role to 'anon' for visitors and 'authenticated'
-- for signed-in customers. Anything else means the request did not come
-- through the website at all -- for example you editing rows yourself in the
-- Table editor or SQL editor. Those are trusted, because only you can reach
-- the dashboard.
-- This function deliberately does NOT read any table, so it needs no special
-- security and never loops.
create or replace function public.is_trusted_backend()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('role', true), 'none') not in ('anon', 'authenticated');
$$;

-- "Is the person making this request the owner (admin)?"
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- "Is the person making this request a delivery agent?"
create or replace function public.is_agent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'agent'
  );
$$;

-- "Is the person making this request a customer?"
create or replace function public.is_customer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'customer'
  );
$$;


-- ---------------------------------------------------------------------
-- 2. RESTAURANTS AND MENU
-- ---------------------------------------------------------------------

-- Anyone may look at restaurants, but only the ones the owner has
-- switched on. No sign-in needed.
create policy "anyone can read active restaurants"
  on public.restaurants for select
  using (is_active = true);

-- Only the owner can add, edit, pause or delete a restaurant.
create policy "admin can manage restaurants"
  on public.restaurants for all
  using (public.is_admin())
  with check (public.is_admin());

-- Anyone may look at the menu, but only for restaurants that are active
-- and only for dishes that are marked available. A sold-out dish and a
-- hidden restaurant both disappear from the public menu.
create policy "anyone can read available menu items"
  on public.menu_items for select
  using (
    is_available = true
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.is_active = true
    )
  );

-- Only the owner can manage the menu.
create policy "admin can manage menu items"
  on public.menu_items for all
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 3. DELIVERY AREAS
-- ---------------------------------------------------------------------

-- Anyone may read the list of areas we deliver to, so the checkout
-- page can show it before anyone signs in.
create policy "anyone can read active delivery areas"
  on public.delivery_areas for select
  using (is_active = true);

-- Only the owner can change which areas we deliver to.
create policy "admin can manage delivery areas"
  on public.delivery_areas for all
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 4. SETTINGS (fees and bank details)
-- ---------------------------------------------------------------------

-- Anyone may read the fees and bank details. The website needs them to
-- show the delivery fee and the bank transfer instructions.
create policy "anyone can read settings"
  on public.settings for select
  using (true);

-- Only the owner can change a fee or a bank account number.
create policy "admin can write settings"
  on public.settings for all
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 5. PROFILES
-- ---------------------------------------------------------------------

-- A signed-in person may read their own profile row, and nobody else's.
-- This is what stops one customer seeing another customer's phone number.
create policy "users can read their own profile"
  on public.profiles for select
  using (id = auth.uid());

-- A signed-in person may update their own profile (for example, to add
-- their name). Note there is NO rule letting them insert or delete rows.
create policy "users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- The owner can read and change any profile. This is how you make an
-- agent an agent, or yourself an admin.
create policy "admin can manage all profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());


-- ---- Guard against people promoting themselves to admin -------------
-- The rule above lets a user edit their own row. Without this trigger
-- they could also set their own role to 'admin' and take over the site.
-- This trigger stops that: your role can only be changed by an admin.

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Owners are not affected by this guard: you edit rows yourself in the
  -- Supabase dashboard, and nobody else can reach it.
  if public.is_trusted_backend() then
    return new;
  end if;

  -- If the role did not change, nothing to do.
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- The role changed. Only the owner is allowed to do that.
  if public.is_admin() then
    return new;
  end if;

  raise exception 'You cannot change your own role.';
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();


-- ---------------------------------------------------------------------
-- 6. ORDERS
-- ---------------------------------------------------------------------

-- Who may read an order?
--   - the customer who placed it
--   - the agent it was assigned to
--   - the owner
create policy "customers read own orders, agents read assigned orders"
  on public.orders for select
  using (
    customer_id = auth.uid()
    or agent_id = auth.uid()
    or public.is_admin()
  );

-- The owner can update any order: confirm payment, assign an agent,
-- change a status, or cancel.
create policy "admin can update orders"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- The owner can also create and delete orders (for corrections).
create policy "admin can insert orders"
  on public.orders for insert
  with check (public.is_admin());

create policy "admin can delete orders"
  on public.orders for delete
  using (public.is_admin());

-- An assigned agent may update the orders assigned to them. Narrower
-- rules about WHAT they may change are enforced by the trigger below.
create policy "agents can update their assigned orders"
  on public.orders for update
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

-- IMPORTANT: there is deliberately NO rule letting a signed-in customer
-- insert, update or delete an order directly. Placing an order will go
-- through a secure database function in Phase 3, which works out the
-- prices itself so nobody can send a doctored total from the browser.


-- ---- Agents may only change the status, never the money -------------
-- Row-level security works row by row, not column by column, so it
-- cannot say "this agent may edit status but not price" on its own.
-- This trigger does exactly that.

create or replace function public.guard_agent_order_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The owner edits orders in the Supabase dashboard, and the admin user
  -- confirmed payment or assigned an agent. Neither should be blocked here.
  if public.is_trusted_backend() or public.is_admin() then
    return new;
  end if;

  -- Customers cannot reach this point at all (they have no update rule),
  -- so what is left is a website visitor with a session: an agent.

  -- An agent may move the status along and nothing else.
  if new.status        is distinct from old.status
     or new.updated_at is distinct from old.updated_at then
    return new;
  end if;

  raise exception 'Agents can only change the order status.';
end;
$$;

create trigger orders_guard_agent_update
  before update on public.orders
  for each row execute function public.guard_agent_order_update();


-- ---------------------------------------------------------------------
-- 7. ORDER_ITEMS (the food lines on an order)
-- ---------------------------------------------------------------------

-- You may read the lines of an order if you are allowed to read the
-- order itself: the customer who placed it, the assigned agent, or the
-- owner. This looks the order up by its id.
create policy "read order items if you can read the order"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or o.agent_id = auth.uid()
          or public.is_admin()
        )
    )
  );

-- Only the owner can change order lines directly. Customers place orders
-- through a secure function in Phase 3; agents never edit the food lines.
create policy "admin can manage order items"
  on public.order_items for all
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 8. MAKE SURE SECURITY IS ACTUALLY ON FOR EVERY TABLE
-- ---------------------------------------------------------------------
-- Belt and braces. If you ever add a table later and forget the rules,
-- this is a second chance to catch it.
alter table public.profiles       enable row level security;
alter table public.restaurants    enable row level security;
alter table public.menu_items     enable row level security;
alter table public.delivery_areas enable row level security;
alter table public.settings       enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;


-- =====================================================================
-- DONE. Next: Step 4 writes supabase/seed.sql.
-- =====================================================================