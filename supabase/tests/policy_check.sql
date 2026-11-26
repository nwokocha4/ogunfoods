-- =====================================================================
-- Foodrun — SAFE TO RUN IN YOUR LIVE PROJECT
-- =====================================================================
-- This file only READS Postgres's own catalogue tables. It creates
-- nothing, changes nothing, and deletes nothing. You can paste the whole
-- thing into the Supabase SQL Editor at any time.
--
-- Expected after running all migrations:
--   - 9 tables, all with row_security = true
--   - 22 policies
--
-- If a table shows false, its rules are OFF and that table is open to
-- anyone with the anon key. Re-run 0002_rls.sql.
-- =====================================================================


-- 1. Which tables have row-level security switched on?
--    Expect 9 rows, every one "t".
select
  tablename,
  rowsecurity as row_security
from pg_tables
where schemaname = 'public'
order by tablename;


-- 2. Which policies (rules) exist?
--    Expect 22 rows.
select count(*) as policy_count
from pg_policies
where schemaname = 'public';


-- 3. The full list, so you can read what each one allows.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- 4. Which helper functions back those rules?
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('is_admin','is_agent','is_customer','is_trusted_backend',
                       'set_updated_at','handle_new_user','next_order_reference',
                       'protect_profile_role','guard_agent_order_update',
 'guard_agent_assignment')
order by routine_name;