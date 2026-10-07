# Foodrun — Project Specification

**Project folder:** `Ogunfoods`
**Currency:** Nigerian Naira (₦), stored as whole numbers
**Audience for this document:** the owner (a beginner) and Claude, who builds from it.

---

## 1. What this is

Foodrun is a food delivery website for Lagos, Nigeria.

The owner runs the business **by hand**:

1. A customer orders from a partner restaurant on the site.
2. The customer pays **first** by bank transfer.
3. The owner (admin) confirms the payment.
4. The admin buys the food at the restaurant through an **agent** on the ground.
5. The agent delivers it.

The website records the orders, shows payment instructions, and shows the customer how far the delivery has got. It does not talk to restaurants automatically.

---

## 2. Roles

| Role | What they do | How they log in |
| --- | --- | --- |
| **Customer** | Browses restaurants and menus, builds a cart, checks out, pays, tracks orders | Phone number + OTP |
| **Admin (the owner)** | Manages restaurants, menus, prices, fees, payment details, delivery areas. Confirms payments. Registers agents. Assigns agents to orders. Updates order statuses | Phone number + OTP, with `role = admin` |
| **Agent** | Sees **only** the orders assigned to them on a mobile-friendly page and updates the status | Phone number + OTP, registered by the admin |

**No restaurant logins in v1.** Restaurants are data, managed by the admin.

**Browsing is open.** Anyone can look at restaurants and menus without logging in. Login is asked for at checkout.

---

## 3. Customer pages

These are the pages the customer sees, in the order they use them.

### 3.1 Home
- List of partner restaurants: name, image, address, opening hours.
- Search or filter is **not** required in v1 unless asked for.
- Tapping a restaurant opens its menu.

### 3.2 Restaurant menu
- Restaurant header: name, image, address, opening hours.
- List of menu items: name, description, price, image, and a clear marker when an item is unavailable.
- Add to cart button on each item.

### 3.3 Cart
- Line items with quantity and price.
- Food subtotal.
- **One cart belongs to one restaurant.** Adding an item from a different restaurant asks the customer to confirm clearing the cart first.
- Minimum order check: **food subtotal must be at least ₦500**.
- The cart is stored in the database (survives refresh and login).

