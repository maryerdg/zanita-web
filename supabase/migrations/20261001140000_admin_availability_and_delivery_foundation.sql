-- =================================================================================
-- ZANITA WEB - PASS 8D.1.2: ADMIN-CONTROLLED AVAILABILITY & DELIVERY DATABASE FOUNDATION
--
-- 1. Reutiliza public.zanita_delivery_points para puntos físicos y CETYS.
-- 2. Agrega coordenadas (latitude, longitude) y public_reference a zanita_delivery_points.
-- 3. Crea public.zanita_availability_rules (horario recurrente con min_lead_minutes).
-- 4. Crea public.zanita_calendar_overrides (excepciones de fecha, feriados, stand_mode).
-- 5. Crea public.zanita_availability_blocks (bloqueo de ventanas horarias intradía).
-- 6. Extiende public.zanita_orders con campos de snapshot y audit trail para home delivery.
-- 7. Crea public.zanita_delivery_pricing_rules y public.zanita_delivery_surcharges.
-- 8. Configura RLS estrictamente PRIVADO:
--    - Admin: SELECT, INSERT, UPDATE, DELETE (via private.is_admin()).
--    - Customer / Anon: SIN acceso directo a tablas de reglas administrativas.
--    - En 8D.2, el browser consumirá únicamente RPCs seguras (SECURITY DEFINER).
-- 9. Inserta datos iniciales de paridad con reglas existentes confirmadas (fee 0, L-V cutoff, CETYS).
-- 10. Mantiene compatibilidad total con submit_order y pedidos históricos como ZAN-0001.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. EXTENDER ZANITA_DELIVERY_POINTS (SIN COORDENADAS INVENTADAS)
-- ---------------------------------------------------------------------------------
ALTER TABLE public.zanita_delivery_points
  ADD COLUMN IF NOT EXISTS latitude numeric(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS longitude numeric(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS public_reference text NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Trigger para updated_at en zanita_delivery_points si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_zanita_delivery_points_updated'
  ) THEN
    CREATE TRIGGER on_zanita_delivery_points_updated
      BEFORE UPDATE ON public.zanita_delivery_points
      FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
  END IF;
END $$;

-- ---------------------------------------------------------------------------------
-- 2. DISPONIBILIDAD RECURRENTE (ZANITA_AVAILABILITY_RULES)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.zanita_availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_mode text NOT NULL CHECK (delivery_mode IN ('official_point', 'home_delivery', 'cetys_pickup')),
  delivery_point_id uuid NULL REFERENCES public.zanita_delivery_points(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Lunes, 7=Domingo (ISO DOW)
  open_time time NOT NULL,
  close_time time NOT NULL,
  submission_cutoff_time time NULL,
  min_lead_minutes integer NOT NULL DEFAULT 1440 CHECK (min_lead_minutes >= 0), -- 24h = 1440 min
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_time_window CHECK (open_time < close_time)
);

CREATE INDEX IF NOT EXISTS idx_zanita_avail_mode_dow 
  ON public.zanita_availability_rules (delivery_mode, day_of_week) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_zanita_avail_point_dow 
  ON public.zanita_availability_rules (delivery_point_id, day_of_week) 
  WHERE is_active = true;

CREATE TRIGGER on_zanita_availability_rules_updated
  BEFORE UPDATE ON public.zanita_availability_rules
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ---------------------------------------------------------------------------------
-- 3. EXCEPCIONES DE CALENDARIO (ZANITA_CALENDAR_OVERRIDES)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.zanita_calendar_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  override_date date NOT NULL,
  delivery_mode text NOT NULL CHECK (delivery_mode IN ('official_point', 'home_delivery', 'cetys_pickup', 'all')),
  delivery_point_id uuid NULL REFERENCES public.zanita_delivery_points(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('open', 'closed', 'custom_schedule', 'stand_mode')),
  open_time time NULL,
  close_time time NULL,
  submission_cutoff_time time NULL,
  min_lead_minutes integer NULL CHECK (min_lead_minutes >= 0),
  reason text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_override_schedule CHECK (
    (status = 'closed') OR 
    (status IN ('open', 'custom_schedule', 'stand_mode') AND (open_time IS NULL OR close_time IS NULL OR open_time < close_time))
  )
);

CREATE INDEX IF NOT EXISTS idx_zanita_cal_overrides_date 
  ON public.zanita_calendar_overrides (override_date, delivery_mode) 
  WHERE is_active = true;

