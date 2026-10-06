-- =====================================================================================
-- Migration: 20261001160000_availability_engine.sql
-- Description: Implementa el motor de disponibilidad (Availability Engine),
--              cálculo de distancias Haversine seguro y funciones RPC seguras
--              para Checkout (get_checkout_availability y quote_home_delivery).
--              Incluye precedencia estricta punto vs global, semántica de corte
--              para el día actual, completitud de slot interval y anonimización de cotización.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. EXTENSIÓN DE TABLAS: SLOT_INTERVAL_MINUTES
-- -------------------------------------------------------------------------------------

ALTER TABLE public.zanita_availability_rules
  ADD COLUMN IF NOT EXISTS slot_interval_minutes integer NULL
  CHECK (slot_interval_minutes IS NULL OR slot_interval_minutes > 0);

ALTER TABLE public.zanita_calendar_overrides
  ADD COLUMN IF NOT EXISTS slot_interval_minutes integer NULL
  CHECK (slot_interval_minutes IS NULL OR slot_interval_minutes > 0);

-- -------------------------------------------------------------------------------------
-- 2. RESTRICCIONES DE UNICIDAD PARA EVITAR REGLAS / OVERRIDES AMBIGUOS
-- -------------------------------------------------------------------------------------

-- Impedir dos reglas base activas para la misma combinación de (delivery_mode, delivery_point_id, day_of_week)
-- Nota: COALESCE permite tratar NULL de manera determinística para reglas globales de modalidad
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_zanita_avail_rules_active
  ON public.zanita_availability_rules (
    delivery_mode, 
    COALESCE(delivery_point_id, '00000000-0000-0000-0000-000000000000'::uuid), 
    day_of_week
  )
  WHERE is_active = true;

