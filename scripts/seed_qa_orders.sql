-- =================================================================================
-- ZANITA WEB - LOCAL QA ORDERS FIXTURES (PHASE 8E.1)
-- STRICTLY FOR LOCAL ENVIRONMENT TESTING. DO NOT EXECUTE IN PRODUCTION.
-- =================================================================================

-- SAFETY GUARD: Abort immediately if executed outside local development environment.
-- Requires ALL exact local QA identities simultaneously with their canonical dummy UUIDs,
-- emails, and local GoTrue instance_id before any table or trigger modification.
DO $$
DECLARE
  v_admin_exists    boolean;
  v_customer_exists boolean;
  v_cetys_exists    boolean;
BEGIN
  IF CURRENT_DATABASE() <> 'postgres' THEN
    RAISE EXCEPTION 'SAFETY GATE TRIGGERED: This QA fixture script can ONLY be run on local database (database=postgres). Current database is "%". Aborting.', CURRENT_DATABASE();
  END IF;

  -- 1. Check local admin dummy user
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = '11111111-1111-1111-1111-111111111111'
      AND email = 'admin@zanita.mx'
      AND instance_id = '00000000-0000-0000-0000-000000000000'
  ) INTO v_admin_exists;

  -- 2. Check local regular customer dummy user
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = '33333333-3333-3333-3333-333333333333'
      AND email = 'cliente@zanita.mx'
      AND instance_id = '00000000-0000-0000-0000-000000000000'
  ) INTO v_customer_exists;

  -- 3. Check local CETYS student customer dummy user
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = '22222222-2222-2222-2222-222222222222'
      AND email = 'ximena.diaz@cetys.edu.mx'
      AND instance_id = '00000000-0000-0000-0000-000000000000'
  ) INTO v_cetys_exists;

  IF NOT (v_admin_exists AND v_customer_exists AND v_cetys_exists) THEN
    RAISE EXCEPTION 'SAFETY GATE TRIGGERED: Exact local QA environment identities could not be proven (admin=%, customer=%, cetys=%...). Aborting before touching triggers or tables.', v_admin_exists, v_customer_exists, v_cetys_exists;
  END IF;
END $$;

-- Disable trigger so explicit QA numbers ZAN-0101 to ZAN-0109 are preserved
-- and the sequence private.zanita_order_number_seq is not touched.
ALTER TABLE public.zanita_orders DISABLE TRIGGER zanita_assign_order_number;

DO $$
DECLARE
  v_admin_id       uuid := '11111111-1111-1111-1111-111111111111';
  v_cetys_user_id  uuid := '22222222-2222-2222-2222-222222222222';
  v_reg_user_id    uuid := '33333333-3333-3333-3333-333333333333';
  v_today          date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Tijuana')::date;
  v_future         date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Tijuana')::date + 5;
  v_past           date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Tijuana')::date - 1;

  v_o1 uuid; v_o2 uuid; v_o3 uuid; v_o4 uuid; v_o5 uuid; v_o6 uuid; v_o7 uuid; v_o8 uuid; v_o9 uuid;
  v_it uuid;
