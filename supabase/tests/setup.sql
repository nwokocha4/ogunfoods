-- Create non-superuser roles like Supabase's, so RLS actually applies
-- (postgres as superuser would bypass it entirely).
create role authenticated nologin;
create role anon nologin;
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated, anon;
grant usage on all sequences in schema public to authenticated, anon;
grant execute on all functions in schema public to authenticated, anon;

-- Four people sign up. The signup trigger should make each a profile.
insert into auth.users (id, phone, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','+2348000000001','{"full_name":"Owner"}'),
 ('22222222-2222-2222-2222-222222222222','+2348000000002','{"full_name":"Cust A"}'),
 ('33333333-3333-3333-3333-333333333333','+2348000000003','{"full_name":"Cust B"}'),
 ('44444444-4444-4444-4444-444444444444','+2348000000004','{"full_name":"Agent"}');

update public.profiles set role='admin' where id='11111111-1111-1111-1111-111111111111';
update public.profiles set role='agent' where id='44444444-4444-4444-4444-444444444444';

insert into public.restaurants (id,name,is_active) values
 ('aaaaaaaa-0000-0000-0000-000000000001','Test Kitchen', true),
 ('aaaaaaaa-0000-0000-0000-000000000002','Hidden Kitchen', false);
insert into public.menu_items (restaurant_id,name,price,is_available) values
 ('aaaaaaaa-0000-0000-0000-000000000001','Jollof rice',3500,true),
 ('aaaaaaaa-0000-0000-0000-000000000001','Sold out dish',2000,false);
insert into public.delivery_areas (name) values ('Ikeja');

-- Cart for customer A, so the cart assertions have something to read.
insert into public.carts (id, restaurant_id) values ('22222222-2222-2222-2222-222222222222','aaaaaaaa-0000-0000-0000-000000000001');
insert into public.cart_items (cart_id, item_name, unit_price, quantity) values ('22222222-2222-2222-2222-222222222222','Jollof rice',3500,2);
insert into public.settings (id) values (1);

-- Order 1: Cust A, assigned to the agent.
insert into public.orders (id,customer_id,restaurant_id,agent_id,customer_name,customer_phone,delivery_address,food_subtotal,delivery_fee,service_fee,total,status,payment_confirmed_at)
 values ('bbbbbbbb-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','aaaaaaaa-0000-0000-0000-000000000001','44444444-4444-4444-4444-444444444444','Cust A','+2348000000002','Ikeja',3500,1000,175,4675,'confirmed',now());
-- Order 2: Cust B, not yet assigned to anyone.
insert into public.orders (id,customer_id,restaurant_id,customer_name,customer_phone,delivery_address,food_subtotal,delivery_fee,service_fee,total)
 values ('bbbbbbbb-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','aaaaaaaa-0000-0000-0000-000000000001','Cust B','+2348000000003','Ikeja',3500,1000,175,4675);

insert into public.order_items (order_id, menu_item_id, item_name, unit_price, quantity)
 select o.id, m.id, m.name, 3500, 1 from public.orders o, public.menu_items m
 where o.id='bbbbbbbb-0000-0000-0000-000000000001' and m.name='Jollof rice';
