-- Availability V2 batch schedule writer.
-- Adds an atomic, admin-only RPC for applying one weekly schedule to multiple days
-- and, for official delivery, multiple points in a single transaction.

CREATE OR REPLACE FUNCTION public.save_zanita_weekly_schedule_batch(
  p_delivery_mode text,
  p_delivery_point_ids uuid[] DEFAULT NULL,
  p_days integer[] DEFAULT NULL,
  p_schedule_type text DEFAULT 'interval',
  p_open_time time DEFAULT NULL,
  p_close_time time DEFAULT NULL,
  p_slot_interval_minutes integer DEFAULT NULL,
  p_min_lead_minutes integer DEFAULT 1440,
  p_submission_cutoff_time time DEFAULT NULL,
  p_fixed_slots time[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_day integer;
  v_point_id uuid;
  v_targets uuid[];
  v_rule_id uuid;
  v_saved integer := 0;
  v_slot time;
  v_slot_order integer;
  v_effective_open time;
  v_effective_close time;
  v_min_slot time;
  v_max_slot time;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'No autorizado.' USING ERRCODE = '42501';
  END IF;

  IF p_delivery_mode NOT IN ('official_point', 'home_delivery', 'cetys_pickup') THEN
    RAISE EXCEPTION 'Modalidad de entrega inválida.' USING ERRCODE = '22023';
  END IF;

  IF p_days IS NULL OR cardinality(p_days) = 0 THEN
    RAISE EXCEPTION 'Selecciona al menos un día.' USING ERRCODE = '22023';
  END IF;

  FOREACH v_day IN ARRAY p_days LOOP
    IF v_day < 1 OR v_day > 7 THEN
      RAISE EXCEPTION 'Día de semana inválido: %', v_day USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF p_schedule_type NOT IN ('interval', 'fixed_times') THEN
    RAISE EXCEPTION 'Tipo de horario inválido.' USING ERRCODE = '22023';
  END IF;

  IF p_min_lead_minutes IS NULL OR p_min_lead_minutes < 0 THEN
    RAISE EXCEPTION 'La anticipación mínima no puede ser negativa.' USING ERRCODE = '22023';
  END IF;

  IF p_schedule_type = 'interval' THEN
    IF p_open_time IS NULL OR p_close_time IS NULL OR p_open_time >= p_close_time THEN
      RAISE EXCEPTION 'Selecciona un horario válido de inicio y fin.' USING ERRCODE = '22023';
    END IF;

    IF p_slot_interval_minutes IS NULL OR p_slot_interval_minutes NOT IN (15, 30, 45, 60) THEN
      RAISE EXCEPTION 'El intervalo debe ser 15, 30, 45 o 60 minutos.' USING ERRCODE = '22023';
    END IF;

    v_effective_open := p_open_time;
    v_effective_close := p_close_time;
  ELSE
    IF p_fixed_slots IS NULL OR cardinality(p_fixed_slots) = 0 THEN
      RAISE EXCEPTION 'Agrega al menos una hora específica.' USING ERRCODE = '22023';
    END IF;

    SELECT min(slot_value), max(slot_value)
    INTO v_min_slot, v_max_slot
    FROM unnest(p_fixed_slots) AS slot_value;

    v_effective_open := v_min_slot;
    -- open_time/close_time are metadata for fixed schedules; checkout uses the fixed slots.
    -- Keep a valid non-zero window even for a single slot.
    v_effective_close := (v_max_slot + interval '59 seconds')::time;

    IF v_effective_open >= v_effective_close THEN
      RAISE EXCEPTION 'No se pudo construir una ventana válida para las horas específicas.' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_delivery_mode = 'official_point' THEN
    IF p_delivery_point_ids IS NULL OR cardinality(p_delivery_point_ids) = 0 THEN
      -- NULL target means the general rule for every official point.
      v_targets := ARRAY[NULL::uuid];
    ELSE
      v_targets := p_delivery_point_ids;
    END IF;
  ELSE
    v_targets := ARRAY[NULL::uuid];
  END IF;

  FOREACH v_point_id IN ARRAY v_targets LOOP
    IF p_delivery_mode = 'official_point' AND v_point_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.zanita_delivery_points
        WHERE id = v_point_id
          AND is_active = true
          AND requires_special_pickup_permission = false
          AND type <> 'other'
      ) THEN
        RAISE EXCEPTION 'Punto oficial inválido o inactivo: %', v_point_id USING ERRCODE = '22023';
      END IF;
    END IF;

    FOREACH v_day IN ARRAY p_days LOOP
      v_rule_id := NULL;

      SELECT id
      INTO v_rule_id
      FROM public.zanita_availability_rules
      WHERE delivery_mode = p_delivery_mode
        AND day_of_week = v_day
        AND is_active = true
        AND (
          (v_point_id IS NULL AND delivery_point_id IS NULL)
          OR delivery_point_id = v_point_id
        )
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1;

      IF v_rule_id IS NULL THEN
        INSERT INTO public.zanita_availability_rules (
          delivery_mode,
          delivery_point_id,
          day_of_week,
          schedule_type,
          open_time,
          close_time,
          slot_interval_minutes,
          min_lead_minutes,
          submission_cutoff_time,
          is_active
        )
        VALUES (
          p_delivery_mode,
          v_point_id,
          v_day,
          p_schedule_type,
          v_effective_open,
          v_effective_close,
          CASE WHEN p_schedule_type = 'interval' THEN p_slot_interval_minutes ELSE NULL END,
          p_min_lead_minutes,
          p_submission_cutoff_time,
          true
        )
        RETURNING id INTO v_rule_id;
      ELSE
        UPDATE public.zanita_availability_rules
        SET
          schedule_type = p_schedule_type,
          open_time = v_effective_open,
          close_time = v_effective_close,
          slot_interval_minutes = CASE WHEN p_schedule_type = 'interval' THEN p_slot_interval_minutes ELSE NULL END,
          min_lead_minutes = p_min_lead_minutes,
          submission_cutoff_time = p_submission_cutoff_time,
          is_active = true,
          updated_at = now()
        WHERE id = v_rule_id;
      END IF;

      -- Normalize any legacy duplicate active rules for the same scope.
      UPDATE public.zanita_availability_rules
      SET is_active = false, updated_at = now()
      WHERE id <> v_rule_id
        AND delivery_mode = p_delivery_mode
        AND day_of_week = v_day
        AND is_active = true
        AND (
          (v_point_id IS NULL AND delivery_point_id IS NULL)
          OR delivery_point_id = v_point_id
        );

      DELETE FROM public.zanita_availability_fixed_slots
      WHERE availability_rule_id = v_rule_id;

      IF p_schedule_type = 'fixed_times' THEN
        v_slot_order := 0;
        FOR v_slot IN
          SELECT DISTINCT slot_value
          FROM unnest(p_fixed_slots) AS slot_value
          ORDER BY slot_value
        LOOP
          v_slot_order := v_slot_order + 1;

          INSERT INTO public.zanita_availability_fixed_slots (
            availability_rule_id,
            slot_time,
            display_order,
            is_active
          )
          VALUES (
            v_rule_id,
            v_slot,
            v_slot_order,
            true
          );
        END LOOP;
      END IF;

      v_saved := v_saved + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'saved_rules', v_saved,
    'delivery_mode', p_delivery_mode,
    'days', to_jsonb(p_days),
    'specific_points', CASE
      WHEN p_delivery_mode = 'official_point' AND p_delivery_point_ids IS NOT NULL
        THEN to_jsonb(p_delivery_point_ids)
      ELSE '[]'::jsonb
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_zanita_weekly_schedule_batch(
  text, uuid[], integer[], text, time, time, integer, integer, time, time[]
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.save_zanita_weekly_schedule_batch(
  text, uuid[], integer[], text, time, time, integer, integer, time, time[]
) TO authenticated;

NOTIFY pgrst, 'reload schema';