CREATE TRIGGER on_zanita_calendar_overrides_updated
  BEFORE UPDATE ON public.zanita_calendar_overrides
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ---------------------------------------------------------------------------------
-- 4. BLOQUEOS DE VENTANAS HORARIAS INTRADÍA (ZANITA_AVAILABILITY_BLOCKS)
-- ---------------------------------------------------------------------------------
-- Permite bloquear una o varias franjas de un mismo día (ej. 13:00-14:00 y 17:30-18:30)
-- sin alterar ni cerrar el horario global del día. Soporta múltiples bloques por fecha/modalidad.
CREATE TABLE IF NOT EXISTS public.zanita_availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_date date NOT NULL,
  delivery_mode text NOT NULL CHECK (delivery_mode IN ('official_point', 'home_delivery', 'cetys_pickup', 'all')),
  delivery_point_id uuid NULL REFERENCES public.zanita_delivery_points(id) ON DELETE CASCADE,
  start_time time NOT NULL,
  end_time time NOT NULL,
  reason text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_block_window CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_zanita_avail_blocks_date_mode 
  ON public.zanita_availability_blocks (block_date, delivery_mode) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_zanita_avail_blocks_point 
  ON public.zanita_availability_blocks (delivery_point_id, block_date) 
  WHERE is_active = true;

CREATE TRIGGER on_zanita_availability_blocks_updated
  BEFORE UPDATE ON public.zanita_availability_blocks
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ---------------------------------------------------------------------------------
-- 5. REGLAS DE PRECIO POR DISTANCIA PARA ENTREGA A DOMICILIO
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.zanita_delivery_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_distance_km numeric(6, 2) NOT NULL CHECK (min_distance_km >= 0),
  max_distance_km numeric(6, 2) NULL CHECK (max_distance_km IS NULL OR max_distance_km > min_distance_km),
  fee_cents integer NULL CHECK (fee_cents IS NULL OR fee_cents >= 0),
  requires_manual_quote boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zanita_pricing_rules_active 
  ON public.zanita_delivery_pricing_rules (priority DESC, min_distance_km ASC) 
  WHERE is_active = true;

