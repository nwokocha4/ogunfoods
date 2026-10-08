# Row-level security tests

Row-level security (RLS) is the thing that stops one customer reading another
customer's order. It is easy to write and easy to break silently, so this folder
exists to prove it still works.

There are two ways to check, depending on where you are.

---

## A. The safe check — run this in your live Supabase project

Open your Supabase dashboard → **SQL Editor** → paste
[`policy_check.sql`](policy_check.sql) → **Run**.

It only reads Postgres's catalogue tables, so it creates and changes nothing.

**What you should see:**

| Result | Meaning |
| --- | --- |
| 7 tables, all `row_security = t` | Every table is locked down |
| `policy_count = 18` | All the rules are in place |
| 9 helper functions | The `is_admin()` family plus the triggers |

**If a table shows `f`**, that table is wide open to anyone holding the anon
key. Re-run `../migrations/0002_rls.sql`.

---

## B. The real proof — run the 28-assertion suite locally

This one actually tries to do the wrong things and checks that the database
refuses them.

### Why it needs Docker

The suite builds a **throwaway Postgres** in a container. Your live project is
never touched. It also has to recreate the `auth` schema that Supabase normally
provides, since stock Postgres has no `auth.users` or `auth.uid()`.

### Run it

```bash
cd supabase/tests
./rls_test.sh
```

Requires Docker running. It pulls `postgres:16` the first time. Every run drops
and rebuilds its database, so results are always from a clean slate.

**Expected output:** `RESULT: 28 passed, 0 failed`

### The one detail that makes these tests honest

Every assertion runs as `anon` or `authenticated` — **never** as `postgres`.

`postgres` is a superuser and **bypasses row-level security entirely**. If the
tests ran as `postgres`, all 28 would pass even with every policy deleted. This
is the single easiest way to write a security test that proves nothing.

---

## What the 28 assertions cover

**Can they read? (13)**
Customer A and B each see only their own orders; the agent sees only the order
assigned to them; an anonymous visitor sees active restaurants and available
dishes (but not hidden restaurants or sold-out items); settings and delivery
areas are readable by anyone; the admin sees everything.

**Must be refused (9)**
A customer cannot insert an order (prices are computed server-side in Phase 3),
cannot promote themselves to admin, and cannot edit someone else's profile. An
agent cannot change the money on an order, cannot edit an unassigned order, and
cannot change a menu price. An anonymous visitor cannot change a fee.

**Must succeed (6)**
An agent can advance the status; a customer can update their own name; the admin
can confirm payment, assign an agent and change a fee; and the owner can change
a role from the Supabase dashboard.

---

## Bugs these tests already caught

Worth knowing, because they are the kind of thing that only appears once real
people start using the site:

1. **The owner could never become admin.** The role guard asked `is_admin()`,
   which was false at the exact moment you were setting your own role — and the
   Supabase dashboard has no session, so it was blocked too. Fixed with
   `is_trusted_backend()`.

2. **The admin could not assign an agent.** Postgres fires triggers
   **alphabetically**: `orders_guard_agent_update` runs before
   `orders_set_updated_at`. The guard assumed `updated_at` had already changed
   — it had not — so it refused a perfectly valid admin edit. Fixed by testing
   `is_admin()` explicitly.

Both were found before Phase 4, where confirming payment and assigning agents
happen for real.

---

## Files

| File | What it is |
| --- | --- |
| `policy_check.sql` | Safe, read-only check for your **live** project |
| `rls_test.sh` | Runs the 28 assertions in a throwaway container |
| `auth_mock.sql` | Stands in for the `auth` schema Supabase provides |
| `setup.sql` | Four test people, two orders, one restaurant, a menu |

## After you change a policy

Edit the migration in `../migrations/`, then re-run `./rls_test.sh`. If the
count changes, update the expected numbers in `policy_check.sql` too.