BEGIN
  -- 1. SEED TEST USERS IN AUTH.USERS, AUTH.IDENTITIES & PROFILES
  -- Admin
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  VALUES (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@zanita.mx', crypt('AdminPassword123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mena Admin"}', '', '', '', '', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    instance_id = '00000000-0000-0000-0000-000000000000',
    aud = 'authenticated',
    encrypted_password = crypt('AdminPassword123!', gen_salt('bf')),
    email_confirmed_at = now(),
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = '';

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_admin_id, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@zanita.mx'), 'email', v_admin_id::text, now(), now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, email, role, cetys_pickup_enabled)
  VALUES (v_admin_id, 'Mena Admin', '6641234567', 'admin@zanita.mx', 'admin', true)
  ON CONFLICT (id) DO UPDATE SET role = 'admin', cetys_pickup_enabled = true;

  -- CETYS Customer
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  VALUES (v_cetys_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ximena.diaz@cetys.edu.mx', crypt('Cliente123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ximena Diaz"}', '', '', '', '', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    instance_id = '00000000-0000-0000-0000-000000000000',
    aud = 'authenticated',
    encrypted_password = crypt('Cliente123!', gen_salt('bf')),
    email_confirmed_at = now(),
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = '';

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_cetys_user_id, v_cetys_user_id, jsonb_build_object('sub', v_cetys_user_id::text, 'email', 'ximena.diaz@cetys.edu.mx'), 'email', v_cetys_user_id::text, now(), now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, email, role, cetys_pickup_enabled)
  VALUES (v_cetys_user_id, 'Ximena Diaz', '6649876543', 'ximena.diaz@cetys.edu.mx', 'customer', true)
  ON CONFLICT (id) DO UPDATE SET cetys_pickup_enabled = true;

  -- Regular Customer
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
  VALUES (v_reg_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cliente@zanita.mx', crypt('Cliente123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carlos Cliente"}', '', '', '', '', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    instance_id = '00000000-0000-0000-0000-000000000000',
    aud = 'authenticated',
    encrypted_password = crypt('Cliente123!', gen_salt('bf')),
    email_confirmed_at = now(),
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = '';

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_reg_user_id, v_reg_user_id, jsonb_build_object('sub', v_reg_user_id::text, 'email', 'cliente@zanita.mx'), 'email', v_reg_user_id::text, now(), now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, email, role, cetys_pickup_enabled)
  VALUES (v_reg_user_id, 'Carlos Cliente', '6645551234', 'cliente@zanita.mx', 'customer', false)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, email, role, cetys_pickup_enabled)
  VALUES (v_reg_user_id, 'Carlos Cliente', '6645551234', 'cliente@zanita.mx', 'customer', false)
  ON CONFLICT (id) DO NOTHING;

  -- 2. CLEAR PREVIOUS QA ORDERS (IDEMPOTENT)
  DELETE FROM public.zanita_orders WHERE order_number LIKE 'ZAN-010%' OR order_number LIKE 'ZAN-000%';

  -- ORDER 1: ZAN-0101 -> pending_approval (Official point, today 15:40)
  INSERT INTO public.zanita_orders (
    order_number, user_id, customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
    status, products_subtotal_cents, delivery_fee_cents, total_amount_cents, deposit_required_pct, amount_paid_cents,
    requested_date, requested_time, delivery_point_id, delivery_name_snapshot, delivery_type_snapshot,
    delivery_mode_snapshot, delivery_requires_quote_snapshot, delivery_quote_status, notes
  ) VALUES (
    'ZAN-0101', v_reg_user_id, 'Carlos Cliente', '6645551234', 'cliente@zanita.mx',
    'pending_approval', 10000, 0, 10000, NULL, 0,
    v_today, '15:40:00', 'dddd0001-0000-0000-0000-000000000000', 'Alba Roja', 'standard',
    'official_point', false, 'not_required', 'Por favor con extra chamoy'
  ) RETURNING id INTO v_o1;

  INSERT INTO public.zanita_order_items (order_id, product_id, product_name_snapshot, base_unit_price_snapshot_cents, final_unit_price_snapshot_cents, quantity, subtotal_cents)
  VALUES (v_o1, 'aaaa0000-0000-0000-0000-000000000001', 'Manzanita Verde', 5000, 5000, 2, 10000);

  -- ORDER 2: ZAN-0102 -> pending_approval (Home delivery quote required)
  INSERT INTO public.zanita_orders (
    order_number, user_id, customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
    status, products_subtotal_cents, delivery_fee_cents, total_amount_cents, deposit_required_pct, amount_paid_cents,
    requested_date, requested_time, delivery_point_id, delivery_name_snapshot, delivery_type_snapshot,
    delivery_mode_snapshot, delivery_address_snapshot, delivery_requires_quote_snapshot, delivery_quote_status, notes
  ) VALUES (
    'ZAN-0102', v_reg_user_id, 'Carlos Cliente', '6645551234', 'cliente@zanita.mx',
    'pending_approval', 20000, NULL, 20000, NULL, 0,
    v_today, '17:40:00', 'dddd0008-0000-0000-0000-000000000000', 'Otra ubicación', 'other',
    'home_delivery', 'Av. Revolución 1234, Depto 4B, Centro, Tijuana', true, 'pending', 'Timbre no sirve, favor de marcar al llegar'
  ) RETURNING id INTO v_o2;

  INSERT INTO public.zanita_order_items (order_id, product_id, product_name_snapshot, base_unit_price_snapshot_cents, final_unit_price_snapshot_cents, quantity, subtotal_cents)
  VALUES (v_o2, 'aaaa0000-0000-0000-0000-000000000002', 'Charola Mediana (3 Toppings)', 20000, 20000, 1, 20000)
  RETURNING id INTO v_it;

  INSERT INTO public.zanita_order_item_options (order_item_id, option_id, option_name_snapshot, group_name_snapshot, additional_price_snapshot_cents, quantity)
  VALUES 
    (v_it, 'cccc0000-0000-0000-0000-000000000001', 'Skwinkles', 'Toppings', 0, 1),
    (v_it, 'cccc0000-0000-0000-0000-000000000002', 'Panditas', 'Toppings', 0, 1);

  -- ORDER 3: ZAN-0103 -> deposit_pending (Awaiting payment, CETYS pickup today)
  INSERT INTO public.zanita_orders (
    order_number, user_id, customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
    status, products_subtotal_cents, delivery_fee_cents, total_amount_cents, deposit_required_pct, amount_paid_cents,
    requested_date, requested_time, delivery_point_id, delivery_name_snapshot, delivery_type_snapshot,
    delivery_mode_snapshot, delivery_requires_quote_snapshot, delivery_quote_status, notes
  ) VALUES (
    'ZAN-0103', v_cetys_user_id, 'Ximena Diaz', '6649876543', 'ximena.diaz@cetys.edu.mx',
    'deposit_pending', 5000, 0, 5000, 50, 0,
    v_today, '19:40:00', 'dddd0007-0000-0000-0000-000000000000', 'Pickup CETYS', 'special',
    'cetys_pickup', false, 'not_required', NULL
  ) RETURNING id INTO v_o3;

  INSERT INTO public.zanita_order_items (order_id, product_id, product_name_snapshot, base_unit_price_snapshot_cents, final_unit_price_snapshot_cents, quantity, subtotal_cents)
  VALUES (v_o3, 'aaaa0000-0000-0000-0000-000000000001', 'Manzanita Verde', 5000, 5000, 1, 5000);

  -- ORDER 4: ZAN-0104 -> confirmed (Paid / To Prepare today in kitchen) - MULTI-ITEM WITH OPTIONS
  INSERT INTO public.zanita_orders (
    order_number, user_id, customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
    status, products_subtotal_cents, delivery_fee_cents, total_amount_cents, deposit_required_pct, amount_paid_cents,
    requested_date, requested_time, delivery_point_id, delivery_name_snapshot, delivery_type_snapshot,
    delivery_mode_snapshot, delivery_requires_quote_snapshot, delivery_quote_status, notes
  ) VALUES (
    'ZAN-0104', v_reg_user_id, 'Carlos Cliente', '6645551234', 'cliente@zanita.mx',
    'confirmed', 28500, 0, 28500, NULL, 28500,
    v_today, '17:40:00', 'dddd0003-0000-0000-0000-000000000000', 'Las Palmas', 'standard',
    'official_point', false, 'not_required', NULL
  ) RETURNING id INTO v_o4;

  -- Item 1: Charola Mediana with 3 customization options
  INSERT INTO public.zanita_order_items (order_id, product_id, product_name_snapshot, base_unit_price_snapshot_cents, final_unit_price_snapshot_cents, quantity, subtotal_cents)
  VALUES (v_o4, 'aaaa0000-0000-0000-0000-000000000002', 'Charola Mediana (3 Toppings)', 20000, 23500, 1, 23500)
  RETURNING id INTO v_it;

  INSERT INTO public.zanita_order_item_options (order_item_id, option_id, option_name_snapshot, group_name_snapshot, additional_price_snapshot_cents, quantity)
  VALUES 
    (v_it, 'cccc0000-0000-0000-0000-000000000001', 'Skwinkles', 'Toppings', 0, 1),
    (v_it, 'cccc0000-0000-0000-0000-000000000002', 'Panditas', 'Toppings', 0, 1),
    (v_it, 'cccc0000-0000-0000-0000-000000000003', 'Uvas forradas', 'Toppings', 3500, 1);

  -- Item 2: Manzanita Verde
  INSERT INTO public.zanita_order_items (order_id, product_id, product_name_snapshot, base_unit_price_snapshot_cents, final_unit_price_snapshot_cents, quantity, subtotal_cents)
  VALUES (v_o4, 'aaaa0000-0000-0000-0000-000000000001', 'Manzanita Verde', 5000, 5000, 1, 5000);

  -- ORDER 5: ZAN-0105 -> preparing (In kitchen prep right now)
  INSERT INTO public.zanita_orders (
    order_number, user_id, customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
    status, products_subtotal_cents, delivery_fee_cents, total_amount_cents, deposit_required_pct, amount_paid_cents,
    requested_date, requested_time, delivery_point_id, delivery_name_snapshot, delivery_type_snapshot,
    delivery_mode_snapshot, delivery_requires_quote_snapshot, delivery_quote_status, notes
  ) VALUES (
    'ZAN-0105', v_cetys_user_id, 'Ximena Diaz', '6649876543', 'ximena.diaz@cetys.edu.mx',
    'preparing', 15000, 0, 15000, NULL, 15000,
    v_today, '15:40:00', 'dddd0007-0000-0000-0000-000000000000', 'Pickup CETYS', 'special',
    'cetys_pickup', false, 'not_required', 'Para evento en biblioteca'
  ) RETURNING id INTO v_o5;

  INSERT INTO public.zanita_order_items (order_id, product_id, product_name_snapshot, base_unit_price_snapshot_cents, final_unit_price_snapshot_cents, quantity, subtotal_cents)
  VALUES (v_o5, 'aaaa0000-0000-0000-0000-000000000001', 'Manzanita Verde', 5000, 5000, 3, 15000);

  -- ORDER 6: ZAN-0106 -> ready (Packaged and ready for pickup today)
  INSERT INTO public.zanita_orders (
    order_number, user_id, customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
    status, products_subtotal_cents, delivery_fee_cents, total_amount_cents, deposit_required_pct, amount_paid_cents,
    requested_date, requested_time, delivery_point_id, delivery_name_snapshot, delivery_type_snapshot,
    delivery_mode_snapshot, delivery_requires_quote_snapshot, delivery_quote_status, notes
  ) VALUES (
    'ZAN-0106', v_cetys_user_id, 'Ximena Diaz', '6649876543', 'ximena.diaz@cetys.edu.mx',
    'ready', 5000, 0, 5000, NULL, 5000,
    v_today, '15:40:00', 'dddd0007-0000-0000-0000-000000000000', 'Pickup CETYS', 'special',
    'cetys_pickup', false, 'not_required', NULL
  ) RETURNING id INTO v_o6;

  INSERT INTO public.zanita_order_items (order_id, product_id, product_name_snapshot, base_unit_price_snapshot_cents, final_unit_price_snapshot_cents, quantity, subtotal_cents)
  VALUES (v_o6, 'aaaa0000-0000-0000-0000-000000000001', 'Manzanita Verde', 5000, 5000, 1, 5000);

  -- ORDER 7: ZAN-0107 -> delivered (Historical completed order)
  INSERT INTO public.zanita_orders (
    order_number, user_id, customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
    status, products_subtotal_cents, delivery_fee_cents, total_amount_cents, deposit_required_pct, amount_paid_cents,
    requested_date, requested_time, delivery_point_id, delivery_name_snapshot, delivery_type_snapshot,
    delivery_mode_snapshot, delivery_requires_quote_snapshot, delivery_quote_status, notes
  ) VALUES (
    'ZAN-0107', v_reg_user_id, 'Carlos Cliente', '6645551234', 'cliente@zanita.mx',
    'delivered', 5000, 0, 5000, NULL, 5000,
    v_past, '16:00:00', 'dddd0002-0000-0000-0000-000000000000', 'Ermita', 'standard',
    'official_point', false, 'not_required', NULL
  ) RETURNING id INTO v_o7;

  INSERT INTO public.zanita_order_items (order_id, product_id, product_name_snapshot, base_unit_price_snapshot_cents, final_unit_price_snapshot_cents, quantity, subtotal_cents)
  VALUES (v_o7, 'aaaa0000-0000-0000-0000-000000000001', 'Manzanita Verde', 5000, 5000, 1, 5000);

  -- ORDER 8: ZAN-0108 -> confirmed (Upcoming future order next week)
  INSERT INTO public.zanita_orders (
    order_number, user_id, customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
    status, products_subtotal_cents, delivery_fee_cents, total_amount_cents, deposit_required_pct, amount_paid_cents,
    requested_date, requested_time, delivery_point_id, delivery_name_snapshot, delivery_type_snapshot,
    delivery_mode_snapshot, delivery_requires_quote_snapshot, delivery_quote_status, notes
  ) VALUES (
    'ZAN-0108', v_cetys_user_id, 'Ximena Diaz', '6649876543', 'ximena.diaz@cetys.edu.mx',
    'confirmed', 40000, 0, 40000, NULL, 40000,
    v_future, '17:40:00', 'dddd0007-0000-0000-0000-000000000000', 'Pickup CETYS', 'special',
    'cetys_pickup', false, 'not_required', 'Para entrega programada la siguiente semana'
  ) RETURNING id INTO v_o8;

  INSERT INTO public.zanita_order_items (order_id, product_id, product_name_snapshot, base_unit_price_snapshot_cents, final_unit_price_snapshot_cents, quantity, subtotal_cents)
  VALUES (v_o8, 'aaaa0000-0000-0000-0000-000000000002', 'Charola Mediana (3 Toppings)', 20000, 20000, 2, 40000);

  -- ORDER 9: ZAN-0109 -> rejected (Rejected order)
  INSERT INTO public.zanita_orders (
    order_number, user_id, customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
    status, products_subtotal_cents, delivery_fee_cents, total_amount_cents, deposit_required_pct, amount_paid_cents,
    requested_date, requested_time, delivery_point_id, delivery_name_snapshot, delivery_type_snapshot,
    delivery_mode_snapshot, delivery_requires_quote_snapshot, delivery_quote_status, notes
  ) VALUES (
    'ZAN-0109', v_reg_user_id, 'Carlos Cliente', '6645551234', 'cliente@zanita.mx',
    'rejected', 5000, 0, 5000, NULL, 0,
    v_today, '18:00:00', 'dddd0001-0000-0000-0000-000000000000', 'Alba Roja', 'standard',
    'official_point', false, 'not_required', 'Horario solicitado no viable'
  ) RETURNING id INTO v_o9;

  INSERT INTO public.zanita_order_items (order_id, product_id, product_name_snapshot, base_unit_price_snapshot_cents, final_unit_price_snapshot_cents, quantity, subtotal_cents)
  VALUES (v_o9, 'aaaa0000-0000-0000-0000-000000000001', 'Manzanita Verde', 5000, 5000, 1, 5000);

  RAISE NOTICE 'QA Orders Seeded Successfully: ZAN-0101 to ZAN-0109.';
END $$;

ALTER TABLE public.zanita_orders ENABLE TRIGGER zanita_assign_order_number;
