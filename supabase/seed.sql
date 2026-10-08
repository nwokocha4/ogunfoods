-- =====================================================================
-- Foodrun — Step 4: SAMPLE DATA (safe to delete)
-- =====================================================================
--
--   *** EVERYTHING IN THIS FILE IS PLACEHOLDER DATA. ***
--
--   These are not real partner restaurants. They exist so you can see
--   menus, carts and orders filling the screen while you build. Replace
--   them with your real restaurants before launch.
--
--   HOW TO RUN THIS
--     1. Supabase dashboard -> SQL Editor -> New query.
--     2. Paste everything below and click "Run".
--     3. Open "Table editor" and check: settings has 1 row,
--        restaurants has 3, menu_items has 15.
--
--   THIS FILE IS SAFE TO RUN AGAIN. It never overwrites a fee you have
--   already edited, and it never duplicates a row.
--
--   TO DELETE IT ALL (after your real data is in), see the block at the
--   very bottom of this file.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. SETTINGS — one row with the default fees and your bank details
-- ---------------------------------------------------------------------
-- Nothing here is a real account number. Fill in your own before launch.
-- Re-running the seed will NOT overwrite a fee you have already changed.

insert into public.settings (
  id, delivery_fee, service_fee_percent, minimum_order,
  bank_name, account_number, account_name, support_whatsapp
)
values (
  1,
  1000,   -- flat delivery fee, in whole naira
  5,      -- service fee as a percentage of the food subtotal
  500,    -- minimum food subtotal, in whole naira
  'GTBank',
  '0123456789',          -- PLACEHOLDER — replace with your real account number
  'Foodrun Logistics Ltd',
  '+234 800 000 0000'    -- PLACEHOLDER — replace with your real WhatsApp number
)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 2. DELIVERY AREAS — the fixed list customers pick from at checkout
-- ---------------------------------------------------------------------
-- Also sample data. Replace with the areas you actually deliver to.

insert into public.delivery_areas (id, name, is_active) values
  ('e0000011-0000-4000-a000-000000000001', 'Ikeja',            true),
  ('e0000011-0000-4000-a000-000000000002', 'Yaba',             true),
  ('e0000011-0000-4000-a000-000000000003', 'Surulere',         true),
  ('e0000011-0000-4000-a000-000000000004', 'Victoria Island',  true),
  ('e0000011-0000-4000-a000-000000000005', 'Lekki Phase 1',    true)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 3. RESTAURANTS — 3 sample partners
-- ---------------------------------------------------------------------
-- Fixed ids (the e0000... ones) are deliberate: they let the menu below
-- point at the right restaurant every time you re-run this file.

insert into public.restaurants (id, name, description, address, opening_hours, is_active)
values
  (
    'e0000001-0000-4000-a000-000000000001',
    'Mama Nkechi''s Kitchen',
    'Home-style Nigerian cooking. Rice dishes, soups and swallow.',
    '12 Awolowo Road, Ikeja',
    '8:00 AM - 9:00 PM',
    true
  ),
  (
    'e0000002-0000-4000-a000-000000000002',
    'Chopspot Grill',
    'Suya, grilled chicken, peppered things and small chops.',
    'Herbert Macaulay Way, Yaba',
    '11:00 AM - 10:00 PM',
    true
  ),
  (
    'e0000003-0000-4000-a000-000000000003',
    'The Potters Pot',
    'Rice, stews and swallow. Portions are generous.',
    'Adeniran Ogunsanya, Surulere',
    '9:00 AM - 8:30 PM',
    true
  )
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 4. MENU ITEMS — about 5 dishes per restaurant
-- ---------------------------------------------------------------------
-- Prices are WHOLE NAIRA integers with no decimals: 3500 means ₦3,500.
-- image_url is left empty on purpose. Paste a real photo address later.

