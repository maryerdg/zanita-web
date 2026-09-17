BEGIN;

SELECT plan(22);

-- 1. Setup Test Users
SET LOCAL tests.cust_id = '00000000-0000-0000-0000-000000000001';
SET LOCAL tests.admin_id = '00000000-0000-0000-0000-000000000002';
SET LOCAL tests.cust2_id = '00000000-0000-0000-0000-000000000003';

INSERT INTO auth.users (id, email) VALUES
    (current_setting('tests.cust_id')::uuid, 'customer1@test.com'),
    (current_setting('tests.admin_id')::uuid, 'admin@test.com'),
    (current_setting('tests.cust2_id')::uuid, 'customer2@test.com');

UPDATE public.profiles SET role = 'customer' WHERE id = current_setting('tests.cust_id')::uuid;
UPDATE public.profiles SET role = 'admin' WHERE id = current_setting('tests.admin_id')::uuid;
UPDATE public.profiles SET role = 'customer', phone = 'ORIGINAL' WHERE id = current_setting('tests.cust2_id')::uuid;

-- TEST 1: Default values and Role constraints
SELECT is( (SELECT role FROM public.profiles WHERE id = current_setting('tests.cust_id')::uuid), 'customer', 'Rol por defecto debe ser customer' );
SELECT is( (SELECT cetys_pickup_enabled FROM public.profiles WHERE id = current_setting('tests.cust_id')::uuid), false, 'cetys_pickup_enabled por defecto debe ser false' );
SELECT is( (SELECT role FROM public.profiles WHERE id = current_setting('tests.admin_id')::uuid), 'admin', 'Admin role guardado correctamente' );

-- TEST 2: Role constraint only allows customer/admin
SELECT throws_ok(
    $$ UPDATE public.profiles SET role = 'invalid_role' WHERE id = current_setting('tests.admin_id')::uuid $$,
    '23514', NULL, 'La restricción del enum role bloquea roles inválidos'
);
SELECT throws_ok(
    $$ UPDATE public.profiles SET role = 'cetys' WHERE id = current_setting('tests.admin_id')::uuid $$,
    '23514', NULL, 'Rol cetys ya no es válido en el enum'
);

-- TEST 3: RLS SELECT
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}';

SELECT is( (SELECT count(*) FROM public.profiles), 1::bigint, 'Customer solo puede ver 1 perfil (el suyo)' );
SELECT is( (SELECT id FROM public.profiles LIMIT 1), current_setting('tests.cust_id')::uuid, 'Customer lee exactamente su perfil' );

SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000002"}';
SELECT is( (SELECT count(*) FROM public.profiles), 3::bigint, 'Admin puede ver todos los perfiles' );

SET role anon;
SET LOCAL request.jwt.claims = '{}';
SELECT is( (SELECT count(*) FROM public.profiles), 0::bigint, 'Anon no puede leer perfiles' );

-- TEST 4: UPDATE SELF & PROTECTIONS
SET role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}';

SELECT lives_ok(
    $$ UPDATE public.profiles SET phone = '123456789' WHERE id = current_setting('tests.cust_id')::uuid $$,
    'Customer puede actualizar su propio teléfono'
);
SELECT is( (SELECT phone FROM public.profiles WHERE id = current_setting('tests.cust_id')::uuid), '123456789', 'Teléfono actualizado correctamente' );

SELECT throws_ok(
    $$ UPDATE public.profiles SET role = 'admin' WHERE id = current_setting('tests.cust_id')::uuid $$,
    'P0001', 'No tienes permisos para modificar el rol.', 'Trigger bloquea auto-escalada de rol'
);

SELECT throws_ok(
    $$ UPDATE public.profiles SET cetys_pickup_enabled = true WHERE id = current_setting('tests.cust_id')::uuid $$,
    'P0001', 'No tienes permisos para modificar privilegios especiales.', 'Trigger bloquea auto-habilitación'
);

-- UPDATE AJENO: A. Customer intenta actualizar perfil ajeno (RLS silently ignores)
UPDATE public.profiles SET phone = 'HACKED' WHERE id = current_setting('tests.cust2_id')::uuid;
-- B. Switch to admin to check
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000002"}';
SELECT is( (SELECT phone FROM public.profiles WHERE id = current_setting('tests.cust2_id')::uuid), 'ORIGINAL', 'No actualiza otro perfil (comprobado como admin)' );

-- TEST 5: UPDATE BY ADMIN
SELECT lives_ok(
    $$ UPDATE public.profiles SET cetys_pickup_enabled = true WHERE id = current_setting('tests.cust_id')::uuid $$,
    'Admin puede habilitar cetys'
);
SELECT is( (SELECT cetys_pickup_enabled FROM public.profiles WHERE id = current_setting('tests.cust_id')::uuid), true, 'Pickup activado exitosamente' );

SELECT lives_ok(
    $$ UPDATE public.profiles SET cetys_pickup_enabled = false WHERE id = current_setting('tests.cust_id')::uuid $$,
    'Admin puede deshabilitar cetys'
);

-- TEST 6: Helper Function is_admin()
SELECT is( private.is_admin(), true, 'is_admin() retorna true para admin' );

SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}';
SELECT is( private.is_admin(), false, 'is_admin() retorna false para customer' );

-- TEST 7: INSERT/DELETE Protections
SELECT throws_ok(
    $$ INSERT INTO public.profiles (id, full_name, role) VALUES (gen_random_uuid(), 'Hacker', 'admin') $$,
    '42501', NULL, 'Customer no puede insertar perfiles (bloqueado por GRANT/RLS)'
);

SELECT throws_ok(
    $$ DELETE FROM public.profiles WHERE id = current_setting('tests.cust_id')::uuid $$,
    '42501', NULL, 'Customer no puede borrar su propio perfil para recrearlo (bloqueado por GRANT/RLS)'
);

SELECT throws_ok(
    $$ DELETE FROM public.profiles WHERE id = current_setting('tests.cust2_id')::uuid $$,
    '42501', NULL, 'Customer no puede borrar perfil ajeno'
);

SELECT * FROM finish();
ROLLBACK;
