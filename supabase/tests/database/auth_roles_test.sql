BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated, anon;

SELECT plan(36);

-- Create a mock function to impersonate a user
CREATE OR REPLACE FUNCTION tests.set_jwt(user_id UUID) RETURNS void AS $$
BEGIN
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', user_id), true);
END;
$$ LANGUAGE plpgsql;

-- Set up test data
WITH admin_user AS (
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (gen_random_uuid(), 'admin@test.local', '{"role": "admin"}') RETURNING id
),
cust_user AS (
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (gen_random_uuid(), 'cust@test.local', '{"role": "cetys"}') RETURNING id
),
cust_user_2 AS (
    INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'cust2@test.local') RETURNING id
),
cetys_user AS (
    INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'cetys@test.local') RETURNING id
)
SELECT set_config('tests.admin_id', (SELECT id::text FROM admin_user), true),
       set_config('tests.cust_id', (SELECT id::text FROM cust_user), true),
       set_config('tests.cust2_id', (SELECT id::text FROM cust_user_2), true),
       set_config('tests.cetys_id', (SELECT id::text FROM cetys_user), true);

-- Manually promote admin and cetys
UPDATE public.profiles SET role = 'admin' WHERE id = current_setting('tests.admin_id')::uuid;
UPDATE public.profiles SET role = 'cetys' WHERE id = current_setting('tests.cetys_id')::uuid;

-- 1. perfil automático
SELECT is( (SELECT COUNT(*) FROM public.profiles WHERE id = current_setting('tests.cust_id')::uuid), 1::bigint, 'perfil automático creado');
-- 2. role forzado a customer
SELECT is( (SELECT role FROM public.profiles WHERE id = current_setting('tests.cust_id')::uuid), 'customer'::text, 'role forzado a customer ignorando metadata');
-- 3. metadata maliciosa ignorada
SELECT is( (SELECT role FROM public.profiles WHERE id = current_setting('tests.admin_id')::uuid), 'admin'::text, 'admin manual es admin'); 

-- customer context
SET role authenticated;
SELECT tests.set_jwt(current_setting('tests.cust_id')::uuid);

-- 4. customer lee perfil propio
SELECT is( (SELECT COUNT(*) FROM public.profiles WHERE id = current_setting('tests.cust_id')::uuid), 1::bigint, 'customer lee perfil propio');
-- 5. customer no lee perfiles ajenos
SELECT is( (SELECT COUNT(*) FROM public.profiles WHERE id = current_setting('tests.admin_id')::uuid), 0::bigint, 'customer no lee perfiles ajenos');
-- 6. customer actualiza full_name
SELECT lives_ok( $$ UPDATE public.profiles SET full_name = 'Test Name' WHERE id = current_setting('tests.cust_id')::uuid $$, 'customer actualiza full_name');
-- 7. customer actualiza phone
SELECT lives_ok( $$ UPDATE public.profiles SET phone = '123' WHERE id = current_setting('tests.cust_id')::uuid $$, 'customer actualiza phone');
-- 8. customer no actualiza email
SELECT throws_ok( $$ UPDATE public.profiles SET email = 'hacked@test.local' WHERE id = current_setting('tests.cust_id')::uuid $$, '42501', NULL, 'customer no actualiza email');
-- 9. customer no actualiza role
SELECT throws_ok( $$ UPDATE public.profiles SET role = 'admin' WHERE id = current_setting('tests.cust_id')::uuid $$, '42501', NULL, 'customer no actualiza role');
-- 10. customer no actualiza id
SELECT throws_ok( $$ UPDATE public.profiles SET id = gen_random_uuid() WHERE id = current_setting('tests.cust_id')::uuid $$, '42501', NULL, 'customer no actualiza id');
-- 11. customer no actualiza created_at
SELECT throws_ok( $$ UPDATE public.profiles SET created_at = NOW() WHERE id = current_setting('tests.cust_id')::uuid $$, '42501', NULL, 'customer no actualiza created_at');

-- Let's make sure cust2 creates a request first to test isolation
SELECT tests.set_jwt(current_setting('tests.cust2_id')::uuid);
INSERT INTO public.cetys_access_requests (user_id) VALUES (current_setting('tests.cust2_id')::uuid);
SELECT tests.set_jwt(current_setting('tests.cust_id')::uuid);

-- 12. customer crea solicitud propia
SELECT lives_ok( $$ INSERT INTO public.cetys_access_requests (user_id) VALUES (current_setting('tests.cust_id')::uuid) $$, 'customer crea solicitud propia');
-- 13. customer no crea solicitud ajena
SELECT throws_ok( $$ INSERT INTO public.cetys_access_requests (user_id) VALUES (current_setting('tests.admin_id')::uuid) $$, 'P0001', 'Solo los usuarios con rol customer pueden solicitar acceso CETYS.', 'customer no crea solicitud ajena');
-- 14. customer no define status
SELECT throws_ok( $$ INSERT INTO public.cetys_access_requests (user_id, status) VALUES (current_setting('tests.cust_id')::uuid, 'approved') $$, '42501', NULL, 'customer no define status al insertar');
-- 15. customer no define reviewed_at
SELECT throws_ok( $$ INSERT INTO public.cetys_access_requests (user_id, reviewed_at) VALUES (current_setting('tests.cust_id')::uuid, NOW()) $$, '42501', NULL, 'customer no define reviewed_at');
-- 16. customer no define reviewed_by
SELECT throws_ok( $$ INSERT INTO public.cetys_access_requests (user_id, reviewed_by) VALUES (current_setting('tests.cust_id')::uuid, current_setting('tests.cust_id')::uuid) $$, '42501', NULL, 'customer no define reviewed_by');
-- 17. bloqueo de doble pending
SELECT throws_ok( $$ INSERT INTO public.cetys_access_requests (user_id) VALUES (current_setting('tests.cust_id')::uuid) $$, '23505', NULL, 'bloqueo de doble pending');
-- 18. customer no aprueba
UPDATE public.cetys_access_requests SET status = 'approved' WHERE user_id = current_setting('tests.cust_id')::uuid;
SELECT is( (SELECT status FROM public.cetys_access_requests WHERE user_id = current_setting('tests.cust_id')::uuid), 'pending'::text, 'customer no aprueba (silencioso por RLS)');
-- 19. is_admin false para customer
SELECT is(private.is_admin(), false, 'is_admin false para customer');
-- 20. customer no ve solicitudes ajenas
SELECT is( (SELECT COUNT(*) FROM public.cetys_access_requests), 1::bigint, 'customer no ve solicitudes ajenas (solo ve la suya)');

