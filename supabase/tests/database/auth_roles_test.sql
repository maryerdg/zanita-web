BEGIN;
SELECT plan(22);

-- ==========================================================================
-- SETUP: Mocks de usuarios y datos de prueba
-- Usamos prefijos distintos al seed (ffff/9999) para evitar conflictos de PK
-- ==========================================================================
INSERT INTO auth.users (id, email) VALUES
  ('99999999-9999-9999-9999-999999999991', 'cust@test.com'),
  ('99999999-9999-9999-9999-999999999992', 'admin@test.com'),
  ('99999999-9999-9999-9999-999999999993', 'custspec@test.com');

SELECT set_config('tests.cust_id',      '99999999-9999-9999-9999-999999999991', true);
SELECT set_config('tests.admin_id',     '99999999-9999-9999-9999-999999999992', true);
SELECT set_config('tests.spec_cust_id', '99999999-9999-9999-9999-999999999993', true);

-- Forzar roles directamente como postgres (bypassea RLS)
UPDATE public.profiles SET role = 'customer'  WHERE id = current_setting('tests.cust_id')::uuid;
UPDATE public.profiles SET role = 'admin'     WHERE id = current_setting('tests.admin_id')::uuid;
UPDATE public.profiles SET role = 'customer', cetys_pickup_enabled = true
  WHERE id = current_setting('tests.spec_cust_id')::uuid;

-- Puntos de entrega de prueba (prefijo ffff para no chocar con seed dddd)
INSERT INTO public.zanita_delivery_points
  (id, name, type, requires_quote, requires_special_pickup_permission, is_active, display_order)
VALUES
  ('ffff0000-0000-0000-0000-000000000001', 'Test Normal Activo',  'standard', false, false, true,  50),
  ('ffff0000-0000-0000-0000-000000000002', 'Test CETYS Activo',   'special',  false, true,  true,  51),
  ('ffff0000-0000-0000-0000-000000000003', 'Test CETYS Inactivo', 'special',  false, true,  false, 52),
  ('ffff0000-0000-0000-0000-000000000004', 'Test Foraneo Cotiza', 'other',    true,  false, true,  53);

-- Producto de prueba (prefijo 9999 para no chocar con seed aaaa)
INSERT INTO public.zanita_products
  (id, slug, name, tagline, base_price_cents, category, category_label, is_active, display_order)
VALUES
  ('9999aaaa-0000-0000-0000-000000000001', 'test-product-rls', 'Test Product RLS', 'Test', 20000, 'test', 'Test Cat', true, 99);

-- Option Group de prueba (prefijo 9999 para no chocar con seed bbbb)
INSERT INTO public.zanita_option_groups (id, name) VALUES
  ('9999bbbb-0000-0000-0000-000000000001', 'Test Toppings');

-- Order de prueba (pertenece al customer normal)
INSERT INTO public.zanita_orders (
  id, order_number, user_id,
  customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
  products_subtotal_cents, total_amount_cents,
  requested_date, requested_time,
  delivery_name_snapshot, delivery_type_snapshot, delivery_requires_quote_snapshot
) VALUES (
  '11111111-1111-1111-1111-111111111111', 'ZAN-9901',
  current_setting('tests.cust_id')::uuid,
  'Test Customer', '6640000000', 'cust@test.com',
  20000, 20000,
  '2026-10-01', '12:00:00',
  'Test Normal Activo', 'standard', false
);

-- Order Item de prueba (base=200, final=250 con extras, qty=2 => subtotal=500)
INSERT INTO public.zanita_order_items (
  id, order_id, product_id, product_name_snapshot,
  base_unit_price_snapshot_cents,
  final_unit_price_snapshot_cents,
  quantity, subtotal_cents
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  '9999aaaa-0000-0000-0000-000000000001',
  'Test Product RLS',
  200, 250, 2, 500
);

-- Orden con delivery_point_id NULL (para probar snapshot historico)
INSERT INTO public.zanita_orders (
  id, order_number, user_id,
  customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
  products_subtotal_cents, total_amount_cents,
  requested_date, requested_time,
  delivery_point_id,
  delivery_name_snapshot, delivery_type_snapshot, delivery_requires_quote_snapshot
) VALUES (
  '33333333-3333-3333-3333-333333333333', 'ZAN-SNAP',
  current_setting('tests.admin_id')::uuid,
  'Test Admin', '0000000000', 'admin@test.com',
  5000, 5000, '2026-10-01', '10:00:00',
  NULL,
  'Punto Eliminado (historico)', 'standard', false
);