-- Mama Nkechi's Kitchen
insert into public.menu_items (id, restaurant_id, name, description, price, is_available) values
  ('e0000101-0000-4000-a000-000000000001', 'e0000001-0000-4000-a000-000000000001',
   'Jollof rice & chicken', 'Party jollof, one grilled chicken, fried plantain.', 3500, true),
  ('e0000102-0000-4000-a000-000000000002', 'e0000001-0000-4000-a000-000000000001',
   'Egusi soup & pounded yam', 'Assorted meat and goat meat, fresh egusi soup.', 4200, true),
  ('e0000103-0000-4000-a000-000000000003', 'e0000001-0000-4000-a000-000000000001',
   'Fried rice & beef', 'Coconut fried rice with stir-fried beef.', 3800, true),
  ('e0000104-0000-4000-a000-000000000004', 'e0000001-0000-4000-a000-000000000001',
   'Catfish pepper soup', 'Peppered catfish broth. Extra spice on request.', 3000, true),
  ('e0000105-0000-4000-a000-000000000005', 'e0000001-0000-4000-a000-000000000001',
   'Chapman (50cl)', 'Cold blended fruit punch.', 1200, true)
on conflict (id) do nothing;

-- Chopspot Grill
insert into public.menu_items (id, restaurant_id, name, description, price, is_available) values
  ('e0000201-0000-4000-a000-000000000001', 'e0000002-0000-4000-a000-000000000002',
   'Suya platter (beef)', 'Spiced beef suya, onions and yaji.', 2800, true),
  ('e0000202-0000-4000-a000-000000000002', 'e0000002-0000-4000-a000-000000000002',
   'Grilled chicken (full)', 'Whole chicken, char-grilled, with extra sauce.', 4500, true),
  ('e0000203-0000-4000-a000-000000000003', 'e0000002-0000-4000-a000-000000000002',
   'Peppered gizzard', 'Fried gizzard in a hot pepper sauce.', 2500, true),
  ('e0000204-0000-4000-a000-000000000004', 'e0000002-0000-4000-a000-000000000002',
   'Small chops platter', 'Puff-puff, samosa, spring rolls and gizdodo.', 2000, true),
  ('e0000205-0000-4000-a000-000000000005', 'e0000002-0000-4000-a000-000000000002',
   'Asun (spicy goat)', 'Grilled goat meat, very peppered.', 3200, false)  -- mark sold out
on conflict (id) do nothing;

-- The Potters Pot
insert into public.menu_items (id, restaurant_id, name, description, price, is_available) values
  ('e0000301-0000-4000-a000-000000000001', 'e0000003-0000-4000-a000-000000000003',
   'Rice & stew with turkey', 'White rice, rich stew, one turkey wing.', 3600, true),
  ('e0000302-0000-4000-a000-000000000002', 'e0000003-0000-4000-a000-000000000003',
   'Amala, ewedu & gbegiri', 'Amala with ewedu, gbegiri and assorted meat.', 3400, true),
  ('e0000303-0000-4000-a000-000000000003', 'e0000003-0000-4000-a000-000000000003',
   'Ewa agoyin & plantain', 'Mashed beans with dark pepper sauce and fried plantain.', 2200, true),
  ('e0000304-0000-4000-a000-000000000004', 'e0000003-0000-4000-a000-000000000003',
   'Ofada rice & ayamase', 'Local rice with green pepper sauce and assorted meat.', 4000, true),
  ('e0000305-0000-4000-a000-000000000005', 'e0000003-0000-4000-a000-000000000003',
   'Zobo drink (75cl)', 'Chilled hibiscus drink.', 900, true)
on conflict (id) do nothing;


-- =====================================================================
-- HOW TO DELETE THIS SAMPLE DATA
-- =====================================================================
-- Paste the block below (remove the "-- " from the start of each line)
-- ONLY once your real restaurants, menus and areas are entered.
--
--   delete from public.order_items;
--   delete from public.orders;
--   delete from public.menu_items
--     where id like 'e00001%' or id like 'e00002%' or id like 'e00003%';
--   delete from public.restaurants
--     where id like 'e000000%';
--   delete from public.delivery_areas
--     where id like 'e0000011%';
--   delete from public.settings where id = 1;
--
-- The order_items / orders deletes come first because those tables
-- point back at the restaurants. Skip them if you have real orders
-- you want to keep.
-- =====================================================================