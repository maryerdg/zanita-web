-- =================================================================================
-- MIGRATION: PASS 8D.4 — FIXED SLOTS AND ROUTE-AWARE AVAILABILITY V1
-- =================================================================================

-- 1. ADD schedule_type TO zanita_availability_rules & zanita_calendar_overrides
ALTER TABLE public.zanita_availability_rules 
  ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'interval' 
  CHECK (schedule_type IN ('interval', 'fixed_times'));

ALTER TABLE public.zanita_calendar_overrides 
  ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'interval' 
  CHECK (schedule_type IN ('interval', 'fixed_times'));

-- 2. CREATE TABLE zanita_availability_fixed_slots
CREATE TABLE IF NOT EXISTS public.zanita_availability_fixed_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_rule_id uuid REFERENCES public.zanita_availability_rules(id) ON DELETE CASCADE,
  calendar_override_id uuid REFERENCES public.zanita_calendar_overrides(id) ON DELETE CASCADE,
  slot_time time without time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT check_owner_fixed_slot CHECK (
    (availability_rule_id IS NOT NULL AND calendar_override_id IS NULL) OR
    (availability_rule_id IS NULL AND calendar_override_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_zanita_fixed_slots_rule 
  ON public.zanita_availability_fixed_slots(availability_rule_id, slot_time) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_zanita_fixed_slots_override 
  ON public.zanita_availability_fixed_slots(calendar_override_id, slot_time) 
  WHERE is_active = true;

-- Enable RLS & Admin Policies
ALTER TABLE public.zanita_availability_fixed_slots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'zanita_availability_fixed_slots' AND policyname = 'zanita_fixed_slots_admin_all'
  ) THEN
    CREATE POLICY zanita_fixed_slots_admin_all ON public.zanita_availability_fixed_slots
      FOR ALL TO authenticated
      USING (private.is_admin())
      WITH CHECK (private.is_admin());
  END IF;
END $$;

-- 3. STORE SETTING: cross_zone_transition_buffer_minutes (default 30 min, public = true)
INSERT INTO public.zanita_store_settings (key, value, is_public, updated_at)
VALUES ('cross_zone_transition_buffer_minutes', '30'::jsonb, true, now())
ON CONFLICT (key) DO UPDATE
SET value = '30'::jsonb, is_public = true, updated_at = now();

-- 4. SEED CANONICAL CETYS FIXED SLOTS (Mon-Fri 15:40, 17:40, 19:40)
UPDATE public.zanita_availability_rules
SET schedule_type = 'fixed_times',
    slot_interval_minutes = NULL,
    open_time = '15:40:00',
    close_time = '19:40:00',
    min_lead_minutes = 1440,
    submission_cutoff_time = NULL,
    is_active = true,
    updated_at = now()
WHERE delivery_mode = 'cetys_pickup'
  AND day_of_week IN (1, 2, 3, 4, 5);

INSERT INTO public.zanita_availability_fixed_slots (availability_rule_id, slot_time, display_order)
SELECT r.id, s.slot_time, s.display_order
FROM public.zanita_availability_rules r
CROSS JOIN (
  VALUES 
    ('15:40:00'::time, 1),
    ('17:40:00'::time, 2),
    ('19:40:00'::time, 3)
) AS s(slot_time, display_order)
WHERE r.delivery_mode = 'cetys_pickup'
  AND r.day_of_week IN (1, 2, 3, 4, 5)
  AND NOT EXISTS (
    SELECT 1 FROM public.zanita_availability_fixed_slots existing
    WHERE existing.availability_rule_id = r.id AND existing.slot_time = s.slot_time
  );

-- 5. FUNCTION: public.get_checkout_availability
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
  v_timezone            text;
  v_buffer_minutes      integer;
  v_tz_now              timestamp without time zone;
  v_test_tz_now         text;
  v_today               date;
  v_start               date;
  v_num_days            integer;
  v_eval_date           date;
  v_eval_dow            integer;
  v_is_today            boolean;
  v_current_tz_time     time without time zone;
  v_dates_arr           jsonb := '[]'::jsonb;
  v_date_obj            jsonb;
  v_override            record;
  v_rule                record;
  v_has_config          boolean;
  v_eff_schedule_type   text;
  v_eff_open_time       time without time zone;
  v_eff_close_time      time without time zone;
  v_eff_cutoff_time     time without time zone;
  v_eff_min_lead        integer;
  v_eff_interval        integer;
  v_eff_rule_id         uuid;
  v_eff_override_id     uuid;
  v_status_code         text;
  v_min_lead_threshold  timestamp without time zone;
  v_candidate_time      time without time zone;
  v_available_slots     text[];
  v_is_blocked          boolean;
  v_slot_timestamp      timestamp without time zone;
  v_top_status          text;
  v_user_id             uuid;
  v_cetys_authorized    boolean;
  v_date_cutoff_reached boolean;
  v_conflict_exists     boolean;
  v_fixed_slot_rec      record;
BEGIN
  -- 1. Validar parámetros de entrada
  IF p_delivery_mode NOT IN ('official_point', 'home_delivery', 'cetys_pickup') THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Modalidad de entrega inválida. Debe ser official_point, home_delivery o cetys_pickup.'
    );
  END IF;

  IF p_delivery_mode = 'official_point' AND p_delivery_point_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Se requiere delivery_point_id para la modalidad official_point.'
    );
  END IF;

  -- 2. Resolver timezone de la tienda
  SELECT COALESCE(value#>>'{}', 'America/Tijuana') INTO v_timezone
  FROM public.zanita_store_settings
  WHERE key = 'timezone';

  IF v_timezone IS NULL OR trim(v_timezone) = '' THEN
    v_timezone := 'America/Tijuana';
  END IF;

  -- Resolver transition buffer de la tienda (predeterminado 30m si no está configurado)
  SELECT COALESCE((value#>>'{}')::integer, 30) INTO v_buffer_minutes
  FROM public.zanita_store_settings
  WHERE key = 'cross_zone_transition_buffer_minutes';

  IF v_buffer_minutes IS NULL OR v_buffer_minutes < 0 THEN
    v_buffer_minutes := 30;
  END IF;

  -- Tiempo actual en la zona horaria del negocio (soporte para tiempo simulado en testing local)
  v_test_tz_now := NULLIF(current_setting('zanita.test_current_time', true), '');
  IF v_test_tz_now IS NOT NULL THEN
    BEGIN
      v_tz_now := v_test_tz_now::timestamp without time zone;
    EXCEPTION WHEN OTHERS THEN
      v_tz_now := (now() AT TIME ZONE v_timezone)::timestamp without time zone;
    END;
  ELSE
    v_tz_now := (now() AT TIME ZONE v_timezone)::timestamp without time zone;
  END IF;

  v_today := v_tz_now::date;
  v_current_tz_time := v_tz_now::time;

  -- Validar punto de entrega si aplica
  IF p_delivery_mode = 'official_point' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.zanita_delivery_points
      WHERE id = p_delivery_point_id
        AND is_active = true
        AND requires_special_pickup_permission = false
    ) THEN
      RETURN jsonb_build_object(
        'status', 'error',
        'message', 'Punto de entrega oficial no encontrado o inactivo.'
      );
    END IF;
  ELSIF p_delivery_mode = 'cetys_pickup' THEN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN
      RETURN jsonb_build_object(
        'status', 'not_authorized',
        'message', 'Modalidad exclusiva para usuarios autorizados de CETYS Universidad.',
        'dates', '[]'::jsonb
      );
    END IF;

    SELECT COALESCE(cetys_pickup_enabled, false) INTO v_cetys_authorized
    FROM public.profiles
    WHERE id = v_user_id;

    IF NOT COALESCE(v_cetys_authorized, false) THEN
      RETURN jsonb_build_object(
        'status', 'not_authorized',
        'message', 'Modalidad exclusiva para usuarios autorizados de CETYS Universidad.',
        'dates', '[]'::jsonb
      );
    END IF;
  END IF;

  v_start    := COALESCE(p_start_date, v_today);
  v_num_days := GREATEST(COALESCE(p_days, 14), 1);

  -- Iterar cada fecha solicitada
  FOR i IN 0..(v_num_days - 1) LOOP
    v_eval_date := v_start + i;
    v_eval_dow  := EXTRACT(ISODOW FROM v_eval_date)::integer;
    v_is_today  := (v_eval_date = v_today);

    v_has_config          := false;
    v_eff_schedule_type   := 'interval';
    v_eff_open_time       := null;
    v_eff_close_time      := null;
    v_eff_cutoff_time     := null;
    v_eff_min_lead        := 1440;
    v_eff_interval        := null;
    v_eff_rule_id         := null;
    v_eff_override_id     := null;
    v_status_code         := 'not_available';
    v_available_slots     := ARRAY[]::text[];
    v_date_cutoff_reached := false;

    -- 1. Precedencia 1: Override en calendario
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
          'schedule_type', 'interval',
          'open_time', null,
          'close_time', null,
          'slot_interval_minutes', null,
          'available_slots', '[]'::jsonb
        );
        v_dates_arr := v_dates_arr || v_date_obj;
        CONTINUE;
      ELSE
        v_status_code       := v_override.status;
        v_eff_schedule_type := COALESCE(v_override.schedule_type, 'interval');
        v_eff_open_time     := v_override.open_time;
        v_eff_close_time    := v_override.close_time;
        v_eff_cutoff_time   := v_override.submission_cutoff_time;
        v_eff_min_lead      := COALESCE(v_override.min_lead_minutes, 1440);
        v_eff_interval      := v_override.slot_interval_minutes;
        v_eff_override_id   := v_override.id;
        v_has_config        := true;
      END IF;
    ELSE
      -- 2. Precedencia 2: Regla recurrente
      SELECT * INTO v_rule
      FROM public.zanita_availability_rules
      WHERE is_active = true
        AND delivery_mode = p_delivery_mode
        AND day_of_week = v_eval_dow
        AND (delivery_point_id = p_delivery_point_id OR delivery_point_id IS NULL)
      ORDER BY (delivery_point_id IS NOT NULL) DESC
      LIMIT 1;

      IF FOUND THEN
        v_status_code       := 'configured';
        v_eff_schedule_type := COALESCE(v_rule.schedule_type, 'interval');
        v_eff_open_time     := v_rule.open_time;
        v_eff_close_time    := v_rule.close_time;
        v_eff_cutoff_time   := v_rule.submission_cutoff_time;
        v_eff_min_lead      := COALESCE(v_rule.min_lead_minutes, 1440);
        v_eff_interval      := v_rule.slot_interval_minutes;
        v_eff_rule_id       := v_rule.id;
        v_has_config        := true;
      ELSE
        v_date_obj := jsonb_build_object(
          'date', to_char(v_eval_date, 'YYYY-MM-DD'),
          'day_of_week', v_eval_dow,
          'available', false,
          'status', 'not_available',
          'schedule_type', 'interval',
          'open_time', null,
          'close_time', null,
          'slot_interval_minutes', null,
          'available_slots', '[]'::jsonb
        );
        v_dates_arr := v_dates_arr || v_date_obj;
        CONTINUE;
      END IF;
    END IF;

    -- Validar cutoff de recepción para el mismo día (hoy)
    IF v_is_today AND v_eff_cutoff_time IS NOT NULL AND v_current_tz_time >= v_eff_cutoff_time THEN
      v_date_cutoff_reached := true;
      v_date_obj := jsonb_build_object(
        'date', to_char(v_eval_date, 'YYYY-MM-DD'),
        'day_of_week', v_eval_dow,
        'available', false,
        'status', 'cutoff_reached',
        'schedule_type', v_eff_schedule_type,
        'open_time', to_char(v_eff_open_time, 'HH24:MI:SS'),
        'close_time', to_char(v_eff_close_time, 'HH24:MI:SS'),
        'slot_interval_minutes', v_eff_interval,
        'available_slots', '[]'::jsonb
      );
      v_dates_arr := v_dates_arr || v_date_obj;
      CONTINUE;
    END IF;

    -- 3. Si la estrategia es fixed_times:
    IF v_eff_schedule_type = 'fixed_times' THEN
      v_min_lead_threshold := v_tz_now + (v_eff_min_lead || ' minutes')::interval;

      FOR v_fixed_slot_rec IN
        SELECT slot_time
        FROM public.zanita_availability_fixed_slots
        WHERE is_active = true
          AND (
            (v_eff_override_id IS NOT NULL AND calendar_override_id = v_eff_override_id) OR
            (v_eff_override_id IS NULL AND availability_rule_id = v_eff_rule_id)
          )
        ORDER BY display_order ASC, slot_time ASC
      LOOP
        v_candidate_time := v_fixed_slot_rec.slot_time;
        v_slot_timestamp := (v_eval_date || ' ' || to_char(v_candidate_time, 'HH24:MI:SS'))::timestamp without time zone;

        IF v_slot_timestamp >= v_min_lead_threshold THEN
          -- Bloques sustractivos
          SELECT EXISTS (
            SELECT 1 FROM public.zanita_availability_blocks
            WHERE is_active = true
              AND block_date = v_eval_date
              AND delivery_mode IN (p_delivery_mode, 'all')
              AND (delivery_point_id = p_delivery_point_id OR delivery_point_id IS NULL)
              AND v_candidate_time >= start_time
              AND v_candidate_time < end_time
          ) INTO v_is_blocked;

          IF NOT v_is_blocked THEN
            -- Conflicto de ruta V1 (si es official_point)
            -- Semántica canónica: diferencia < buffer -> conflicto (12:30 y 13:30 permitidos con orden a las 13:00 y buffer de 30m)
            IF p_delivery_mode = 'official_point' THEN
              SELECT EXISTS (
                SELECT 1 FROM public.zanita_orders o
                WHERE o.requested_date = v_eval_date
                  AND o.status IN ('pending_approval', 'deposit_pending', 'confirmed', 'preparing', 'ready')
                  AND o.delivery_point_id IS NOT NULL
                  AND o.delivery_point_id <> p_delivery_point_id
                  AND v_candidate_time > (o.requested_time - (v_buffer_minutes || ' minutes')::interval)::time
                  AND v_candidate_time < (o.requested_time + (v_buffer_minutes || ' minutes')::interval)::time
              ) INTO v_conflict_exists;
            ELSE
              v_conflict_exists := false;
            END IF;

            IF NOT v_conflict_exists THEN
              v_available_slots := v_available_slots || to_char(v_candidate_time, 'HH24:MI');
            END IF;
          END IF;
        END IF;
      END LOOP;

      v_date_obj := jsonb_build_object(
        'date', to_char(v_eval_date, 'YYYY-MM-DD'),
        'day_of_week', v_eval_dow,
        'available', (COALESCE(array_length(v_available_slots, 1), 0) > 0),
        'status', CASE WHEN COALESCE(array_length(v_available_slots, 1), 0) > 0 THEN 'available' ELSE 'no_slots_available' END,
        'schedule_type', 'fixed_times',
        'open_time', to_char(v_eff_open_time, 'HH24:MI:SS'),
        'close_time', to_char(v_eff_close_time, 'HH24:MI:SS'),
        'slot_interval_minutes', null,
        'available_slots', to_jsonb(v_available_slots)
      );

      v_dates_arr := v_dates_arr || v_date_obj;
      CONTINUE;
    END IF;

    -- 4. Si la estrategia es interval:
    IF v_eff_open_time IS NULL OR v_eff_close_time IS NULL OR v_eff_open_time >= v_eff_close_time THEN
      v_date_obj := jsonb_build_object(
        'date', to_char(v_eval_date, 'YYYY-MM-DD'),
        'day_of_week', v_eval_dow,
        'available', false,
        'status', 'configuration_required',
        'reason', 'invalid_time_window',
        'schedule_type', 'interval',
        'open_time', null,
        'close_time', null,
        'slot_interval_minutes', null,
        'available_slots', '[]'::jsonb
      );
      v_dates_arr := v_dates_arr || v_date_obj;
      CONTINUE;
    END IF;

    IF v_eff_interval IS NULL OR v_eff_interval <= 0 THEN
      v_date_obj := jsonb_build_object(
        'date', to_char(v_eval_date, 'YYYY-MM-DD'),
        'day_of_week', v_eval_dow,
        'available', false,
        'status', 'configuration_required',
        'reason', 'slot_interval_required',
        'schedule_type', 'interval',
        'open_time', to_char(v_eff_open_time, 'HH24:MI:SS'),
        'close_time', to_char(v_eff_close_time, 'HH24:MI:SS'),
        'slot_interval_minutes', null,
        'available_slots', '[]'::jsonb
      );
      v_dates_arr := v_dates_arr || v_date_obj;
      CONTINUE;
    END IF;

    v_min_lead_threshold := v_tz_now + (v_eff_min_lead || ' minutes')::interval;
    v_candidate_time := v_eff_open_time;

    WHILE v_candidate_time < v_eff_close_time LOOP
      v_slot_timestamp := (v_eval_date || ' ' || to_char(v_candidate_time, 'HH24:MI:SS'))::timestamp without time zone;

      IF v_slot_timestamp >= v_min_lead_threshold THEN
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
          IF p_delivery_mode = 'official_point' THEN
            SELECT EXISTS (
              SELECT 1 FROM public.zanita_orders o
              WHERE o.requested_date = v_eval_date
                AND o.status IN ('pending_approval', 'deposit_pending', 'confirmed', 'preparing', 'ready')
                AND o.delivery_point_id IS NOT NULL
                AND o.delivery_point_id <> p_delivery_point_id
                AND v_candidate_time > (o.requested_time - (v_buffer_minutes || ' minutes')::interval)::time
                AND v_candidate_time < (o.requested_time + (v_buffer_minutes || ' minutes')::interval)::time
            ) INTO v_conflict_exists;
          ELSE
            v_conflict_exists := false;
          END IF;

          IF NOT v_conflict_exists THEN
            v_available_slots := v_available_slots || to_char(v_candidate_time, 'HH24:MI');
          END IF;
        END IF;
      END IF;

      v_candidate_time := (v_candidate_time + (v_eff_interval || ' minutes')::interval)::time;
    END LOOP;

    v_date_obj := jsonb_build_object(
      'date', to_char(v_eval_date, 'YYYY-MM-DD'),
      'day_of_week', v_eval_dow,
      'available', (COALESCE(array_length(v_available_slots, 1), 0) > 0),
      'status', CASE WHEN COALESCE(array_length(v_available_slots, 1), 0) > 0 THEN 'available' ELSE 'no_slots_available' END,
      'schedule_type', 'interval',
      'open_time', to_char(v_eff_open_time, 'HH24:MI:SS'),
      'close_time', to_char(v_eff_close_time, 'HH24:MI:SS'),
      'slot_interval_minutes', v_eff_interval,
      'available_slots', to_jsonb(v_available_slots)
    );

    v_dates_arr := v_dates_arr || v_date_obj;
  END LOOP;

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
    'cross_zone_buffer_minutes', v_buffer_minutes,
    'delivery_mode', p_delivery_mode,
    'delivery_point_id', p_delivery_point_id,
    'dates', v_dates_arr
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_checkout_availability(text, uuid, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_checkout_availability(text, uuid, date, integer) TO authenticated;


-- Ensure zanita_assign_order_number trigger is active on public.zanita_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'zanita_assign_order_number'
      AND tgrelid = 'public.zanita_orders'::regclass
  ) THEN
    CREATE TRIGGER zanita_assign_order_number
      BEFORE INSERT ON public.zanita_orders
      FOR EACH ROW
      EXECUTE FUNCTION private.zanita_generate_order_number();
  END IF;
END $$;
