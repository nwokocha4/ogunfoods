# Foodrun — Roadmap

Work through these phases in order. **One step at a time** — finish a step, confirm it works, then tick it off and move on.

Legend: `[ ]` not done · `[x]` done

---

## Phase 1: Foundation

The skeleton. Nothing works for a customer yet — this just makes the project real.

- [ ] Create the Next.js + Tailwind project scaffold
- [ ] Create the Supabase project and connect it to the codebase
- [ ] Add environment variables to `.env.local` (Supabase URL + anon key) and confirm `.env*` is git-ignored
- [ ] Create the database tables (profiles, restaurants, menu_items, carts, cart_items, orders, order_items, settings, delivery_areas, order_agents)
- [ ] Seed the settings row (delivery fee, service fee %, minimum order ₦500, bank details)
- [ ] Phone + OTP login working
- [ ] Create the admin profile (`role = admin`)
- [ ] Row-level security on every table (customers see only their own orders, agents only their assigned ones, admin sees all)
- [ ] Roles work: customer, admin, agent

**Checkpoint:** you can log in with your phone and the database refuses to let one customer read another's order.

---

## Phase 2: Browsing

- [ ] Home page with the restaurant list
- [ ] Restaurant menu page
- [ ] Menu items with price, image URL, and unavailable marker
- [ ] Works properly on a phone screen

**Checkpoint:** a guest can browse restaurants and menus without logging in.

---

## Phase 3: Cart and checkout

- [ ] Add to cart
- [ ] Cart page with quantities and food subtotal
- [ ] One-restaurant-per-cart rule (switching restaurants asks to clear the cart)
- [ ] ₦500 minimum order check
- [ ] Checkout page: name, phone, delivery address, delivery area from the admin's list, notes
- [ ] Fees displayed from the settings table: food subtotal + delivery fee + service fee = total
- [ ] Login with phone + OTP triggered at checkout
- [ ] Order saved as `Received` with its `LFD-####` reference
- [ ] 30-minute auto-cancel timer set on the order

**Checkpoint:** a full order lands in the database with the right total.

---

## Phase 4: Order tracking with live status

- [ ] Order confirmation page with the order reference and bank transfer instructions
- [ ] "My orders" page listing the customer's orders
- [ ] Progress bar: Received → Confirmed → Agent buying → Picked up → On the way → Delivered
- [ ] Supabase Realtime so status changes appear without refreshing
- [ ] `Cancelled` shown as a dead-end state
- [ ] Agent page: mobile-friendly, shows only that agent's assigned orders
- [ ] Agent can advance the status
- [ ] Admin can assign an agent to an order
- [ ] 30-minute auto-cancel job actually fires (on Vercel)
- [ ] Customer cancellation allowed before payment only; order locked after `Confirmed`

**Checkpoint:** change a status as the agent and watch it update on the customer's phone.

---

## Phase 5: Payment and notifications

- [ ] Admin confirms a payment from Supabase (sets `payment_confirmed_at`, status → `Confirmed`)
- [ ] Order reference matching flow verified end to end
- [ ] Paystack integration (card/USSD)
- [ ] SMS notifications
- [ ] WhatsApp notifications

**Checkpoint:** a real test payment goes from `Received` to `Delivered`.

---

## Phase 6: Polish and launch

- [ ] Delivery areas filled in for real
- [ ] Restaurant and menu content entered
- [ ] Bank account details correct in settings
- [ ] Mobile and speed pass
- [ ] Custom domain connected on Vercel
- [ ] Test orders end to end from a real phone
- [ ] Go live

---

## Explicitly out of scope for v1

Live GPS maps · restaurant logins · ratings · promo codes · multiple cities · distance-based pricing · image file uploads · a dedicated admin UI.
