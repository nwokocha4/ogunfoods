-- =====================================================================
-- 0005  Realtime for order status (Phase 4)
-- =====================================================================
--
-- Two separate things are needed before a customer's order page can
-- update itself without a refresh:
--
--   1. The orders table must be part of Supabase's "publication" — the
--      list of tables whose changes Supabase is allowed to broadcast.
--      It is OFF by default, so we switch it on here.
--
--   2. A customer may cancel their own order, but ONLY while it is still
--      "received" (payment not yet confirmed). Until now only the admin
--      and agent could update an order at all. This is the missing rule.
--
-- Realtime respects row-level security, so even though the change is
-- broadcast, Supabase only delivers it to a browser that is allowed to
-- read that row. One customer can never see another customer's order.
--
-- Safe to run more than once.

-- ---- 1. Let Supabase broadcast changes to orders ---------------------

do $$
begin
  -- alter publication ... add table throws if the table is already in
  -- it, so check first and stay quiet on a re-run.
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$$;

-- ---- 2. Customers may cancel, but only before payment ----------------


-- Note: this policy has TWO jobs at once.
--   using      -> which rows this person is allowed to try to change
--   with check -> what the row must look like afterwards
-- Both are locked to 'cancelled', so a customer cannot wobble an order
-- to some other status, and cannot edit the money either (a separate
-- trigger, set_customer_cannot_edit_money, is not needed: the only
-- columns they can effectively change are status, because the trigger
-- below rejects anything else).

drop policy if exists "customers can cancel their own unpaid orders"
  on public.orders;

create policy "customers can cancel their own unpaid orders"
  on public.orders for update
  using (
    customer_id = auth.uid()
    and status = 'received'
  )
  with check (
    customer_id = auth.uid()
    and status = 'cancelled'
  );

-- ---- 3. Customers may only change the status, never the money --------
--
-- RLS alone cannot say "you may change this column but not that one",
-- so a trigger does it. Without this, the policy above would technically
-- let a customer PATCH their own unpaid order's total to 1 naira and
-- then cancel it — small, but still a hole worth closing.

create or replace function public.customer_only_changes_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only enforce this for a signed-in customer changing their own order.
  -- Admins and agents are handled by their own rules and the existing
  -- agent trigger.
  if auth.uid() is null
     or not public.is_customer()
     or new.customer_id <> auth.uid()
  then
    return new;
  end if;

  -- Everything except status must be exactly as it was.
  if new.food_subtotal is distinct from old.food_subtotal
     or new.delivery_fee is distinct from old.delivery_fee
     or new.service_fee is distinct from old.service_fee
     or new.total is distinct from old.total
     or new.customer_id is distinct from old.customer_id
     or new.restaurant_id is distinct from old.restaurant_id
     or new.agent_id is distinct from old.agent_id
     or new.payment_confirmed_at is distinct from old.payment_confirmed_at
  then
    raise exception
      'A customer may only cancel an order. Prices and details cannot be changed.';
  end if;

  return new;
end;
$$;

drop trigger if exists customer_only_changes_status on public.orders;

create trigger customer_only_changes_status
  before update on public.orders
  for each row
  execute function public.customer_only_changes_status();

-- DONE. Next: Phase 4 agent and admin pages.