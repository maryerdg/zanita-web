-- Catalog Operations Core — additive, backward-compatible schema for Zanita 2.0.
-- IMPORTANT: this migration is committed for review only. Do not apply to Production
-- until the Phase A1 release gate is approved.

-- ---------------------------------------------------------------------------
-- 1. Product / option operational states
-- ---------------------------------------------------------------------------

ALTER TABLE public.zanita_products
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS scheduled_reactivation_at timestamptz;

ALTER TABLE public.zanita_options
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS scheduled_reactivation_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'zanita_products_status_check'
  ) THEN
    ALTER TABLE public.zanita_products
      ADD CONSTRAINT zanita_products_status_check
      CHECK (status IN ('draft', 'published', 'sold_out', 'hidden', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'zanita_options_status_check'
  ) THEN
    ALTER TABLE public.zanita_options
      ADD CONSTRAINT zanita_options_status_check
      CHECK (status IN ('published', 'sold_out', 'hidden', 'archived'));
  END IF;
END
$$;

-- Existing active rows remain published. Existing inactive rows become hidden.
UPDATE public.zanita_products
SET
  status = CASE WHEN is_active THEN 'published' ELSE 'hidden' END,
  is_available = CASE WHEN is_active THEN true ELSE false END
WHERE status = 'published';

UPDATE public.zanita_options
SET
  status = CASE WHEN is_active THEN 'published' ELSE 'hidden' END,
  is_available = CASE WHEN is_active THEN true ELSE false END
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_zanita_products_status
  ON public.zanita_products(status);
CREATE INDEX IF NOT EXISTS idx_zanita_products_reactivation
  ON public.zanita_products(scheduled_reactivation_at)
  WHERE scheduled_reactivation_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_zanita_options_status
  ON public.zanita_options(status);
CREATE INDEX IF NOT EXISTS idx_zanita_options_reactivation
  ON public.zanita_options(scheduled_reactivation_at)
  WHERE scheduled_reactivation_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Data API grants + strict Admin RLS
-- Grants allow PostgREST to reach the table; RLS remains the authorization wall.
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zanita_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zanita_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zanita_option_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zanita_product_option_groups TO authenticated;

DROP POLICY IF EXISTS zanita_products_admin_all ON public.zanita_products;
CREATE POLICY zanita_products_admin_all
ON public.zanita_products
FOR ALL TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS zanita_options_admin_all ON public.zanita_options;
CREATE POLICY zanita_options_admin_all
ON public.zanita_options
FOR ALL TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS zanita_option_groups_admin_all ON public.zanita_option_groups;
CREATE POLICY zanita_option_groups_admin_all
ON public.zanita_option_groups
FOR ALL TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS zanita_product_option_groups_admin_all ON public.zanita_product_option_groups;
CREATE POLICY zanita_product_option_groups_admin_all
ON public.zanita_product_option_groups
FOR ALL TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Public product-image bucket
-- Writes remain Admin-only through storage.objects RLS.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalog',
  'catalog',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS zanita_catalog_admin_insert ON storage.objects;
CREATE POLICY zanita_catalog_admin_insert
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'catalog' AND private.is_admin());

DROP POLICY IF EXISTS zanita_catalog_admin_update ON storage.objects;
CREATE POLICY zanita_catalog_admin_update
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'catalog' AND private.is_admin())
WITH CHECK (bucket_id = 'catalog' AND private.is_admin());

DROP POLICY IF EXISTS zanita_catalog_admin_delete ON storage.objects;
CREATE POLICY zanita_catalog_admin_delete
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'catalog' AND private.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Authoritative order guard
-- submit_order is SECURITY DEFINER and historically validated is_active.
-- These triggers additionally reject products/options that are operationally sold out.
-- A scheduled reactivation becomes effective deterministically once its timestamp passes,
-- without requiring a fragile background cron.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.enforce_zanita_product_orderability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_product record;
  v_effectively_available boolean;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT is_active, is_available, status, scheduled_reactivation_at
  INTO v_product
  FROM public.zanita_products
  WHERE id = NEW.product_id;

  IF NOT FOUND OR v_product.is_active = false THEN
    RAISE EXCEPTION 'El producto ya no está disponible para pedidos.' USING ERRCODE = 'P0001';
  END IF;

  v_effectively_available :=
    (v_product.status = 'published' AND v_product.is_available = true)
    OR (
      v_product.status = 'sold_out'
      AND v_product.scheduled_reactivation_at IS NOT NULL
      AND v_product.scheduled_reactivation_at <= now()
    );

  IF NOT v_effectively_available THEN
    RAISE EXCEPTION 'El producto está agotado por el momento.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_zanita_product_orderability()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zanita_order_items_enforce_product_orderability
ON public.zanita_order_items;
CREATE TRIGGER zanita_order_items_enforce_product_orderability
BEFORE INSERT OR UPDATE OF product_id
ON public.zanita_order_items
FOR EACH ROW
EXECUTE FUNCTION private.enforce_zanita_product_orderability();

CREATE OR REPLACE FUNCTION private.enforce_zanita_option_orderability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_option record;
  v_effectively_available boolean;
BEGIN
  IF NEW.option_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT is_active, is_available, status, scheduled_reactivation_at
  INTO v_option
  FROM public.zanita_options
  WHERE id = NEW.option_id;

  IF NOT FOUND OR v_option.is_active = false THEN
    RAISE EXCEPTION 'Una opción seleccionada ya no está disponible.' USING ERRCODE = 'P0001';
  END IF;

  v_effectively_available :=
    (v_option.status = 'published' AND v_option.is_available = true)
    OR (
      v_option.status = 'sold_out'
      AND v_option.scheduled_reactivation_at IS NOT NULL
      AND v_option.scheduled_reactivation_at <= now()
    );

  IF NOT v_effectively_available THEN
    RAISE EXCEPTION 'Una opción seleccionada está agotada por el momento.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_zanita_option_orderability()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zanita_order_item_options_enforce_option_orderability
ON public.zanita_order_item_options;
CREATE TRIGGER zanita_order_item_options_enforce_option_orderability
BEFORE INSERT OR UPDATE OF option_id
ON public.zanita_order_item_options
FOR EACH ROW
EXECUTE FUNCTION private.enforce_zanita_option_orderability();