-- Impedir dos calendar_overrides activos para la misma combinación de fecha, modalidad y punto
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_zanita_cal_overrides_active
  ON public.zanita_calendar_overrides (
    override_date, 
    delivery_mode, 
    COALESCE(delivery_point_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE is_active = true;

-- (Nota: zanita_availability_blocks NO tiene índice de unicidad para permitir múltiples sub-bloqueos intradía)

-- -------------------------------------------------------------------------------------
-- 3. FUNCIÓN PRIVADA HAVERSINE (ZERO EXTERNAL COST)
-- -------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.haversine_distance_km(
  p_lat1 numeric,
  p_lon1 numeric,
  p_lat2 numeric,
  p_lon2 numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_dlat double precision;
  v_dlon double precision;
  v_lat1 double precision;
  v_lat2 double precision;
  v_a    double precision;
  v_c    double precision;
  v_r    double precision := 6371.0; -- Radio terrestre medio en kilómetros
BEGIN
  -- 1. Validar rangos geográficos
  IF p_lat1 < -90 OR p_lat1 > 90 OR p_lat2 < -90 OR p_lat2 > 90 THEN
    RAISE EXCEPTION 'Latitud fuera de rango (-90 a 90): %, %', p_lat1, p_lat2 USING ERRCODE = '22003';
  END IF;

  IF p_lon1 < -180 OR p_lon1 > 180 OR p_lon2 < -180 OR p_lon2 > 180 THEN
    RAISE EXCEPTION 'Longitud fuera de rango (-180 a 180): %, %', p_lon1, p_lon2 USING ERRCODE = '22003';
  END IF;

  -- 2. Convertir a radianes
  v_lat1 := radians(p_lat1::double precision);
  v_lat2 := radians(p_lat2::double precision);
  v_dlat := radians((p_lat2 - p_lat1)::double precision);
  v_dlon := radians((p_lon2 - p_lon1)::double precision);

  -- 3. Fórmula de Haversine
  v_a := sin(v_dlat / 2.0) * sin(v_dlat / 2.0) +
         cos(v_lat1) * cos(v_lat2) *
         sin(v_dlon / 2.0) * sin(v_dlon / 2.0);
  v_c := 2.0 * atan2(sqrt(v_a), sqrt(1.0 - v_a));

  RETURN round((v_r * v_c)::numeric, 2);
END;
$$;

-- Restringir función Haversine a uso interno de la base de datos
REVOKE ALL ON FUNCTION private.haversine_distance_km(numeric, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 4. RPC PÚBLICA 1: GET CHECKOUT AVAILABILITY
-- -------------------------------------------------------------------------------------

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

  -- Cutoff de envío para el día de HOY
  v_today_override          record;
  v_today_rule              record;
  v_today_cutoff            time;
  v_current_cutoff_reached  boolean := false;

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
  -- E. EVALUACIÓN DEL CUTOFF ACTUAL DE RECEPCIÓN (BASADO EN HOY EN TIJUANA)
  -- ---------------------------------------------------------------------------------
  -- Precedencia para resolver el cutoff efectivo de HOY:
  -- 1) Override exacto de punto para hoy
  -- 2) Override general de modalidad para hoy (delivery_point_id NULL)
  -- 3) Regla recurrente exacta de punto para el día de hoy
  -- 4) Regla recurrente general de modalidad para el día de hoy
  SELECT * INTO v_today_override
  FROM public.zanita_calendar_overrides
  WHERE is_active = true
    AND override_date = v_current_tz_date
    AND delivery_mode IN (p_delivery_mode, 'all')
    AND (delivery_point_id = p_delivery_point_id OR delivery_point_id IS NULL)
  ORDER BY (delivery_point_id IS NOT NULL) DESC, (delivery_mode = p_delivery_mode) DESC
  LIMIT 1;

  IF FOUND THEN
    v_today_cutoff := v_today_override.submission_cutoff_time;
  ELSE
    SELECT * INTO v_today_rule
    FROM public.zanita_availability_rules
    WHERE is_active = true
      AND delivery_mode = p_delivery_mode
      AND day_of_week = v_current_tz_dow
      AND (delivery_point_id = p_delivery_point_id OR delivery_point_id IS NULL)
    ORDER BY (delivery_point_id IS NOT NULL) DESC
    LIMIT 1;

    IF FOUND THEN
      v_today_cutoff := v_today_rule.submission_cutoff_time;
    ELSE
      -- Si hoy no tiene regla ni override para esta modalidad/punto, no inventar cutoff
      v_today_cutoff := NULL;
    END IF;
  END IF;

  IF v_today_cutoff IS NOT NULL AND v_current_tz_time >= v_today_cutoff THEN
    v_current_cutoff_reached := true;
  END IF;

  -- ---------------------------------------------------------------------------------
  -- F. CONSTRUCCIÓN DE DISPONIBILIDAD DÍA POR DÍA
  -- ---------------------------------------------------------------------------------
  FOR v_day_offset IN 0..(v_days - 1) LOOP
    v_eval_date := v_start_date + v_day_offset;
    v_eval_dow  := EXTRACT(ISODOW FROM v_eval_date)::integer;
    v_has_config := false;
    v_available_slots := ARRAY[]::text[];

    -- Si el cutoff de recepción de hoy ya venció, NO se pueden aceptar solicitudes hoy
    IF v_current_cutoff_reached THEN
      v_date_obj := jsonb_build_object(
        'date', to_char(v_eval_date, 'YYYY-MM-DD'),
        'day_of_week', v_eval_dow,
        'available', false,
        'status', 'cutoff_reached',
        'open_time', null,
        'close_time', null,
        'slot_interval_minutes', null,
        'available_slots', '[]'::jsonb
      );
      v_dates_arr := v_dates_arr || v_date_obj;
      CONTINUE;
    END IF;

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
        v_status_code := v_override.status;
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

      -- Validar anticipación mínima
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
  IF v_current_cutoff_reached THEN
    v_top_status := 'cutoff_reached';
  ELSIF EXISTS (SELECT 1 FROM jsonb_array_elements(v_dates_arr) d WHERE (d->>'available')::boolean = true) THEN
    v_top_status := 'configured';
  ELSIF EXISTS (SELECT 1 FROM jsonb_array_elements(v_dates_arr) d WHERE d->>'status' = 'configuration_required') THEN
    v_top_status := 'configuration_required';
  ELSIF (SELECT count(*) FROM jsonb_array_elements(v_dates_arr) d WHERE d->>'status' = 'closed') = jsonb_array_length(v_dates_arr) THEN
    v_top_status := 'closed';
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