-- ==========================================================================
-- BLOQUE 1: Anon
-- ==========================================================================
SET role anon;
SET LOCAL request.jwt.claims = '{}';

SELECT throws_ok(
  $$ SELECT count(*) FROM public.profiles $$,
  '42501', NULL, 'Anon: no puede leer perfiles'
);

-- Seed tiene 2 normales/other activos (dddd..001, dddd..004)
-- Test tiene 2 normales/other activos (ffff..001, ffff..004)
-- Total 4 puntos visibles para anon
SELECT is(
  (SELECT count(*) FROM public.zanita_delivery_points WHERE requires_special_pickup_permission = false AND is_active = true),
  4::bigint,
  'Anon: ve solo puntos sin permiso especial activos'
);

-- ==========================================================================
-- BLOQUE 2: Customer sin permiso especial
-- ==========================================================================
SET role authenticated;
SELECT set_config('request.jwt.claims', format('{"sub": "%s"}', current_setting('tests.cust_id')), true);

SELECT is(
  (SELECT count(*) FROM public.profiles),
  1::bigint,
  'Customer: solo ve su propio perfil'
);

SELECT throws_ok(
  $$ INSERT INTO public.profiles (id, full_name, phone, email) VALUES (gen_random_uuid(), 'x', 'x', 'x@x') $$,
  '42501', NULL, 'Customer: no puede insertar perfiles'
);

SELECT throws_ok(
  format($$ DELETE FROM public.profiles WHERE id = '%s'::uuid $$, current_setting('tests.cust_id')),
  '42501', NULL, 'Customer: no puede borrar perfiles'
);

SELECT throws_ok(
  format($$ UPDATE public.profiles SET role = 'admin' WHERE id = '%s'::uuid $$, current_setting('tests.cust_id')),
  'P0001', 'No tienes permisos para modificar el rol.',
  'Customer: trigger bloquea auto-escalada de rol'
);

SELECT throws_ok(
  format($$ UPDATE public.profiles SET cetys_pickup_enabled = true WHERE id = '%s'::uuid $$, current_setting('tests.cust_id')),
  'P0001', 'No tienes permisos para modificar privilegios especiales.',
  'Customer: trigger bloquea auto-habilitacion pickup'
);

SELECT lives_ok(
  format($$ UPDATE public.profiles SET phone = '6641234567' WHERE id = '%s'::uuid $$, current_setting('tests.cust_id')),
  'Customer: puede actualizar su telefono'
);

SELECT is(
  (SELECT count(*) FROM public.zanita_delivery_points WHERE requires_special_pickup_permission = true),
  0::bigint,
  'Customer sin permiso: no ve ningun punto especial'
);

SELECT is(
  (SELECT count(*) FROM public.zanita_orders),
  1::bigint,
  'Customer: ve solo su propia orden'
);

-- ==========================================================================
-- BLOQUE 3: Customer CON permiso especial
-- ==========================================================================
SELECT set_config('request.jwt.claims', format('{"sub": "%s"}', current_setting('tests.spec_cust_id')), true);

-- Seed activos: dddd..001 (normal), dddd..002 (especial activo), dddd..004 (other)
-- Test activos: ffff..001 (normal), ffff..002 (especial activo), ffff..004 (other)
-- NO activos (no visibles): dddd..003 (especial inactivo), ffff..003 (especial inactivo)
-- Total activos visibles: 6
SELECT is(
  (SELECT count(*) FROM public.zanita_delivery_points WHERE is_active = true),
  6::bigint,
  'Customer con permiso: ve 6 puntos activos (excluyendo los 2 especiales inactivos)'
);

-- ==========================================================================
-- BLOQUE 4: Admin
-- ==========================================================================
SELECT set_config('request.jwt.claims', format('{"sub": "%s"}', current_setting('tests.admin_id')), true);

SELECT is(
  (SELECT count(*) FROM public.profiles),
  3::bigint,
  'Admin: ve todos los perfiles'
);

-- Seed: dddd..001,002,003,004 (4) + Test: ffff..001,002,003,004 (4) = 8 total
SELECT is(
  (SELECT count(*) FROM public.zanita_delivery_points),
  8::bigint,
  'Admin: ve todos los puntos incluyendo inactivos'
);

