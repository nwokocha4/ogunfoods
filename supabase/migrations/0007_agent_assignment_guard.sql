-- =====================================================================
-- 0007 Agent assignment guard (Phase 4, step 8)
-- =====================================================================
--
-- For v1 the owner assigns an agent in Supabase's Table editor: open the
-- orders row and choose the agent's id in agent_id. This trigger catches a
-- typo before it becomes a delivery nobody can see:
--
-- 1. agent_id must be empty or point to a profile with role = agent
-- 2. only the owner/dashboard may set it (agents are already blocked by
--    the 0006 guard; this also stops a customer session trying)
-- 3. an order still waiting for payment cannot be handed to an agent
--
-- Setting agent_id back to empty is allowed, so a wrong assignment can be
-- undone. Safe to run more than once. No orders are changed.
-- =====================================================================

create or replace function public.guard_agent_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
 -- Nothing to check when the assignment is unchanged. This also lets
 -- agents move their own order through its statuses as usual.
 if new.agent_id is not distinct from old.agent_id then
 return new;
 end if;

 -- The dashboard, the owner's admin session and the secure server-side
 -- functions are the only places allowed to assign or reassign an agent.
 if not (public.is_trusted_backend() or public.is_admin()) then
 raise exception 'Only the owner can assign an agent to an order.';
 end if;

 -- Refuse a profile id that is not an agent (including a made-up id that
 -- happens to pass the foreign key check for some other reason).
 if new.agent_id is not null
 and not exists (
 select 1 from public.profiles p
 where p.id = new.agent_id and p.role = 'agent'
 )
 then
 raise exception 'agent_id must be empty or point to a profile with role = agent.';
 end if;

 -- Nothing has been bought before payment is confirmed, so an agent
 -- should not be sent out yet.
 if new.agent_id is not null and new.status = 'received' then
 raise exception 'Confirm payment before assigning an agent.';
 end if;

 return new;
end;
$$;

drop trigger if exists orders_guard_agent_assignment on public.orders;
create trigger orders_guard_agent_assignment
before update on public.orders
for each row execute function public.guard_agent_assignment();