### 3.4 Checkout
- Fields: **name, phone, delivery address (with a delivery area from the admin's list), notes**.
- Fees shown as separate lines:

  ```
  Food subtotal        ₦ x,xxx
  Delivery fee         ₦   xxx     <- flat, from settings
  Service fee          ₦   xxx     <- % of food subtotal, from settings
  Total                ₦ x,xxx
  ```
- The delivery area must be one of the areas the admin entered.
- A button to place the order.

### 3.5 Order confirmation
- Shows the order reference, e.g. **`LFD-4821`**, and the total to pay.
- Shows **bank transfer instructions**: account details (from settings), the exact amount, and a reminder to put the order reference in the transfer narration.
- States plainly: **"Your order will not be prepared until your payment is confirmed."**
- Nothing is purchased by the restaurant or agent until the admin confirms payment.

### 3.6 My orders
- List of the customer's orders.
- Each order shows its reference, restaurant, total, and current status.
- A **live progress bar** showing: `Received → Confirmed → Agent buying → Picked up → On the way → Delivered`.
- Status changes arrive in **real time** via Supabase Realtime — no manual refresh needed.
- `Cancelled` shows as a dead-end state, not a step on the bar.

---

## 4. Order flow (end to end)

```
Customer browses (no login)
  → adds to cart (one restaurant per cart)
  → logs in with phone + OTP  (at checkout)
  → checks out: name, phone, address, area, notes
  → order saved as "Received"
  → sees bank transfer instructions with order reference
  → pays by bank transfer
  → ADMIN confirms payment      → status "Confirmed"  (order now locked)
  → admin assigns an agent
  → agent updates: Agent buying → Picked up → On the way → Delivered
  → customer watches it live on "My orders"
```

**Payment is the gate.** Before `Confirmed`, the admin buys nothing.

---

## 5. Order statuses

Fixed list, in order:

| # | Status | Meaning | Who sets it |
| --- | --- | --- | --- |
| 1 | `Received` | Order placed, payment not verified | System on checkout |
| 2 | `Confirmed` | **Payment verified** — the order is now locked | Admin |
| 3 | `Agent buying` | Agent is at the restaurant buying the food | Agent |
| 4 | `Picked up` | Food collected | Agent |
| 5 | `On the way` | Agent is delivering | Agent |
| 6 | `Delivered` | Finished | Agent |
| - | `Cancelled` | Terminal, not on the progress bar | System or Admin |

**Rules**
- Statuses move forward only. Never insert or reorder a status without the owner's approval.
- `Confirmed` means payment verified and nothing else.
- **Customer may cancel only before payment is confirmed.**
- **After `Confirmed`, the order is locked** — no customer cancellation.
- **Auto-cancel:** an order still at `Received` after **30 minutes** is cancelled automatically (background job on Vercel).
- The admin can cancel an order in any state.

---

## 6. Money rules

- Currency: **Nigerian Naira**. Stored as **whole naira integers** — no decimals, no floats, no kobo.
- **Delivery fee** = a flat amount, set by the admin.
- **Service fee** = a percentage of the **food subtotal only**, set by the admin. Never applied to the delivery fee.
- Both are stored in a **settings table**. Never hardcoded in a component.
- Rounding: **to the nearest naira** (₦7.50 → ₦8).
- **Minimum order value: ₦500** food subtotal.
- **Total = food subtotal + delivery fee + service fee.**
- Prices are final when the order is placed. If a restaurant's price changes afterwards, **the business absorbs the difference** — there is no re-pricing step in v1.
- Display: `₦1,500` with the `₦` symbol and thousands separators.

---

## 7. Data model (tables)

Plain-language description of what each table holds. Exact column types are decided in Phase 1.

| Table | Holds | Key points |
| --- | --- | --- |
| `profiles` | One row per user | `phone`, `role` (`customer` / `admin` / `agent`), name. The owner's row has `role = admin` |
| `restaurants` | Partner restaurants | name, image **URL**, address, opening hours, active flag |
| `menu_items` | Food on a menu | restaurant id, name, description, price (whole ₦), image URL, available flag |
| `carts` / `cart_items` | The customer's cart | One cart per customer, **tied to one restaurant** |
| `delivery_areas` | The fixed list of areas | Admin fills this in before launch |
| `orders` | One row per order | reference (e.g. `LFD-4821`), customer, restaurant, address, area, notes, status, timestamps, `payment_confirmed_at`, `expires_at` (placement + 30 min) |
| `order_items` | Lines on an order | Item, quantity, price **at time of order** |
| `settings` | Fee settings and payment details | flat delivery fee, service fee %, bank account details, minimum order ₦500. Single row, edited by the admin |
| `order_agents` | Which agent is on which order | Set by the admin after confirming payment |

**Row-level security (RLS):**
- Customers read **only their own** orders and cart.
- Agents read **only orders assigned to them**.
- Admin can read and write everything.
- Public, unauthenticated customers read active restaurants and menu items.
- Only the admin writes to `restaurants`, `menu_items`, `settings`, `delivery_areas`.

---

## 8. Admin (managed in the Supabase table editor)

For v1 the admin works **directly in Supabase's table editor** — no admin page is built. The owner edits:

- restaurants and their menus
- prices
- the settings row (delivery fee, service fee %, bank account details, minimum order)
- the delivery areas list
- confirming payments (set `payment_confirmed_at` and move status to `Confirmed`)
- assigning an agent
- updating order statuses

This is deliberately simple. A dedicated `/admin` UI can come later if the table editor becomes painful.

---

## 9. Payments

**v1: manual bank transfer.**

- One bank account for everyone, details held in the `settings` table.
- On the confirmation page the customer sees the account details, the total, and their **order reference**.
- The customer puts the **order reference in the transfer narration** so the owner can match the transfer to the order.
- The owner matches the transfer in their bank app, then confirms it in Supabase.

**Later (Phase 5): Paystack** for card/USSD payments. The spec and schema keep room for a `payment_method` and `payment_reference` field, but nothing Paystack-specific is built in v1.

---

## 10. Notifications

**v1: none.** The "My orders" page is the only channel.

Later (Phase 5): SMS and/or WhatsApp when an order is confirmed and when it is delivered.

---

## 11. Delivery areas

- The list is **not hardcoded**. It lives in the `delivery_areas` table.
- The admin fills in the list **before launch**.
- Checkout shows a fixed dropdown of those areas — the customer cannot type an address outside the list.
- There is one **flat** delivery fee for every area (no distance pricing in v1).

---

## 12. Out of scope for v1

Live GPS maps · restaurant logins · ratings and reviews · promo codes · multiple cities · delivery distance pricing · file uploads (images are URLs) · a dedicated admin UI · Paystack · SMS/WhatsApp notifications.

**Rule: do not add anything on this list, or anything else not asked for, without checking first.**
