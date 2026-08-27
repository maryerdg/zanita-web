BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(14);

-- Usuarios Mock
-- '99999999-9999-9999-9999-999999999992' = customer
-- '99999999-9999-9999-9999-999999999993' = cetys
-- '99999999-9999-9999-9999-999999999994' = admin

SET LOCAL role postgres;
INSERT INTO auth.users (id) VALUES
  ('99999999-9999-9999-9999-999999999992'),
  ('99999999-9999-9999-9999-999999999993'),
  ('99999999-9999-9999-9999-999999999994');

INSERT INTO public.zanita_profiles (id, role) VALUES
  ('99999999-9999-9999-9999-999999999992', 'customer'),
  ('99999999-9999-9999-9999-999999999993', 'cetys'),
  ('99999999-9999-9999-9999-999999999994', 'admin');

-- Agregar un punto CETYS y uno estándar
INSERT INTO public.zanita_delivery_points (id, name, type, requires_cetys_role) VALUES
  ('eeee0000-0000-0000-0000-000000000001', 'Punto Publico', 'standard', false),
  ('eeee0000-0000-0000-0000-000000000002', 'Punto CETYS', 'cetys', true);

-- Agregar settings públicas y privadas
INSERT INTO public.zanita_store_settings (key, value, is_public) VALUES
  ('setting_public', 'true', true),
  ('setting_private', 'true', false);

-- =================================================================================
-- TESTS DE LECTURA (CETYS)
-- =================================================================================

-- 1. Anon no ve CETYS
SET LOCAL role anon;
SET LOCAL request.jwt.claims TO '{}';
SELECT results_eq(
  'SELECT name FROM public.zanita_delivery_points WHERE requires_cetys_role = true',
  $$VALUES ('Punto Publico'::text) LIMIT 0$$,
  'Anon no ve CETYS'
);

-- 2. Customer no ve CETYS
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"99999999-9999-9999-9999-999999999992","role":"authenticated"}';
SELECT results_eq(
  'SELECT name FROM public.zanita_delivery_points WHERE requires_cetys_role = true',
  $$VALUES ('Punto Publico'::text) LIMIT 0$$,
  'Customer no ve CETYS'
);

-- 3. Cetys sí ve CETYS
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"99999999-9999-9999-9999-999999999993","role":"authenticated"}';
SELECT results_eq(
  'SELECT name FROM public.zanita_delivery_points WHERE name = ''Punto CETYS''',
  $$VALUES ('Punto CETYS'::text)$$,
  'Cetys sí ve CETYS'
);

-- 4. Admin sí ve CETYS
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"99999999-9999-9999-9999-999999999994","role":"authenticated"}';
SELECT results_eq(
  'SELECT name FROM public.zanita_delivery_points WHERE name = ''Punto CETYS''',
  $$VALUES ('Punto CETYS'::text)$$,
  'Admin sí ve CETYS'
);

-- =================================================================================
-- TESTS DE ESCRITURA (PERFILES)
-- =================================================================================

-- 5. Customer puede insertar su propio perfil como customer
SET LOCAL role postgres;
INSERT INTO auth.users (id) VALUES ('99999999-9999-9999-9999-999999999995');
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"99999999-9999-9999-9999-999999999995","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO public.zanita_profiles (id, role) VALUES ('99999999-9999-9999-9999-999999999995', 'customer')$$,
  'Customer puede insertar su propio perfil como customer'
);

-- 6. Customer no puede insertar perfil cetys
SET LOCAL role postgres;
INSERT INTO auth.users (id) VALUES ('99999999-9999-9999-9999-999999999996');
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"99999999-9999-9999-9999-999999999996","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO public.zanita_profiles (id, role) VALUES ('99999999-9999-9999-9999-999999999996', 'cetys')$$,
  '42501',
  NULL,
  'Customer no puede insertar perfil cetys (RLS/Privilegios)'
);

