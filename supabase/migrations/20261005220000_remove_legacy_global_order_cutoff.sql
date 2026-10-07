-- =================================================================================
-- ZANITA WEB - PASS 8D.3R.3 / 8D.3R.4: CANONICAL AVAILABILITY AUTHORITY ALIGNMENT
--
-- 1. Elimina claves obsoletas de zanita_store_settings:
--    - 'order_submission_cutoff' (reemplazado por submission_cutoff_time del motor)
--    - 'cetys_pickup_schedule' (reemplazado por zanita_availability_rules del motor)
-- 2. Asegura que las reglas recurrentes de CETYS tengan slot_interval_minutes = 60
--    para evitar 'configuration_required' en la baseline seeded.
-- 3. get_checkout_availability:
--    - Cutoff de recepción ('submission_cutoff_time') aplica EXCLUSIVAMENTE
--      al mismo día local del servicio (v_eval_date = v_current_tz_date).
--    - Días futuros se evalúan normalmente sin ser bloqueados por la hora actual.
-- 4. submit_order:
--    - Motor de disponibilidad como ÚNICA FUENTE DE VERDAD OPERATIVA.
--    - Valida SIEMPRE contra public.get_checkout_availability sin bypasses.
--    - Elimina pre-check global conflictivo de 24 horas (min_anticipation_hours).
--      La anticipación mínima (min_lead_minutes) es resuelta autoritativamente por
--      el motor según reglas semanales, overrides o Stand Mode.
--    - Elimina validación legacy duplicada de horario CETYS contra store_settings.
--      El horario de CETYS es resuelto autoritativamente por el motor.
--    - Mantiene requisitos de seguridad de negocio: perfil autorizado para CETYS,
--      dirección requerida para otra ubicación, cálculo autoritativo de precios.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. ELIMINAR SETTINGS OBSOLETOS Y ACTUALIZAR INSTRUCCIONES DE OTRA UBICACIÓN
-- ---------------------------------------------------------------------------------
DELETE FROM public.zanita_store_settings
WHERE key IN ('order_submission_cutoff', 'cetys_pickup_schedule');

-- Actualiza la redacción de 'Otra ubicación' para eliminar promesas obsoletas de precios ($50 MXN)
UPDATE public.zanita_delivery_points
SET instructions = 'Entrega a domicilio fuera de puntos oficiales. El costo de entrega se definirá según la ubicación.'
WHERE id = 'dddd0008-0000-0000-0000-000000000000';