-- cetys context
SELECT tests.set_jwt(current_setting('tests.cetys_id')::uuid);

-- 21. cetys no aprueba
UPDATE public.cetys_access_requests SET status = 'approved' WHERE user_id = current_setting('tests.cust_id')::uuid;
SELECT is( (SELECT COUNT(*) FROM public.cetys_access_requests WHERE status = 'approved'), 0::bigint, 'cetys no aprueba');
-- 22. is_admin false para cetys
SELECT is(private.is_admin(), false, 'is_admin false para cetys');
-- 23. cetys no solicita nuevamente (trigger blocks it)
SELECT throws_ok( $$ INSERT INTO public.cetys_access_requests (user_id) VALUES (current_setting('tests.cetys_id')::uuid) $$, 'P0001', 'Solo los usuarios con rol customer pueden solicitar acceso CETYS.', 'cetys no solicita nuevamente');

-- admin context
SELECT tests.set_jwt(current_setting('tests.admin_id')::uuid);

-- 24. is_admin true para admin
SELECT is(private.is_admin(), true, 'is_admin true para admin');
-- 25. admin ve solicitudes (there should be exactly 2 because we inserted for cust_id and cust2_id)
SELECT is( (SELECT COUNT(*) FROM public.cetys_access_requests), 2::bigint, 'admin ve solicitudes');
-- 26. aprobación cambia a cetys
UPDATE public.cetys_access_requests SET status = 'approved' WHERE user_id = current_setting('tests.cust_id')::uuid;
SELECT is( (SELECT role FROM public.profiles WHERE id = current_setting('tests.cust_id')::uuid), 'cetys'::text, 'aprobación cambia a cetys');
-- 27. reviewed_by correcto
SELECT is( (SELECT reviewed_by FROM public.cetys_access_requests WHERE user_id = current_setting('tests.cust_id')::uuid), current_setting('tests.admin_id')::uuid, 'reviewed_by correcto');
-- 28. reviewed_at establecido
SELECT isnt( (SELECT reviewed_at FROM public.cetys_access_requests WHERE user_id = current_setting('tests.cust_id')::uuid), NULL, 'reviewed_at establecido');
-- 29. solicitud resuelta no se modifica
SELECT throws_ok( $$ UPDATE public.cetys_access_requests SET status = 'rejected' WHERE user_id = current_setting('tests.cust_id')::uuid $$, 'P0001', 'Cannot modify an already resolved request.', 'solicitud resuelta no se modifica');
-- 30. rechazo conserva customer
UPDATE public.cetys_access_requests SET status = 'rejected' WHERE user_id = current_setting('tests.cust2_id')::uuid;
SELECT is( (SELECT role FROM public.profiles WHERE id = current_setting('tests.cust2_id')::uuid), 'customer'::text, 'rechazo conserva rol actual (no lo degrada)');

-- 31. customer rechazado puede solicitar de nuevo (porque el trigger evalúa role = customer y no interfiere)
SELECT tests.set_jwt(current_setting('tests.cust2_id')::uuid);
SELECT lives_ok( $$ INSERT INTO public.cetys_access_requests (user_id) VALUES (current_setting('tests.cust2_id')::uuid) $$, 'customer rechazado puede solicitar de nuevo');

-- 32. admin no solicita (trigger blocks it)
SELECT tests.set_jwt(current_setting('tests.admin_id')::uuid);
SELECT throws_ok( $$ INSERT INTO public.cetys_access_requests (user_id) VALUES (current_setting('tests.admin_id')::uuid) $$, 'P0001', 'Solo los usuarios con rol customer pueden solicitar acceso CETYS.', 'admin no solicita acceso');

-- 33. anon testing explicitly
RESET role;
SET role anon;
SELECT throws_ok( $$ INSERT INTO public.profiles (id, full_name, role) VALUES (gen_random_uuid(), 'Anon', 'admin') $$, '42501', NULL, 'anon no puede insertar perfiles');
SELECT is( (SELECT COUNT(*) FROM public.profiles), 0::bigint, 'anon no puede leer perfiles');
SELECT throws_ok( $$ INSERT INTO public.cetys_access_requests (user_id) VALUES (gen_random_uuid()) $$, '42501', NULL, 'anon no puede insertar solicitudes');
SELECT is( (SELECT COUNT(*) FROM public.cetys_access_requests), 0::bigint, 'anon no puede leer solicitudes');
RESET role;

SELECT * FROM finish();
ROLLBACK;
