-- ==============================================================================
-- Migration: 20261023100000_customer_payment_continuity.sql
-- Description: Customer payment reporting fields, admin audit fields,
--              configurable bank transfer settings key, and secure reporting RPC.
-- ==============================================================================

-- 1. Add payment reporting and admin verification audit fields to public.zanita_orders
ALTER TABLE public.zanita_orders
  ADD COLUMN IF NOT EXISTS payment_reported_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_reported_amount_cents INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by UUID DEFAULT NULL;

-- 2. Add bank transfer payment settings key to public.zanita_store_settings
-- Only inserts an unconfigured placeholder (enabled: false) if key does not exist.
-- NO dummy or sample financial information is shipped to Production.
INSERT INTO public.zanita_store_settings (key, value, is_public, updated_at)
VALUES (
  'payment_bank_transfer',
  jsonb_build_object(
    'enabled', false,
    'bank_name', '',
    'account_holder', '',
    'clabe', '',
    'instructions', ''
  ),
  false,
  now()
)
ON CONFLICT (key) DO NOTHING;

-- 3. Secure RPC to allow authenticated order owners to report payment
-- Enforces:
-- - Non-null auth.uid()
-- - Strict order ownership (auth.uid() = user_id)
-- - Strict status check (status = 'deposit_pending')
-- - Idempotent reporting (preserves original report timestamp, updates reference)
-- - Zero financial mutations (cannot touch amount_paid_cents or order status)
CREATE OR REPLACE FUNCTION public.report_order_payment(
  p_order_id UUID,
  p_reference TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_order RECORD;
  v_now TIMESTAMPTZ;
  v_sanitized_ref TEXT;
BEGIN
  -- 1. Authenticated user required
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Fetch order
  SELECT id, user_id, status, total_amount_cents, payment_reported_at
  INTO v_order
  FROM public.zanita_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Strict ownership check
  IF v_order.user_id <> v_user_id THEN
    RAISE EXCEPTION 'No tienes permiso para reportar pago de este pedido' USING ERRCODE = 'P0003';
  END IF;

  -- 4. Status must be deposit_pending
  IF v_order.status <> 'deposit_pending' THEN
    RAISE EXCEPTION 'El pedido no se encuentra en estado pendiente de pago' USING ERRCODE = 'P0004';
  END IF;

  v_now := now();

  -- 5. Sanitize reference: trim and limit to max 50 chars
  v_sanitized_ref := NULLIF(trim(p_reference), '');
  IF v_sanitized_ref IS NOT NULL AND length(v_sanitized_ref) > 50 THEN
    v_sanitized_ref := substring(v_sanitized_ref from 1 for 50);
  END IF;

  -- 6. Idempotent update: preserve first report timestamp, update reference
  UPDATE public.zanita_orders
  SET
    payment_reported_at = COALESCE(v_order.payment_reported_at, v_now),
    payment_reference = COALESCE(v_sanitized_ref, v_order.payment_reference),
    payment_reported_amount_cents = v_order.total_amount_cents,
    updated_at = v_now
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'payment_reported_at', COALESCE(v_order.payment_reported_at, v_now)
  );
END;
$$;

-- 4. Explicit privilege lockdown
REVOKE ALL ON FUNCTION public.report_order_payment(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_order_payment(UUID, TEXT) TO authenticated;