-- ---------------------------------------------------------------------------------
-- 2. ACTUALIZAR RPC: GET CHECKOUT AVAILABILITY
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_checkout_availability(
  p_delivery_mode text,
  p_delivery_point_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_days integer DEFAULT 14
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id                 uuid;
  v_timezone                text;
  v_test_tz_now             text;
  v_tz_now                  timestamp without time zone;
  v_current_tz_date         date;
  v_current_tz_time         time;
  v_current_tz_dow          integer;
  v_start_date              date;
  v_days                    integer;
  v_dp                      record;
  v_cetys_point_id          uuid;
  v_cetys_authorized        boolean;
  v_active_rules_count      integer;
  v_active_overrides_count  integer;

  -- Bucle de fechas
  v_day_offset              integer;
  v_eval_date               date;
  v_eval_dow                integer;
  v_dates_arr               jsonb := '[]'::jsonb;
  v_date_obj                jsonb;

  -- Regla efectiva de fecha
  v_override                record;
  v_rule                    record;
  v_has_config              boolean;
  v_status_code             text;
  v_eff_open_time           time;
  v_eff_close_time          time;
  v_eff_cutoff_time         time;
  v_eff_min_lead            integer;
  v_eff_interval            integer;

  -- Cutoff de envío para el día evaluado
  v_is_today                boolean;
  v_date_cutoff_reached     boolean;

  -- Slots
  v_candidate_time          time;
  v_slot_timestamp          timestamp without time zone;
  v_min_lead_threshold      timestamp without time zone;
  v_available_slots         text[];
  v_is_blocked              boolean;

  -- Estado general resultante
  v_top_status              text;
BEGIN
  -- ---------------------------------------------------------------------------------
  -- A. VALIDACIÓN DE ENTRADAS
  -- ---------------------------------------------------------------------------------
  IF p_delivery_mode NOT IN ('official_point', 'home_delivery', 'cetys_pickup') THEN
    RAISE EXCEPTION 'Modalidad de entrega inválida: %', p_delivery_mode USING ERRCODE = 'P0001';
  END IF;

  v_days := COALESCE(p_days, 14);
  IF v_days < 1 THEN
    v_days := 1;
  ELSIF v_days > 30 THEN
    v_days := 30;
  END IF;

  -- ---------------------------------------------------------------------------------
  -- B. ZONA HORARIA Y AUTORIDAD TEMPORAL
  -- ---------------------------------------------------------------------------------
  SELECT trim(both '"' from value::text) INTO v_timezone
  FROM public.zanita_store_settings
  WHERE key = 'timezone';

  IF v_timezone IS NULL OR length(v_timezone) = 0 THEN
    v_timezone := 'America/Tijuana';
  END IF;

  -- Soporte para tiempo simulado en testing local sin alterar el servidor
  v_test_tz_now := NULLIF(current_setting('zanita.test_current_time', true), '');
  IF v_test_tz_now IS NOT NULL THEN
    BEGIN
      v_tz_now := v_test_tz_now::timestamp without time zone;
    EXCEPTION WHEN OTHERS THEN
      v_tz_now := (now() AT TIME ZONE v_timezone);
    END;
  ELSE
    v_tz_now := (now() AT TIME ZONE v_timezone);
  END IF;

  v_current_tz_date := v_tz_now::date;
  v_current_tz_time := v_tz_now::time;
  v_current_tz_dow  := EXTRACT(ISODOW FROM v_tz_now)::integer;

  v_start_date := COALESCE(p_start_date, v_current_tz_date);
  IF v_start_date < v_current_tz_date THEN
    v_start_date := v_current_tz_date;
  END IF;

  -- ---------------------------------------------------------------------------------
  -- C. VALIDACIÓN ESPECÍFICA POR MODALIDAD
  -- ---------------------------------------------------------------------------------
  IF p_delivery_mode = 'official_point' THEN
    IF p_delivery_point_id IS NULL THEN
      RAISE EXCEPTION 'Para la modalidad official_point se requiere delivery_point_id.' USING ERRCODE = 'P0002';
    END IF;

    SELECT id, name, type, is_active INTO v_dp
    FROM public.zanita_delivery_points
    WHERE id = p_delivery_point_id;

    IF NOT FOUND OR v_dp.is_active = false OR v_dp.type != 'standard' THEN
      RAISE EXCEPTION 'El punto seleccionado no es un punto de entrega oficial válido.' USING ERRCODE = 'P0002';
    END IF;

  ELSIF p_delivery_mode = 'home_delivery' THEN
    IF p_delivery_point_id IS NOT NULL THEN
      RAISE EXCEPTION 'Para la modalidad home_delivery, delivery_point_id debe ser NULL.' USING ERRCODE = 'P0003';
    END IF;

  ELSIF p_delivery_mode = 'cetys_pickup' THEN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN
      RETURN jsonb_build_object(
        'status', 'not_authorized',
        'timezone', v_timezone,
        'delivery_mode', p_delivery_mode,
        'dates', '[]'::jsonb
      );
    END IF;

    SELECT COALESCE(cetys_pickup_enabled, false) INTO v_cetys_authorized
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_cetys_authorized IS NOT TRUE THEN
      RETURN jsonb_build_object(
        'status', 'not_authorized',
        'timezone', v_timezone,
        'delivery_mode', p_delivery_mode,
        'dates', '[]'::jsonb
      );
    END IF;

    -- Resolver punto canónico CETYS
    SELECT id INTO v_cetys_point_id
    FROM public.zanita_delivery_points
    WHERE type = 'special' AND is_active = true
    LIMIT 1;

    p_delivery_point_id := v_cetys_point_id;
  END IF;

  -- ---------------------------------------------------------------------------------
  -- D. EVALUACIÓN DE CONFIGURACIÓN GLOBAL DE LA MODALIDAD
  -- ---------------------------------------------------------------------------------
  -- Si la modalidad no cuenta con reglas recurrentes ni overrides en el horizonte,
  -- retornar explícitamente 'configuration_required'.
  SELECT count(*) INTO v_active_rules_count
  FROM public.zanita_availability_rules
  WHERE is_active = true
    AND delivery_mode = p_delivery_mode
    AND (delivery_point_id = p_delivery_point_id OR delivery_point_id IS NULL);

  SELECT count(*) INTO v_active_overrides_count
  FROM public.zanita_calendar_overrides
  WHERE is_active = true
    AND delivery_mode IN (p_delivery_mode, 'all')
    AND (delivery_point_id = p_delivery_point_id OR delivery_point_id IS NULL)
    AND override_date >= v_start_date
    AND override_date < (v_start_date + v_days);

  IF v_active_rules_count = 0 AND v_active_overrides_count = 0 THEN
    RETURN jsonb_build_object(
      'status', 'configuration_required',
      'timezone', v_timezone,
      'delivery_mode', p_delivery_mode,
      'delivery_point_id', p_delivery_point_id,
      'dates', '[]'::jsonb
    );
  END IF;

  -- ---------------------------------------------------------------------------------
  -- E. CONSTRUCCIÓN DE DISPONIBILIDAD DÍA POR DÍA
  -- ---------------------------------------------------------------------------------
  FOR v_day_offset IN 0..(v_days - 1) LOOP
    v_eval_date := v_start_date + v_day_offset;
    v_eval_dow  := EXTRACT(ISODOW FROM v_eval_date)::integer;
    v_has_config := false;
    v_available_slots := ARRAY[]::text[];
    v_is_today := (v_eval_date = v_current_tz_date);
    v_date_cutoff_reached := false;

    -- 1. Precedencia 1: Calendar Override (punto específico > general)
    SELECT * INTO v_override
    FROM public.zanita_calendar_overrides
    WHERE is_active = true
      AND override_date = v_eval_date
      AND delivery_mode IN (p_delivery_mode, 'all')
      AND (delivery_point_id = p_delivery_point_id OR delivery_point_id IS NULL)
    ORDER BY (delivery_point_id IS NOT NULL) DESC, (delivery_mode = p_delivery_mode) DESC
    LIMIT 1;

    IF FOUND THEN
      IF v_override.status = 'closed' THEN
        v_date_obj := jsonb_build_object(
          'date', to_char(v_eval_date, 'YYYY-MM-DD'),
          'day_of_week', v_eval_dow,
          'available', false,
          'status', 'closed',
          'open_time', null,
          'close_time', null,
          'slot_interval_minutes', null,
          'available_slots', '[]'::jsonb
        );
        v_dates_arr := v_dates_arr || v_date_obj;
        CONTINUE;
      ELSE
        -- Override abierto / custom_schedule / stand_mode
        v_status_code     := v_override.status;
        v_eff_open_time   := v_override.open_time;
        v_eff_close_time  := v_override.close_time;
        v_eff_cutoff_time := v_override.submission_cutoff_time;
        v_eff_min_lead    := COALESCE(v_override.min_lead_minutes, 1440);
        v_eff_interval    := v_override.slot_interval_minutes;
        v_has_config      := true;
      END IF;
    ELSE
      -- 2. Precedencia 2: Regla recurrente (punto específico > general)
      SELECT * INTO v_rule
      FROM public.zanita_availability_rules
      WHERE is_active = true
        AND delivery_mode = p_delivery_mode
        AND day_of_week = v_eval_dow
        AND (delivery_point_id = p_delivery_point_id OR delivery_point_id IS NULL)
      ORDER BY (delivery_point_id IS NOT NULL) DESC
      LIMIT 1;

      IF FOUND THEN
        v_status_code     := 'configured';
        v_eff_open_time   := v_rule.open_time;
        v_eff_close_time  := v_rule.close_time;
        v_eff_cutoff_time := v_rule.submission_cutoff_time;
        v_eff_min_lead    := COALESCE(v_rule.min_lead_minutes, 1440);
        v_eff_interval    := v_rule.slot_interval_minutes;
        v_has_config      := true;
      ELSE
        -- No hay regla operativa para este día de la semana
        v_date_obj := jsonb_build_object(
          'date', to_char(v_eval_date, 'YYYY-MM-DD'),
          'day_of_week', v_eval_dow,
          'available', false,
          'status', 'not_available',
          'open_time', null,
          'close_time', null,
          'slot_interval_minutes', null,
          'available_slots', '[]'::jsonb
        );
        v_dates_arr := v_dates_arr || v_date_obj;
        CONTINUE;
      END IF;
    END IF;

    -- Validar cutoff de recepción: APLICA EXCLUSIVAMENTE AL MISMO DÍA (HOY)
    IF v_is_today AND v_eff_cutoff_time IS NOT NULL AND v_current_tz_time >= v_eff_cutoff_time THEN
      v_date_cutoff_reached := true;
      v_date_obj := jsonb_build_object(
        'date', to_char(v_eval_date, 'YYYY-MM-DD'),
        'day_of_week', v_eval_dow,
        'available', false,
        'status', 'cutoff_reached',
        'open_time', to_char(v_eff_open_time, 'HH24:MI:SS'),
        'close_time', to_char(v_eff_close_time, 'HH24:MI:SS'),
        'slot_interval_minutes', v_eff_interval,
        'available_slots', '[]'::jsonb
      );
      v_dates_arr := v_dates_arr || v_date_obj;
      CONTINUE;
    END IF;

    -- Validar ventana horaria
    IF v_eff_open_time IS NULL OR v_eff_close_time IS NULL OR v_eff_open_time >= v_eff_close_time THEN
      v_date_obj := jsonb_build_object(
        'date', to_char(v_eval_date, 'YYYY-MM-DD'),
        'day_of_week', v_eval_dow,
        'available', false,
        'status', 'configuration_required',
        'reason', 'invalid_time_window',
        'open_time', null,
        'close_time', null,
        'slot_interval_minutes', null,
        'available_slots', '[]'::jsonb
      );
      v_dates_arr := v_dates_arr || v_date_obj;
      CONTINUE;
    END IF;

    -- 3. Validación de Completitud: Si no hay slot_interval_minutes, la fecha requiere configuración
    IF v_eff_interval IS NULL OR v_eff_interval <= 0 THEN
      v_date_obj := jsonb_build_object(
        'date', to_char(v_eval_date, 'YYYY-MM-DD'),
        'day_of_week', v_eval_dow,
        'available', false,
        'status', 'configuration_required',
        'reason', 'slot_interval_required',
        'open_time', to_char(v_eff_open_time, 'HH24:MI:SS'),
        'close_time', to_char(v_eff_close_time, 'HH24:MI:SS'),
        'slot_interval_minutes', null,
        'available_slots', '[]'::jsonb
      );
      v_dates_arr := v_dates_arr || v_date_obj;
      CONTINUE;
    END IF;

    -- 4. Generación de Slots discretos cuando el intervalo está configurado
    v_min_lead_threshold := v_tz_now + (v_eff_min_lead || ' minutes')::interval;
    v_candidate_time := v_eff_open_time;

    WHILE v_candidate_time < v_eff_close_time LOOP
      v_slot_timestamp := (v_eval_date || ' ' || to_char(v_candidate_time, 'HH24:MI:SS'))::timestamp without time zone;

      -- Validar anticipación mínima autoritativa de la regla u override
      IF v_slot_timestamp >= v_min_lead_threshold THEN
        -- Aplicar todos los bloques sustractivos coincidentes (globales + modalidad + punto específico)
        SELECT EXISTS (
          SELECT 1 FROM public.zanita_availability_blocks
          WHERE is_active = true
            AND block_date = v_eval_date
            AND delivery_mode IN (p_delivery_mode, 'all')
            AND (delivery_point_id = p_delivery_point_id OR delivery_point_id IS NULL)
            AND v_candidate_time < end_time
            AND (v_candidate_time + (v_eff_interval || ' minutes')::interval) > start_time
        ) INTO v_is_blocked;

        IF NOT v_is_blocked THEN
          v_available_slots := v_available_slots || to_char(v_candidate_time, 'HH24:MI');
        END IF;
      END IF;

      v_candidate_time := (v_candidate_time + (v_eff_interval || ' minutes')::interval)::time;
    END LOOP;

    v_date_obj := jsonb_build_object(
      'date', to_char(v_eval_date, 'YYYY-MM-DD'),
      'day_of_week', v_eval_dow,
      'available', (COALESCE(array_length(v_available_slots, 1), 0) > 0),
      'status', CASE WHEN COALESCE(array_length(v_available_slots, 1), 0) > 0 THEN 'available' ELSE 'no_slots_available' END,
      'open_time', to_char(v_eff_open_time, 'HH24:MI:SS'),
      'close_time', to_char(v_eff_close_time, 'HH24:MI:SS'),
      'slot_interval_minutes', v_eff_interval,
      'available_slots', to_jsonb(v_available_slots)
    );

    v_dates_arr := v_dates_arr || v_date_obj;
  END LOOP;

  -- Determinar estado top-level resultante
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_dates_arr) d WHERE (d->>'available')::boolean = true) THEN
    v_top_status := 'configured';
  ELSIF EXISTS (SELECT 1 FROM jsonb_array_elements(v_dates_arr) d WHERE d->>'status' = 'configuration_required') THEN
    v_top_status := 'configuration_required';
  ELSIF (SELECT count(*) FROM jsonb_array_elements(v_dates_arr) d WHERE d->>'status' = 'closed') = jsonb_array_length(v_dates_arr) THEN
    v_top_status := 'closed';
  ELSIF (SELECT count(*) FROM jsonb_array_elements(v_dates_arr) d WHERE d->>'status' = 'cutoff_reached') = jsonb_array_length(v_dates_arr) THEN
    v_top_status := 'cutoff_reached';
  ELSE
    v_top_status := 'not_available';
  END IF;

  RETURN jsonb_build_object(
    'status', v_top_status,
    'timezone', v_timezone,
    'delivery_mode', p_delivery_mode,
    'delivery_point_id', p_delivery_point_id,
    'dates', v_dates_arr
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_checkout_availability(text, uuid, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_checkout_availability(text, uuid, date, integer) TO authenticated;

-- ---------------------------------------------------------------------------------
-- 4. ACTUALIZAR RPC: SUBMIT ORDER (AVAILABILITY ENGINE AS AUTHORITATIVE SOURCE)
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_order(
  p_idempotency_key    uuid,
  p_customer_name      text,
  p_customer_phone     text,
  p_customer_email     text,
  p_requested_date     date,
  p_requested_time     time,
  p_delivery_point_id  uuid,
  p_delivery_address   text,
  p_notes              text,
  p_items              jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id                     uuid;
  v_existing_order              record;
  v_dp                          record;
  v_delivery_mode               text;
  v_cetys_enabled               boolean;
  v_delivery_fee_cents          integer;
  v_delivery_quote_status       text;
  v_delivery_address            text;

  -- Verificación autoritativa del motor de disponibilidad
  v_avail_result                jsonb;
  v_avail_status                text;
  v_avail_date_obj              jsonb;
  v_req_time_str                text;
  v_slot_is_available           boolean := false;

  -- Sanitized customer inputs
  v_customer_name               text;
  v_customer_phone              text;
  v_customer_email              text;

  -- Item iteration & validation variables (bigint for safe accumulation)
  v_item                        jsonb;
  v_prod_id                     uuid;
  v_item_qty                    integer;
  v_item_qty_num                numeric;
  v_prod                        record;
  v_item_options                jsonb;
  v_item_extras_cents           bigint;
  v_base_unit_price_cents       bigint;
  v_final_unit_price_cents      bigint;
  v_item_subtotal_cents         bigint;
  v_products_subtotal_cents     bigint := 0;
  v_total_amount_cents          bigint;

  -- Option groups validation
  v_pog                         record;
  v_opt_elem                    jsonb;
  v_opt_id                      uuid;
  v_opt_qty                     integer;
  v_opt_qty_num                 numeric;
  v_opt                         record;
  v_normal_qty                  integer;
  v_always_charge_qty           integer;
  v_always_charge_cents         bigint;
  v_group_normal_cents          bigint;
  v_group_normal_unit_price     integer;
  v_excess_normal_qty           integer;
  v_matched_options_count       integer;

  -- Data collections for atomic persistence
  v_validated_items             jsonb := '[]'::jsonb;
  v_item_data                   jsonb;
  v_opt_data                    jsonb;
  v_validated_item_options      jsonb;
  v_seen_options                text[];

  -- Result handles
  v_order_id                    uuid;
  v_order_number                text;
  v_order_item_id               uuid;
BEGIN
  -- -------------------------------------------------------------------------------
  -- A. VALIDACIÓN DE AUTORIDAD (USUARIO AUTENTICADO)
  -- -------------------------------------------------------------------------------
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado. Debes iniciar sesión para realizar un pedido.' USING ERRCODE = 'P0001';
  END IF;

  -- -------------------------------------------------------------------------------
  -- B. IDEMPOTENCIA OBLIGATORIA (FAST PATH & NULL PROTECTION)
  -- -------------------------------------------------------------------------------
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'La clave de idempotencia (idempotency_key) es obligatoria.' USING ERRCODE = 'P0001';
  END IF;

  SELECT
    id,
    order_number,
    status,
    products_subtotal_cents,
    delivery_fee_cents,
    total_amount_cents,
    delivery_quote_status
  INTO v_existing_order
  FROM public.zanita_orders
  WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'order_id',                v_existing_order.id,
      'order_number',            v_existing_order.order_number,
      'status',                  v_existing_order.status,
      'products_subtotal_cents', v_existing_order.products_subtotal_cents,
      'delivery_fee_cents',      v_existing_order.delivery_fee_cents,
      'total_amount_cents',      v_existing_order.total_amount_cents,
      'delivery_quote_status',   v_existing_order.delivery_quote_status,
      'is_idempotent_replay',    true
    );
  END IF;

  -- -------------------------------------------------------------------------------
  -- C. VALIDACIÓN DE DATOS DEL CLIENTE Y LÍMITES DE ENTRADA
  -- -------------------------------------------------------------------------------
  v_customer_name  := trim(COALESCE(p_customer_name, ''));
  v_customer_phone := trim(COALESCE(p_customer_phone, ''));
  v_customer_email := trim(COALESCE(p_customer_email, ''));

  IF length(v_customer_name) = 0 OR length(v_customer_name) > 100 THEN
    RAISE EXCEPTION 'El nombre del cliente es obligatorio y no debe exceder 100 caracteres.' USING ERRCODE = 'P0002';
  END IF;

  IF length(v_customer_phone) = 0 OR length(v_customer_phone) > 30 THEN
    RAISE EXCEPTION 'El teléfono de contacto es obligatorio y no debe exceder 30 caracteres.' USING ERRCODE = 'P0002';
  END IF;

  IF length(v_customer_email) = 0 OR length(v_customer_email) > 150 THEN
    RAISE EXCEPTION 'El correo electrónico es obligatorio y no debe exceder 150 caracteres.' USING ERRCODE = 'P0002';
  END IF;

  IF v_customer_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'El formato del correo electrónico es inválido.' USING ERRCODE = 'P0002';
  END IF;

  IF p_notes IS NOT NULL AND length(p_notes) > 1000 THEN
    RAISE EXCEPTION 'Las notas del pedido no deben exceder 1000 caracteres.' USING ERRCODE = 'P0002';
  END IF;

  IF p_delivery_address IS NOT NULL AND length(p_delivery_address) > 500 THEN
    RAISE EXCEPTION 'La dirección de entrega no debe exceder 500 caracteres.' USING ERRCODE = 'P0002';
  END IF;

  IF p_requested_date IS NULL OR p_requested_time IS NULL THEN
    RAISE EXCEPTION 'La fecha y hora solicitadas son obligatorias.' USING ERRCODE = 'P0003';
  END IF;

  -- -------------------------------------------------------------------------------
  -- D. VALIDACIÓN DE PUNTO DE ENTREGA Y MODALIDAD
  -- -------------------------------------------------------------------------------
  IF p_delivery_point_id IS NULL THEN
    RAISE EXCEPTION 'Debes seleccionar un punto o modalidad de entrega.' USING ERRCODE = 'P0004';
  END IF;

  SELECT * INTO v_dp
  FROM public.zanita_delivery_points
  WHERE id = p_delivery_point_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El punto de entrega seleccionado no existe o no está activo.' USING ERRCODE = 'P0004';
  END IF;

  -- Mapear a delivery_mode canónico del motor de disponibilidad
  IF v_dp.type = 'standard' THEN
    v_delivery_mode := 'official_point';
  ELSIF v_dp.type = 'special' THEN
    v_delivery_mode := 'cetys_pickup';
  ELSIF v_dp.type = 'other' THEN
    v_delivery_mode := 'home_delivery';
  ELSE
    RAISE EXCEPTION 'Tipo de punto de entrega desconocido: %', v_dp.type USING ERRCODE = 'P0004';
  END IF;

  -- Caso 1: CETYS (requiere perfil con cetys_pickup_enabled = true)
  IF v_dp.requires_special_pickup_permission THEN
    SELECT cetys_pickup_enabled INTO v_cetys_enabled
    FROM public.profiles
    WHERE id = v_user_id;

    IF COALESCE(v_cetys_enabled, false) = false THEN
      RAISE EXCEPTION 'No tienes autorización para seleccionar entrega en CETYS.' USING ERRCODE = 'P0005';
    END IF;

    v_delivery_fee_cents    := 0;
    v_delivery_quote_status := 'not_required';
    v_delivery_address      := v_dp.address;

  -- Caso 2: Otra ubicación (domicilio fuera de puntos oficiales)
  ELSIF v_dp.type = 'other' THEN
    IF length(trim(COALESCE(p_delivery_address, ''))) = 0 THEN
      RAISE EXCEPTION 'Debes proporcionar la dirección de entrega para la cotización de envío.' USING ERRCODE = 'P0008';
    END IF;

    v_delivery_fee_cents    := NULL;
    v_delivery_quote_status := 'pending';
    v_delivery_address      := trim(p_delivery_address);

  -- Caso 3: Puntos oficiales estándar (Alba Roja, Ermita, Las Palmas, Hipódromo, Las Ferias, Punto Medio)
  ELSE
    v_delivery_fee_cents    := 0;
    v_delivery_quote_status := 'not_required';
    v_delivery_address      := v_dp.address;
  END IF;

  -- -------------------------------------------------------------------------------
  -- E. VALIDACIÓN AUTORITATIVA OBLIGATORIA (AVAILABILITY ENGINE COMO FUENTE DE VERDAD)
  -- -------------------------------------------------------------------------------
  -- SIEMPRE se invoca el motor de disponibilidad para el día solicitado.
  -- Valida de manera integral: horario, intervalo, bloques, overrides, lead time y cutoff.
  v_avail_result := public.get_checkout_availability(
    v_delivery_mode,
    CASE WHEN v_delivery_mode = 'official_point' THEN p_delivery_point_id ELSE NULL END,
    p_requested_date,
    1
  );

  IF v_avail_result IS NULL THEN
    RAISE EXCEPTION 'Error al evaluar la disponibilidad del servicio.' USING ERRCODE = 'P0037';
  END IF;

  v_avail_status := v_avail_result->>'status';

  -- Rechazar si la modalidad no está configurada o no está autorizada
  IF v_avail_status = 'not_authorized' THEN
    RAISE EXCEPTION 'No tienes autorización para seleccionar esta modalidad de entrega.' USING ERRCODE = 'P0005';
  ELSIF v_avail_status = 'configuration_required' THEN
    RAISE EXCEPTION 'La modalidad de entrega no tiene horarios operativos configurados.' USING ERRCODE = 'P0037';
  END IF;

  IF jsonb_typeof(v_avail_result->'dates') <> 'array' OR jsonb_array_length(v_avail_result->'dates') = 0 THEN
    RAISE EXCEPTION 'La fecha u horario solicitado no se encuentra disponible.' USING ERRCODE = 'P0037';
  END IF;

  v_avail_date_obj := (v_avail_result->'dates')->0;

  IF COALESCE((v_avail_date_obj->>'available')::boolean, false) = false THEN
    IF (v_avail_date_obj->>'status') = 'cutoff_reached' THEN
      RAISE EXCEPTION 'El horario límite de recepción para la fecha seleccionada ya fue alcanzado.' USING ERRCODE = 'P0036';
    ELSIF (v_avail_date_obj->>'status') = 'closed' THEN
      RAISE EXCEPTION 'La tienda o punto de entrega no tiene servicio en la fecha solicitada.' USING ERRCODE = 'P0037';
    ELSIF (v_avail_date_obj->>'status') = 'configuration_required' THEN
      RAISE EXCEPTION 'La fecha solicitada requiere configuración operativa por parte de la administración.' USING ERRCODE = 'P0037';
    ELSIF (v_avail_date_obj->>'status') = 'no_slots_available' THEN
      RAISE EXCEPTION 'No hay horarios disponibles para la fecha seleccionada (anticipación mínima o bloqueos).' USING ERRCODE = 'P0037';
    ELSE
      RAISE EXCEPTION 'La fecha solicitada no se encuentra disponible para entregas.' USING ERRCODE = 'P0037';
    END IF;
  END IF;

  -- Validar que el horario específico esté dentro de los slots disponibles
  v_req_time_str := to_char(p_requested_time, 'HH24:MI');
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(v_avail_date_obj->'available_slots') slot_elem
    WHERE slot_elem = v_req_time_str
  ) INTO v_slot_is_available;

  IF NOT v_slot_is_available THEN
    RAISE EXCEPTION 'El horario seleccionado (%) no está disponible para esta fecha y punto de entrega.', v_req_time_str USING ERRCODE = 'P0037';
  END IF;

  -- -------------------------------------------------------------------------------
  -- F. VALIDACIÓN DE ITEMS Y OPCIONES CON CÁLCULO AUTORITATIVO DE PRECIOS
  -- -------------------------------------------------------------------------------
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El carrito está vacío.' USING ERRCODE = 'P0009';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'Estructura de ítem inválida en el carrito.' USING ERRCODE = 'P0010';
    END IF;

    BEGIN
      v_prod_id  := (v_item->>'product_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Identificador de producto inválido en el carrito.' USING ERRCODE = 'P0010';
    END;

    IF jsonb_typeof(v_item->'quantity') <> 'number' THEN
      RAISE EXCEPTION 'La cantidad del producto debe ser un número entero.' USING ERRCODE = 'P0010';
    END IF;

    v_item_qty_num := (v_item->>'quantity')::numeric;
    IF v_item_qty_num <> trunc(v_item_qty_num) OR v_item_qty_num <= 0 THEN
      RAISE EXCEPTION 'La cantidad del producto debe ser un entero positivo.' USING ERRCODE = 'P0010';
    END IF;
    v_item_qty := v_item_qty_num::integer;

    SELECT id, name, base_price_cents INTO v_prod
    FROM public.zanita_products
    WHERE id = v_prod_id AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado o inactivo en el catálogo.' USING ERRCODE = 'P0011';
    END IF;

    -- Validar options array
    IF v_item ? 'options' AND jsonb_typeof(v_item->'options') <> 'array' THEN
      RAISE EXCEPTION 'Estructura de opciones inválida para el producto "%".', v_prod.name USING ERRCODE = 'P0010';
    END IF;

    v_item_options := COALESCE(v_item->'options', '[]'::jsonb);

    -- Validar unicidad y tipos de opciones dentro del ítem
    v_seen_options := ARRAY[]::text[];
    FOR v_opt_elem IN SELECT * FROM jsonb_array_elements(v_item_options)
    LOOP
      IF jsonb_typeof(v_opt_elem) <> 'object' THEN
        RAISE EXCEPTION 'Estructura de opción inválida en el producto "%".', v_prod.name USING ERRCODE = 'P0010';
      END IF;

      BEGIN
        v_opt_id := (v_opt_elem->>'option_id')::uuid;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Identificador de opción inválido en el producto "%".', v_prod.name USING ERRCODE = 'P0010';
      END;

      IF jsonb_typeof(v_opt_elem->'quantity') <> 'number' THEN
        RAISE EXCEPTION 'La cantidad de la opción debe ser un número entero.' USING ERRCODE = 'P0010';
      END IF;

      v_opt_qty_num := (v_opt_elem->>'quantity')::numeric;
      IF v_opt_qty_num <> trunc(v_opt_qty_num) OR v_opt_qty_num <= 0 THEN
        RAISE EXCEPTION 'La cantidad de cada opción seleccionada debe ser mayor a 0.' USING ERRCODE = 'P0010';
      END IF;
      v_opt_qty := v_opt_qty_num::integer;

      -- Defensa contra opciones duplicadas enviadas en líneas separadas
      IF v_opt_id::text = ANY(v_seen_options) THEN
        RAISE EXCEPTION 'Opción duplicada: la opción con ID % debe enviarse en una sola línea con su cantidad total.', v_opt_id USING ERRCODE = 'P0014';
      END IF;
      v_seen_options := array_append(v_seen_options, v_opt_id::text);

      -- Validar existencia y estado activo de la opción
      SELECT o.id, o.group_id, o.name, o.additional_price_cents, o.always_charge, o.is_active
      INTO v_opt
      FROM public.zanita_options o
      WHERE o.id = v_opt_id;

      IF NOT FOUND OR v_opt.is_active = false THEN
        RAISE EXCEPTION 'Una de las opciones seleccionadas no existe o está inactiva.' USING ERRCODE = 'P0015';
      END IF;

      -- Verificar que el grupo de esta opción esté realmente asociado al producto
      IF NOT EXISTS (
        SELECT 1
        FROM public.zanita_product_option_groups pog
        JOIN public.zanita_option_groups og ON og.id = pog.group_id
        WHERE pog.product_id = v_prod.id AND pog.group_id = v_opt.group_id AND og.is_active = true
      ) THEN
        RAISE EXCEPTION 'La opción "%" no pertenece a ningún grupo disponible para "%".', v_opt.name, v_prod.name USING ERRCODE = 'P0016';
      END IF;
    END LOOP;

    -- Validar TODOS los grupos de opciones configurados para este producto
    v_item_extras_cents      := 0;
    v_matched_options_count  := 0;
    v_validated_item_options := '[]'::jsonb;

    FOR v_pog IN
      SELECT
        pog.group_id,
        pog.is_required,
        pog.min_selections,
        pog.max_selections,
        pog.included_selections,
        pog.allow_repeats,
        og.name AS group_name
      FROM public.zanita_product_option_groups pog
      JOIN public.zanita_option_groups og ON og.id = pog.group_id
      WHERE pog.product_id = v_prod.id AND og.is_active = true
      ORDER BY pog.display_order ASC
    LOOP
      v_normal_qty              := 0;
      v_always_charge_qty       := 0;
      v_always_charge_cents     := 0;
      v_group_normal_cents      := 0;
      v_group_normal_unit_price := NULL;

      FOR v_opt_elem IN SELECT * FROM jsonb_array_elements(v_item_options)
      LOOP
        v_opt_id  := (v_opt_elem->>'option_id')::uuid;
        v_opt_qty := (v_opt_elem->>'quantity')::integer;

        SELECT id, group_id, name, additional_price_cents, always_charge
        INTO v_opt
        FROM public.zanita_options
        WHERE id = v_opt_id AND group_id = v_pog.group_id;

        IF FOUND THEN
          v_matched_options_count := v_matched_options_count + 1;

          IF v_opt_qty > 1 AND v_pog.allow_repeats = false THEN
            RAISE EXCEPTION 'El grupo "%" no permite seleccionar la misma opción más de una vez.', v_pog.group_name USING ERRCODE = 'P0017';
          END IF;

          IF v_opt.always_charge = true THEN
            v_always_charge_qty   := v_always_charge_qty + v_opt_qty;
            v_always_charge_cents := v_always_charge_cents + (v_opt.additional_price_cents::bigint * v_opt_qty);
          ELSE
            v_normal_qty := v_normal_qty + v_opt_qty;
            IF v_opt.additional_price_cents > 0 THEN
              IF v_group_normal_unit_price IS NULL THEN
                v_group_normal_unit_price := v_opt.additional_price_cents;
              ELSIF v_group_normal_unit_price <> v_opt.additional_price_cents THEN
                RAISE EXCEPTION 'Inconsistencia de precios estándar en el grupo "%".', v_pog.group_name USING ERRCODE = 'P0018';
              END IF;
            END IF;
          END IF;

          v_validated_item_options := v_validated_item_options || jsonb_build_object(
            'option_id',                v_opt.id,
            'option_name',              v_opt.name,
            'group_name',               v_pog.group_name,
            'additional_price_cents',   v_opt.additional_price_cents,
            'always_charge',            v_opt.always_charge,
            'quantity',                 v_opt_qty
          );
        END IF;
      END LOOP;

      IF v_pog.is_required = true AND v_normal_qty < v_pog.min_selections THEN
        RAISE EXCEPTION 'Debes seleccionar al menos % opciones del grupo "%".', v_pog.min_selections, v_pog.group_name USING ERRCODE = 'P0019';
      END IF;

      IF v_pog.max_selections IS NOT NULL AND v_normal_qty > v_pog.max_selections THEN
        RAISE EXCEPTION 'No puedes seleccionar más de % opciones del grupo "%".', v_pog.max_selections, v_pog.group_name USING ERRCODE = 'P0020';
      END IF;

      IF v_pog.included_selections IS NOT NULL AND v_normal_qty > v_pog.included_selections THEN
        v_excess_normal_qty  := v_normal_qty - v_pog.included_selections;
        v_group_normal_cents := v_excess_normal_qty * COALESCE(v_group_normal_unit_price, 0)::bigint;
      END IF;

      v_item_extras_cents := v_item_extras_cents + v_always_charge_cents + v_group_normal_cents;
    END LOOP;

    -- Verificar que no haya opciones huérfanas
    IF v_matched_options_count <> jsonb_array_length(v_item_options) THEN
      RAISE EXCEPTION 'Una o más opciones enviadas no pertenecen a los grupos de opciones de "%".', v_prod.name USING ERRCODE = 'P0021';
    END IF;

    -- Cálculos monetarios seguros del ítem
    v_base_unit_price_cents   := v_prod.base_price_cents;
    v_final_unit_price_cents  := v_base_unit_price_cents + v_item_extras_cents;
    v_item_subtotal_cents     := v_final_unit_price_cents * v_item_qty;
    v_products_subtotal_cents := v_products_subtotal_cents + v_item_subtotal_cents;

    v_validated_items := v_validated_items || jsonb_build_object(
      'product_id',        v_prod.id,
      'product_name',      v_prod.name,
      'base_price_cents',  v_base_unit_price_cents,
      'final_price_cents', v_final_unit_price_cents,
      'quantity',          v_item_qty,
      'subtotal_cents',    v_item_subtotal_cents,
      'options',           v_validated_item_options
    );
  END LOOP;

  -- -------------------------------------------------------------------------------
  -- G. CÁLCULO DE TOTALES Y VALIDACIÓN DE RANGO INTEGER
  -- -------------------------------------------------------------------------------
  v_total_amount_cents := v_products_subtotal_cents + COALESCE(v_delivery_fee_cents, 0);

  IF v_total_amount_cents > 2147483647 THEN
    RAISE EXCEPTION 'El monto total del pedido excede el límite del sistema.' USING ERRCODE = 'P0035';
  END IF;

  -- -------------------------------------------------------------------------------
  -- H. INSERCIÓN ATÓMICA DE LA ORDEN (CON CAPTURA ROBUSTA DE IDEMPOTENCY VIOLATION)
  -- -------------------------------------------------------------------------------
  BEGIN
    INSERT INTO public.zanita_orders (
      user_id,
      idempotency_key,
      customer_name_snapshot,
      customer_phone_snapshot,
      customer_email_snapshot,
      status,
      products_subtotal_cents,
      delivery_fee_cents,
      total_amount_cents,
      deposit_required_pct,
      amount_paid_cents,
      requested_date,
      requested_time,
      delivery_point_id,
      delivery_name_snapshot,
      delivery_type_snapshot,
      delivery_address_snapshot,
      delivery_requires_quote_snapshot,
      delivery_quote_status,
      notes
    ) VALUES (
      v_user_id,
      p_idempotency_key,
      v_customer_name,
      v_customer_phone,
      v_customer_email,
      'pending_approval',
      v_products_subtotal_cents::integer,
      v_delivery_fee_cents,
      v_total_amount_cents::integer,
      NULL,
      0,
      p_requested_date,
      p_requested_time,
      p_delivery_point_id,
      v_dp.name,
      v_dp.type,
      v_delivery_address,
      v_dp.requires_quote,
      v_delivery_quote_status,
      p_notes
    )
    RETURNING id, order_number INTO v_order_id, v_order_number;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT
        id,
        order_number,
        status,
        products_subtotal_cents,
        delivery_fee_cents,
        total_amount_cents,
        delivery_quote_status
      INTO v_existing_order
      FROM public.zanita_orders
      WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'order_id',                v_existing_order.id,
          'order_number',            v_existing_order.order_number,
          'status',                  v_existing_order.status,
          'products_subtotal_cents', v_existing_order.products_subtotal_cents,
          'delivery_fee_cents',      v_existing_order.delivery_fee_cents,
          'total_amount_cents',      v_existing_order.total_amount_cents,
          'delivery_quote_status',   v_existing_order.delivery_quote_status,
          'is_idempotent_replay',    true
        );
      ELSE
        RAISE;
      END IF;
  END;

  -- -------------------------------------------------------------------------------
  -- I. INSERCIÓN DE ORDER ITEMS Y ORDER ITEM OPTIONS
  -- -------------------------------------------------------------------------------
  FOR v_item_data IN SELECT * FROM jsonb_array_elements(v_validated_items)
  LOOP
    INSERT INTO public.zanita_order_items (
      order_id,
      product_id,
      product_name_snapshot,
      base_unit_price_snapshot_cents,
      final_unit_price_snapshot_cents,
      quantity,
      subtotal_cents
    ) VALUES (
      v_order_id,
      (v_item_data->>'product_id')::uuid,
      v_item_data->>'product_name',
      (v_item_data->>'base_price_cents')::integer,
      (v_item_data->>'final_price_cents')::integer,
      (v_item_data->>'quantity')::integer,
      (v_item_data->>'subtotal_cents')::integer
    )
    RETURNING id INTO v_order_item_id;

    FOR v_opt_data IN SELECT * FROM jsonb_array_elements(v_item_data->'options')
    LOOP
      INSERT INTO public.zanita_order_item_options (
        order_item_id,
        option_id,
        option_name_snapshot,
        group_name_snapshot,
        additional_price_snapshot_cents,
        quantity
      ) VALUES (
        v_order_item_id,
        (v_opt_data->>'option_id')::uuid,
        v_opt_data->>'option_name',
        v_opt_data->>'group_name',
        (v_opt_data->>'additional_price_cents')::integer,
        (v_opt_data->>'quantity')::integer
      );
    END LOOP;
  END LOOP;

  -- -------------------------------------------------------------------------------
  -- J. RESPUESTA EXITOSA
  -- -------------------------------------------------------------------------------
  RETURN jsonb_build_object(
    'order_id',                v_order_id,
    'order_number',            v_order_number,
    'status',                  'pending_approval',
    'products_subtotal_cents', v_products_subtotal_cents::integer,
    'delivery_fee_cents',      v_delivery_fee_cents,
    'total_amount_cents',      v_total_amount_cents::integer,
    'delivery_quote_status',   v_delivery_quote_status,
    'is_idempotent_replay',    false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_order(uuid, text, text, text, date, time, uuid, text, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_order(uuid, text, text, text, date, time, uuid, text, text, jsonb) TO authenticated;