-- Permisos RPC de disponibilidad
REVOKE ALL ON FUNCTION public.get_checkout_availability(text, uuid, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_checkout_availability(text, uuid, date, integer) TO authenticated;

-- -------------------------------------------------------------------------------------
-- 5. RPC PÚBLICA 2: QUOTE HOME DELIVERY
-- -------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.quote_home_delivery(
  p_latitude numeric,
  p_longitude numeric,
  p_requested_date date DEFAULT NULL,
  p_requested_time time DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_kitchen_loc         jsonb;
  v_kitchen_lat         numeric;
  v_kitchen_lon         numeric;
  v_distance_km         numeric;
  v_rule                record;
  v_surcharges_sum      integer := 0;
  v_final_fee_cents     integer;
  v_dow                 integer;
BEGIN
  -- 1. Validar coordenadas del cliente
  IF p_latitude IS NULL OR p_longitude IS NULL THEN
    RETURN jsonb_build_object(
      'requires_manual_quote', true,
      'calculated_fee_cents', null,
      'distance_km', null,
      'reason', 'missing_coordinates'
    );
  END IF;

  IF p_latitude < -90 OR p_latitude > 90 THEN
    RAISE EXCEPTION 'Latitud inválida (-90 a 90): %', p_latitude USING ERRCODE = '22003';
  END IF;

  IF p_longitude < -180 OR p_longitude > 180 THEN
    RAISE EXCEPTION 'Longitud inválida (-180 a 180): %', p_longitude USING ERRCODE = '22003';
  END IF;

  -- 2. Obtener ubicación base del taller/cocina
  SELECT value INTO v_kitchen_loc
  FROM public.zanita_store_settings
  WHERE key = 'kitchen_base_location';

  IF v_kitchen_loc IS NOT NULL THEN
    v_kitchen_lat := NULLIF((v_kitchen_loc->>'latitude'), '')::numeric;
    v_kitchen_lon := NULLIF((v_kitchen_loc->>'longitude'), '')::numeric;
  END IF;

  -- Si la cocina no tiene coordenadas configuradas, cotización manual obligatoria (sin error fatal)
  IF v_kitchen_lat IS NULL OR v_kitchen_lon IS NULL THEN
    RETURN jsonb_build_object(
      'requires_manual_quote', true,
      'calculated_fee_cents', null,
      'distance_km', null,
      'reason', 'kitchen_base_not_configured'
    );
  END IF;

  -- 3. Calcular distancia por Haversine
  v_distance_km := private.haversine_distance_km(v_kitchen_lat, v_kitchen_lon, p_latitude, p_longitude);

  -- 4. Buscar regla de tarificación aplicable
  SELECT id, min_distance_km, max_distance_km, fee_cents, requires_manual_quote, priority
  INTO v_rule
  FROM public.zanita_delivery_pricing_rules
  WHERE is_active = true
    AND v_distance_km >= min_distance_km
    AND (max_distance_km IS NULL OR v_distance_km < max_distance_km)
  ORDER BY priority DESC, min_distance_km DESC
  LIMIT 1;

  -- Si no hay regla o la regla exige cotización manual o tarifa es null
  IF NOT FOUND OR v_rule.requires_manual_quote = true OR v_rule.fee_cents IS NULL THEN
    RETURN jsonb_build_object(
      'requires_manual_quote', true,
      'calculated_fee_cents', null,
      'distance_km', v_distance_km,
      'reason', CASE WHEN NOT FOUND THEN 'no_matching_pricing_rule' ELSE 'rule_requires_manual_quote' END
    );
  END IF;

  -- 5. Evaluar recargos aplicables (surcharges) contra la fecha/hora SOLICITADA de entrega
  IF p_requested_date IS NOT NULL THEN
    v_dow := EXTRACT(ISODOW FROM p_requested_date)::integer;

    SELECT COALESCE(SUM(surcharge_cents), 0)
    INTO v_surcharges_sum
    FROM public.zanita_delivery_surcharges
    WHERE is_active = true
      AND delivery_mode IN ('home_delivery', 'all')
      AND (day_of_week IS NULL OR day_of_week = v_dow)
      AND (
        (start_time IS NULL AND end_time IS NULL) OR
        (p_requested_time IS NOT NULL AND 
         (start_time IS NULL OR p_requested_time >= start_time) AND 
         (end_time IS NULL OR p_requested_time < end_time))
      );
  END IF;

  v_final_fee_cents := v_rule.fee_cents + v_surcharges_sum;

  RETURN jsonb_build_object(
    'requires_manual_quote', false,
    'distance_km', v_distance_km,
    'calculated_fee_cents', v_final_fee_cents,
    'base_fee_cents', v_rule.fee_cents,
    'surcharges_cents', v_surcharges_sum
  );
END;
$$;

-- Permisos RPC de cotización
REVOKE ALL ON FUNCTION public.quote_home_delivery(numeric, numeric, date, time) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quote_home_delivery(numeric, numeric, date, time) TO authenticated;