CREATE TRIGGER on_zanita_delivery_pricing_rules_updated
  BEFORE UPDATE ON public.zanita_delivery_pricing_rules
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ---------------------------------------------------------------------------------
-- 6. SOBRECARGOS OPCIONALES DE ENTREGA (ZANITA_DELIVERY_SURCHARGES)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.zanita_delivery_surcharges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  delivery_mode text NOT NULL DEFAULT 'home_delivery' CHECK (delivery_mode IN ('home_delivery', 'all')),
  day_of_week integer NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time time NULL,
  end_time time NULL,
  surcharge_cents integer NOT NULL CHECK (surcharge_cents >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER on_zanita_delivery_surcharges_updated
  BEFORE UPDATE ON public.zanita_delivery_surcharges
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ---------------------------------------------------------------------------------
-- 7. EXTENDER ZANITA_ORDERS (SNAPSHOTS, AUDIT TRAIL, COMPATIBLE CON ZAN-0001)
-- ---------------------------------------------------------------------------------
ALTER TABLE public.zanita_orders
  ADD COLUMN IF NOT EXISTS delivery_mode_snapshot text NULL,
  ADD COLUMN IF NOT EXISTS delivery_latitude numeric(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS delivery_longitude numeric(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS delivery_distance_km numeric(6, 2) NULL,
  ADD COLUMN IF NOT EXISTS calculated_delivery_fee_cents integer NULL,
  ADD COLUMN IF NOT EXISTS final_delivery_fee_cents integer NULL,
  ADD COLUMN IF NOT EXISTS pricing_rule_id uuid NULL REFERENCES public.zanita_delivery_pricing_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_fee_override_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_fee_override_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS delivery_fee_override_reason text NULL;

-- ---------------------------------------------------------------------------------
-- 8. UBICACIÓN BASE DE PREPARACIÓN EN STORE SETTINGS
-- ---------------------------------------------------------------------------------
INSERT INTO public.zanita_store_settings (key, value, is_public)
VALUES (
  'kitchen_base_location',
  '{"latitude": null, "longitude": null, "label": "Taller Zanita Tijuana"}'::jsonb,
  false
)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------------
-- 9. POLÍTICAS DE SEGURIDAD (RLS) — REGLAS ADMINISTRATIVAS ESTRICTAMENTE PRIVADAS
-- ---------------------------------------------------------------------------------
ALTER TABLE public.zanita_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_calendar_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_delivery_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_delivery_surcharges ENABLE ROW LEVEL SECURITY;

-- zanita_availability_rules: Admin CRUD total. Cero SELECT a anon / customer.
CREATE POLICY zanita_avail_rules_admin_all ON public.zanita_availability_rules
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- zanita_calendar_overrides: Admin CRUD total. Cero SELECT a anon / customer.
CREATE POLICY zanita_cal_overrides_admin_all ON public.zanita_calendar_overrides
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- zanita_availability_blocks: Admin CRUD total. Cero SELECT a anon / customer.
CREATE POLICY zanita_avail_blocks_admin_all ON public.zanita_availability_blocks
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- zanita_delivery_pricing_rules: Admin CRUD total. Cero SELECT a anon / customer.
CREATE POLICY zanita_pricing_rules_admin_all ON public.zanita_delivery_pricing_rules
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- zanita_delivery_surcharges: Admin CRUD total. Cero SELECT a anon / customer.
CREATE POLICY zanita_surcharges_admin_all ON public.zanita_delivery_surcharges
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- Revocar permisos SELECT de anon y public en tablas administrativas
REVOKE ALL ON public.zanita_availability_rules FROM PUBLIC, anon;
REVOKE ALL ON public.zanita_calendar_overrides FROM PUBLIC, anon;
REVOKE ALL ON public.zanita_availability_blocks FROM PUBLIC, anon;
REVOKE ALL ON public.zanita_delivery_pricing_rules FROM PUBLIC, anon;
REVOKE ALL ON public.zanita_delivery_surcharges FROM PUBLIC, anon;

-- Otorgar ALL a authenticated (el acceso real queda restringido por RLS a private.is_admin())
GRANT ALL ON public.zanita_availability_rules TO authenticated;
GRANT ALL ON public.zanita_calendar_overrides TO authenticated;
GRANT ALL ON public.zanita_availability_blocks TO authenticated;
GRANT ALL ON public.zanita_delivery_pricing_rules TO authenticated;
GRANT ALL ON public.zanita_delivery_surcharges TO authenticated;

-- ---------------------------------------------------------------------------------
-- 10. DATOS INICIALES CONFIRMADOS (PARIDAD 100% CON REGLAS VIGENTES)
-- ---------------------------------------------------------------------------------
-- A. Puntos Oficiales Estándar y Entrega a Domicilio:
-- Lunes a Viernes (1..5): 10:00 - 19:00, Cutoff 14:00, Lead time 1440 min (24h)
-- Sábado y Domingo (6..7): 10:00 - 19:00, Sin cutoff (NULL), Lead time 1440 min (24h)
INSERT INTO public.zanita_availability_rules (
  delivery_mode, delivery_point_id, day_of_week, open_time, close_time, submission_cutoff_time, min_lead_minutes, is_active
) VALUES
  -- official_point (Lunes a Domingo)
  ('official_point', NULL, 1, '10:00', '19:00', '14:00', 1440, true),
  ('official_point', NULL, 2, '10:00', '19:00', '14:00', 1440, true),
  ('official_point', NULL, 3, '10:00', '19:00', '14:00', 1440, true),
  ('official_point', NULL, 4, '10:00', '19:00', '14:00', 1440, true),
  ('official_point', NULL, 5, '10:00', '19:00', '14:00', 1440, true),
  ('official_point', NULL, 6, '10:00', '19:00', NULL,    1440, true),
  ('official_point', NULL, 7, '10:00', '19:00', NULL,    1440, true),

  -- home_delivery (Lunes a Domingo)
  ('home_delivery', NULL, 1, '10:00', '19:00', '14:00', 1440, true),
  ('home_delivery', NULL, 2, '10:00', '19:00', '14:00', 1440, true),
  ('home_delivery', NULL, 3, '10:00', '19:00', '14:00', 1440, true),
  ('home_delivery', NULL, 4, '10:00', '19:00', '14:00', 1440, true),
  ('home_delivery', NULL, 5, '10:00', '19:00', '14:00', 1440, true),
  ('home_delivery', NULL, 6, '10:00', '19:00', NULL,    1440, true),
  ('home_delivery', NULL, 7, '10:00', '19:00', NULL,    1440, true),

  -- cetys_pickup (Lunes a Viernes 16:00 - 20:00, Lead time 1440 min, Sin cutoff de recepción 14:00)
  ('cetys_pickup', (SELECT id FROM public.zanita_delivery_points WHERE requires_special_pickup_permission = true LIMIT 1), 1, '16:00', '20:00', NULL, 1440, true),
  ('cetys_pickup', (SELECT id FROM public.zanita_delivery_points WHERE requires_special_pickup_permission = true LIMIT 1), 2, '16:00', '20:00', NULL, 1440, true),
  ('cetys_pickup', (SELECT id FROM public.zanita_delivery_points WHERE requires_special_pickup_permission = true LIMIT 1), 3, '16:00', '20:00', NULL, 1440, true),
  ('cetys_pickup', (SELECT id FROM public.zanita_delivery_points WHERE requires_special_pickup_permission = true LIMIT 1), 4, '16:00', '20:00', NULL, 1440, true),
  ('cetys_pickup', (SELECT id FROM public.zanita_delivery_points WHERE requires_special_pickup_permission = true LIMIT 1), 5, '16:00', '20:00', NULL, 1440, true)
ON CONFLICT DO NOTHING;
