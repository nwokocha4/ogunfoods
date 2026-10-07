# CLAUDE.md

## Project summary

**Foodrun** is a simple food delivery website for Lagos, Nigeria.

The business runs manually:

1. A customer orders food from a partner restaurant on the site.
2. The customer **pays first** by bank transfer.
3. The owner (admin) confirms the payment on the site.
4. The admin buys the food at the restaurant through an agent on the ground.
5. The agent delivers it.
6. The customer watches the order move through the statuses on "My orders".

The site's job is to record orders, take payment instructions, and show delivery progress.

**Project folder:** `Ogunfoods`

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend + backend | Next.js (App Router) | One framework for pages and server logic |
| Styling | Tailwind CSS | Mobile-first utility classes |
| Database | Supabase (Postgres) | Tables, phone OTP login, realtime, row-level security |
| Hosting | Vercel | Free tier, deploys from GitHub |
| Payments | **Bank transfer for v1**, Paystack later | Manual confirmation is simpler to start |
| Notifications | None in v1 (order page is the channel), SMS/WhatsApp later | Not built until Phase 5 |

All money is **Nigerian Naira (₦)** and is stored as **whole numbers**.

## Order statuses

Fixed list, in this order:

```
Received -> Confirmed -> Agent buying -> Picked up -> On the way -> Delivered
```

Plus `Cancelled`.

- **Received** — order placed, payment not yet verified.
- **Confirmed** — the admin has verified the customer's payment. *Nothing is purchased before this.*
- **Agent buying** — the agent is at the restaurant buying the food.
- **Picked up** — food collected, ready to travel.
- **On the way** — agent is delivering.
- **Delivered** — finished.
- **Cancelled** — terminal, dead-end. It is not a step on the progress bar.

Rules:
- Statuses move **forward only** through the list above. Never reorder this list or insert a new status without the owner's say-so.
- `Confirmed` **means payment verified.** Nothing else.
- Once payment is confirmed, the order is **locked** — it cannot be cancelled by the customer.
- An order that reaches `Received` and is **not paid within 30 minutes is cancelled automatically**.
- Customer cancellation is allowed **only before payment is confirmed**.

## Money rules

- Currency is **Nigerian Naira**.
- Store money as **whole naira integers**. Never store decimals, floats, or kobo. A column holding `₦1500` is `1500`.
- **Delivery fee** = a flat amount set by the admin.
- **Service fee** = a percentage of the **food subtotal only** (never applied to the delivery fee).
- Both values live in a **settings table**. **Never hardcode a fee or a percentage in a component.**
- Rounding: round service fee **to the nearest naira** (₦7.50 → ₦8).
- **Minimum order value is ₦500** (food subtotal).
- Total = `food subtotal + delivery fee + service fee`.
- Displayed prices are final: if a restaurant raises its price after an order is placed, **the business absorbs the difference**. No price-adjustment step in v1.
- Money display uses the `₦` symbol and thousands separators: `₦1,500`.

## Coding conventions

- **TypeScript everywhere.** No `any` without a written reason. Types describe money as `number` (integers only).
- **Small components.** One component = one job. If a file passes ~150 lines, split it. Keep page files thin; put reusable logic in `lib/`.
- **Mobile-first.** Design for a 360px-wide phone screen, then scale up. Assume most customers are on phones on mobile data.
- **Plain-language comments.** Write comments for a beginner: say *why* the code exists, not what the syntax does. `// Customer cancels only before payment is confirmed` — not `// if check`.
- **No secrets in code.** Keys and tokens go in `.env.local`, read via `process.env.NEXT_PUBLIC_SUPABASE_URL` etc. Add `.env*` to `.gitignore`. The Supabase **anon** key is safe to expose in the browser; the **service role** key is not and must never be client-side.
- **Money formatting** goes through one helper in `lib/money.ts`. Never scatter `toLocaleString` calls around the codebase.
- Statuses come from one shared constant, never from strings typed inline.

## Working rules

- **One feature at a time.** Build a single feature, show it works, get confirmation, **then** move to the next. Do not start the following feature in the same pass.
- **Confirm before moving on.** Stop at the end of each feature and say what is done and how to check it.
- **Keep it simple.** Do not add features, fields, statuses, or pages that have not been asked for. If you think something is missing, ask first.
- **Stay out of scope for v1:** live GPS maps, restaurant logins, ratings, promo codes, multiple cities, distance-based pricing, price rules, file uploads for images (use image URLs for now).

## Documentation

- `docs/SPEC.md` — the full specification.
- `docs/ROADMAP.md` — the phase list, one checkbox per step.
- `docs/SETUP-CHECKLIST.md` — the non-coding setup the owner does by hand.