-- Admin ve sus ordenes y la del customer (ZAN-9901 + ZAN-SNAP)
SELECT is(
  (SELECT count(*) FROM public.zanita_orders),
  2::bigint,
  'Admin: ve todas las ordenes'
);

SELECT lives_ok(
  format($$ UPDATE public.profiles SET cetys_pickup_enabled = true WHERE id = '%s'::uuid $$, current_setting('tests.cust_id')),
  'Admin: puede habilitar pickup a un customer'
);

-- ==========================================================================
-- BLOQUE 5: Constraints de DB (como postgres, sin RLS)
-- ==========================================================================
SET role postgres;

-- min_selections > max_selections debe fallar
SELECT throws_ok(
  $$ INSERT INTO public.zanita_product_option_groups
       (product_id, group_id, is_required, min_selections, max_selections)
     VALUES
       ('9999aaaa-0000-0000-0000-000000000001', '9999bbbb-0000-0000-0000-000000000001', true, 5, 3) $$,
  '23514', NULL, 'Constraint: min_selections no puede ser mayor que max_selections'
);

-- min=max=3 (exactamente N) es valido
SELECT lives_ok(
  $$ INSERT INTO public.zanita_product_option_groups
       (product_id, group_id, is_required, min_selections, max_selections)
     VALUES
       ('9999aaaa-0000-0000-0000-000000000001', '9999bbbb-0000-0000-0000-000000000001', true, 3, 3) $$,
  'Constraint: min=max=3 es valido (exactamente N toppings)'
);

-- subtotal != final_unit_price * quantity debe fallar
SELECT throws_ok(
  $$ INSERT INTO public.zanita_order_items
       (order_id, product_name_snapshot,
        base_unit_price_snapshot_cents, final_unit_price_snapshot_cents,
        quantity, subtotal_cents)
     VALUES
       ('11111111-1111-1111-1111-111111111111', 'Bad Item', 100, 200, 3, 999) $$,
  '23514', NULL, 'Constraint: subtotal debe ser final_unit_price_snapshot * quantity'
);

-- subtotal = final_unit_price * quantity (200 * 3 = 600) debe pasar
SELECT lives_ok(
  $$ INSERT INTO public.zanita_order_items
       (order_id, product_name_snapshot,
        base_unit_price_snapshot_cents, final_unit_price_snapshot_cents,
        quantity, subtotal_cents)
     VALUES
       ('11111111-1111-1111-1111-111111111111', 'Good Item', 150, 200, 3, 600) $$,
  'Order item: subtotal correcto (final_price * quantity = 600)'
);

-- Snapshot historico: delivery_name persiste aunque delivery_point_id sea NULL
SELECT is(
  (SELECT delivery_name_snapshot FROM public.zanita_orders WHERE id = '33333333-3333-3333-3333-333333333333'),
  'Punto Eliminado (historico)',
  'delivery_name_snapshot se conserva historicamente aunque delivery_point_id sea NULL'
);

-- delivery_quote_status rechaza valores invalidos
SELECT throws_ok(
  $$ INSERT INTO public.zanita_orders (
       order_number, customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
       products_subtotal_cents, total_amount_cents, requested_date, requested_time,
       delivery_name_snapshot, delivery_type_snapshot, delivery_requires_quote_snapshot,
       delivery_quote_status
     ) VALUES (
       'ZAN-BAD', 'X', '0', 'x@x', 100, 100, '2026-10-01', '10:00:00',
       'X', 'standard', false, 'valor_invalido'
     ) $$,
  '23514', NULL, 'Constraint: delivery_quote_status rechaza valores invalidos'
);

-- total_amount_cents debe igualar subtotal + delivery_fee
SELECT throws_ok(
  $$ INSERT INTO public.zanita_orders (
       order_number, customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
       products_subtotal_cents, delivery_fee_cents, total_amount_cents,
       requested_date, requested_time,
       delivery_name_snapshot, delivery_type_snapshot, delivery_requires_quote_snapshot
     ) VALUES (
       'ZAN-TOTAL', 'X', '0', 'x@x', 1000, 500, 1000, '2026-10-01', '10:00:00',
       'X', 'standard', false
     ) $$,
  '23514', NULL, 'Constraint: total_amount debe ser productos_subtotal + delivery_fee'
);

SELECT * FROM finish();
ROLLBACK;
