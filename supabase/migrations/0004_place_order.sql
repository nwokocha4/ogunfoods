-- =====================================================================
-- Foodrun — Phase 3, step 6: secure order placement
-- =====================================================================
-- HOW TO RUN THIS
-- 1. Open your Supabase project dashboard.
-- 2. Click "SQL Editor" in the left sidebar, then "New query".
-- 3. Paste everything below and click "Run".
-- 4. Expected: "Success. No rows returned".
--
-- WHAT THIS FILE DOES
-- Customers cannot insert orders directly (there is deliberately no RLS
-- rule for it — see 0002_rls.sql). Instead the website calls the
-- place_order() function below, which runs as the database itself
-- ("security definer") and works out every number from the database:
-- cart lines, fees from settings, the ₦500 minimum. The browser only
-- supplies the delivery details the customer typed. A forged request
-- cannot set its own total because the total is never an input.
--
-- IF SOMETHING GOES WRONG
-- "already exists" -> you ran it twice. That is harmless; the function
-- was replaced with an identical copy. Carry on.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. THE FUNCTION
-- ---------------------------------------------------------------------
-- Returns the new order's id. Raises an error (which the website shows
-- as "back to checkout/cart") when anything is wrong: empty cart,
-- unknown area, below minimum, or prices that moved mid-checkout.
--
-- Prices are re-read from menu_items at placement time. If a restaurant
-- changed a price after the customer added the dish, the order uses the
-- NEW price — the business absorbs the difference (see CLAUDE.md).

create or replace function public.place_order(
 p_name text,
 p_phone text,
 p_address text,
 p_area_id uuid,
 p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
 v_customer_id uuid := auth.uid();
 v_cart_restaurant_id uuid;
 v_settings record;
 v_subtotal integer := 0;
 v_service_fee integer;
 v_total integer;
 v_order_id uuid;
begin
 -- Only a signed-in customer can place an order. The dashboard bypass
 -- (trusted backend) is for your own manual corrections.
 if v_customer_id is null and not public.is_trusted_backend() then
 raise exception 'not signed in';
 end if;
 if v_customer_id is null then
 raise exception 'no customer';
 end if;

 -- The cart must exist, belong to a restaurant, and have lines.
 select restaurant_id into v_cart_restaurant_id
 from public.carts where id = v_customer_id;
 if v_cart_restaurant_id is null then
 raise exception 'cart is empty';
 end if;
 if not exists (
 select 1 from public.cart_items where cart_id = v_customer_id
 ) then
 raise exception 'cart is empty';
 end if;

 -- Delivery details must be real: non-empty, and an active admin area.
 if p_name is null or btrim(p_name) = '' then
 raise exception 'name is required';
 end if;
 if p_phone is null or btrim(p_phone) = '' then
 raise exception 'phone is required';
 end if;
 if p_address is null or btrim(p_address) = '' then
 raise exception 'address is required';
 end if;
 if not exists (
 select 1 from public.delivery_areas
 where id = p_area_id and is_active = true
 ) then
 raise exception 'unknown delivery area';
 end if;

 -- Fees from settings, subtotal re-priced from the menu.
 select delivery_fee, service_fee_percent, minimum_order
 into v_settings from public.settings where id = 1;
 if v_settings is null then
 raise exception 'shop settings missing';
 end if;

 select coalesce(sum(m.price * c.quantity), 0) into v_subtotal
 from public.cart_items c
 join public.menu_items m on m.id = c.menu_item_id
 where c.cart_id = v_customer_id and m.is_available = true;

 if v_subtotal < v_settings.minimum_order then
 raise exception 'below minimum order';
 end if;

 v_service_fee := round(
 v_subtotal * v_settings.service_fee_percent / 100
 );
 v_total := v_subtotal + v_settings.delivery_fee + v_service_fee;

 -- Reference (LFD-####) and expires_at (+30 min) come from the table
 -- defaults. Status defaults to 'received'.
 insert into public.orders (
 customer_id, restaurant_id, customer_name, customer_phone,
 delivery_address, delivery_area_id, notes,
 food_subtotal, delivery_fee, service_fee, total
 ) values (
 v_customer_id, v_cart_restaurant_id, btrim(p_name), btrim(p_phone),
 btrim(p_address), p_area_id, nullif(btrim(coalesce(p_notes, '')), ''),
 v_subtotal, v_settings.delivery_fee, v_service_fee, v_total
 )
 returning id into v_order_id;

 -- Freeze the lines at the prices just charged.
 insert into public.order_items (
 order_id, menu_item_id, item_name, unit_price, quantity
 )
 select
 v_order_id, m.id, m.name, m.price, c.quantity
 from public.cart_items c
 join public.menu_items m on m.id = c.menu_item_id
 where c.cart_id = v_customer_id and m.is_available = true;

 -- The cart has become an order: empty it.
 delete from public.cart_items where cart_id = v_customer_id;
 update public.carts
 set restaurant_id = null where id = v_customer_id;

 return v_order_id;
end;
$$;

-- The website calls this as the signed-in customer.
grant execute on function public.place_order(text, text, text, uuid, text)
to authenticated;
