-- =====================================================================
-- 0006 Agent status guard (Phase 4, step 7)
-- =====================================================================
--
-- The website only offers the next status button, but a person could call
-- the API directly and try to jump to "delivered" or change a price. RLS
-- already limits an agent to their assigned orders; this trigger limits
-- WHAT they may do to those orders:
--
-- 1. move forward exactly one step, starting at "confirmed"
-- 2. change nothing else (money, address, agent, payment time, ...)
--
-- "Confirmed" is deliberately not an agent step: it means payment was
-- verified, which only the owner may do. Cancelled is also not a step.
--
-- Safe to run more than once. This replaces a function, not a table, so
-- no orders are changed.

create or replace function public.guard_agent_order_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
 -- The owner works in the dashboard and the admin uses the site's own
 -- controls. Neither should be limited by agent rules.
 if public.is_trusted_backend() or public.is_admin() then
 return new;
 end if;

 -- RLS handles everyone who is not an agent. Return early so this guard
 -- does not interfere with a customer cancelling an unpaid order.
 if not public.is_agent() then
 return new;
 end if;

 -- An agent may only touch an order that was already assigned to them.
 -- They must not assign an order to themselves or hand it to someone else.
 if old.agent_id is distinct from auth.uid()
 or new.agent_id is distinct from old.agent_id
 then
 return new; -- RLS will refuse the write; no need to raise twice.
 end if;

 -- Status is the one column an agent may change. Compare every other
 -- column, using IS DISTINCT FROM so NULL values are handled correctly.
 if new.id is distinct from old.id
 or new.reference is distinct from old.reference
 or new.customer_id is distinct from old.customer_id
 or new.restaurant_id is distinct from old.restaurant_id
 or new.customer_name is distinct from old.customer_name
 or new.customer_phone is distinct from old.customer_phone
 or new.delivery_address is distinct from old.delivery_address
 or new.delivery_area_id is distinct from old.delivery_area_id
 or new.notes is distinct from old.notes
 or new.food_subtotal is distinct from old.food_subtotal
 or new.delivery_fee is distinct from old.delivery_fee
 or new.service_fee is distinct from old.service_fee
 or new.total is distinct from old.total
 or new.payment_confirmed_at is distinct from old.payment_confirmed_at
 or new.expires_at is distinct from old.expires_at
 or new.created_at is distinct from old.created_at
 then
 raise exception 'Agents can only change the order status.';
 end if;

 -- No status change at all is harmless (for example the updated_at
 -- trigger firing on an unrelated edit). Only check forward movement.
 if new.status is distinct from old.status then
 if not (
 (old.status = 'confirmed' and new.status = 'agent_buying')
 or (old.status = 'agent_buying' and new.status = 'picked_up')
 or (old.status = 'picked_up' and new.status = 'on_the_way')
 or (old.status = 'on_the_way' and new.status = 'delivered')
 ) then
 raise exception 'Agents can only move an order one step forward.';
 end if;
 end if;

 return new;
end;
$$;

-- The trigger already exists from 0002_rls.sql. Replacing the function
-- above changes what that trigger does, so no trigger change is needed.