-- 7. Customer no puede insertar perfil admin
SELECT throws_ok(
  $$INSERT INTO public.zanita_profiles (id, role) VALUES ('99999999-9999-9999-9999-999999999996', 'admin')$$,
  '42501',
  NULL,
  'Customer no puede insertar perfil admin (RLS/Privilegios)'
);

-- 8. Customer no puede insertar perfil de otro UUID
-- Primero creamos el usuario real '99999999-9999-9999-9999-999999999997'
SET LOCAL role postgres;
INSERT INTO auth.users (id) VALUES ('99999999-9999-9999-9999-999999999997');
-- Luego el "atacante" con id '99999999-9999-9999-9999-999999999996' intenta insertar el perfil de '99999999-9999-9999-9999-999999999997'
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"99999999-9999-9999-9999-999999999996","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO public.zanita_profiles (id, role) VALUES ('99999999-9999-9999-9999-999999999997', 'customer')$$,
  '42501',
  NULL,
  'Customer no puede insertar perfil de otro UUID que sí existe'
);

-- 9. Customer no puede actualizar ningún role
SET LOCAL request.jwt.claims TO '{"sub":"99999999-9999-9999-9999-999999999995","role":"authenticated"}';
SELECT results_eq(
  $$UPDATE public.zanita_profiles SET role = 'admin' WHERE id = '99999999-9999-9999-9999-999999999995' RETURNING id$$,
  $$VALUES ('99999999-9999-9999-9999-999999999995'::uuid) LIMIT 0$$,
  'Customer no puede actualizar su role'
);
-- Verificar que sigue siendo customer
SELECT results_eq(
  $$SELECT role FROM public.zanita_profiles WHERE id = '99999999-9999-9999-9999-999999999995'$$,
  $$VALUES ('customer'::public.zanita_app_role)$$,
  'El role permanece customer después del intento'
);

-- 10. Admin cambia customer a cetys
SET LOCAL request.jwt.claims TO '{"sub":"99999999-9999-9999-9999-999999999994","role":"authenticated"}';
SELECT results_eq(
  $$UPDATE public.zanita_profiles SET role = 'cetys' WHERE id = '99999999-9999-9999-9999-999999999995' RETURNING role$$,
  $$VALUES ('cetys'::public.zanita_app_role)$$,
  'Admin sí puede cambiar roles a cetys'
);

-- 11. Usuario no ve pedidos ajenos
SET LOCAL role postgres;
INSERT INTO public.zanita_orders (order_number, user_id, customer_name, customer_phone, delivery_point_id, requested_date, requested_time, products_subtotal_cents)
VALUES ('ZAN-TEST', '99999999-9999-9999-9999-999999999992', 'Juan', '555', 'eeee0000-0000-0000-0000-000000000001', CURRENT_DATE, CURRENT_TIME, 100);

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"99999999-9999-9999-9999-999999999996","role":"authenticated"}';
SELECT results_eq(
  'SELECT order_number FROM public.zanita_orders',
  $$VALUES ('ZAN-TEST'::text) LIMIT 0$$,
  'Usuario no ve pedidos ajenos'
);

-- 12. Catálogo devuelve únicamente productos activos
SET LOCAL role postgres;
INSERT INTO public.zanita_products (slug, name, price_cents, category, category_label, color_accent, is_active)
VALUES ('inactivo', 'Inactivo', 10, 'cat', 'cat', 'c', false);
SET LOCAL role anon;
SET LOCAL request.jwt.claims TO '{}';
SELECT results_eq(
  'SELECT slug FROM public.zanita_products WHERE slug = ''inactivo''',
  $$VALUES ('inactivo'::text) LIMIT 0$$,
  'Catálogo devuelve únicamente productos activos'
);

-- 13. Configuraciones no públicas no son visibles
SELECT results_eq(
  'SELECT key FROM public.zanita_store_settings WHERE is_public = false',
  $$VALUES ('setting_private'::text) LIMIT 0$$,
  'Configuraciones no públicas no son visibles'
);

SELECT * FROM finish();
ROLLBACK;
