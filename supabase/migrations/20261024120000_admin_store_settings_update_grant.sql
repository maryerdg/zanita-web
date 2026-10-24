-- Migration: 20261024120000_admin_store_settings_update_grant.sql
-- Description: Grant column-level UPDATE on zanita_store_settings to authenticated,
-- and add hardened customer get_order_payment_instructions RPC.

-- 1. Explicit least-privilege lockdown on zanita_store_settings
REVOKE ALL ON public.zanita_store_settings FROM PUBLIC;
REVOKE ALL ON public.zanita_store_settings FROM anon;
REVOKE ALL ON public.zanita_store_settings FROM authenticated;

-- 2. Grant table SELECT to anon and authenticated
GRANT SELECT ON public.zanita_store_settings TO anon, authenticated;

-- 3. Grant column-level UPDATE strictly on (value, updated_at) to authenticated
-- This is strictly guarded by existing RLS policy zanita_store_settings_admin_all (private.is_admin())
GRANT UPDATE (value, updated_at)
ON public.zanita_store_settings
TO authenticated;

-- 4. Hardened RPC for customers to fetch payment instructions for their approved orders
-- Enforces:
-- - search_path = ''
-- - Fully schema-qualified objects
-- - auth.uid() IS NOT NULL
-- - Order exists, belongs to auth.uid(), and status = 'deposit_pending'
-- - Payment setting exists, is_public = false, enabled = true, and fields are valid
-- - Returns ONLY customer-facing fields (bank_name, account_holder, clabe, instructions)
CREATE OR REPLACE FUNCTION public.get_order_payment_instructions(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_order_status text;
  v_settings_val jsonb;
  v_enabled boolean;
  v_bank_name text;
  v_account_holder text;
  v_clabe text;
  v_instructions text;
BEGIN
  -- 1. Verify authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Verify order exists, belongs to user, and is in deposit_pending
  SELECT o.status
  INTO v_order_status
  FROM public.zanita_orders o
  WHERE o.id = p_order_id AND o.user_id = v_user_id;

  IF NOT FOUND OR v_order_status <> 'deposit_pending' THEN
    RETURN NULL;
  END IF;

  -- 3. Read private payment_bank_transfer setting (strictly is_public = false)
  SELECT s.value
  INTO v_settings_val
  FROM public.zanita_store_settings s
  WHERE s.key = 'payment_bank_transfer'
    AND s.is_public = false;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 4. Validate configuration fields
  v_enabled := COALESCE((v_settings_val->>'enabled')::boolean, false);
  IF NOT v_enabled THEN
    RETURN NULL;
  END IF;

  v_bank_name := NULLIF(trim(COALESCE(v_settings_val->>'bank_name', '')), '');
  v_account_holder := NULLIF(trim(COALESCE(v_settings_val->>'account_holder', '')), '');
  v_clabe := NULLIF(trim(COALESCE(v_settings_val->>'clabe', '')), '');
  v_instructions := COALESCE(v_settings_val->>'instructions', '');

  -- Require all mandatory fields and valid 18-digit CLABE
  IF v_bank_name IS NULL OR v_account_holder IS NULL OR v_clabe IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_clabe !~ '^\d{18}$' THEN
    RETURN NULL;
  END IF;

  -- 5. Return customer payload
  RETURN pg_catalog.jsonb_build_object(
    'bank_name', v_bank_name,
    'account_holder', v_account_holder,
    'clabe', v_clabe,
    'instructions', v_instructions
  );
END;
$$;

-- 5. Explicit RPC privilege lockdown
REVOKE ALL ON FUNCTION public.get_order_payment_instructions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_order_payment_instructions(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_order_payment_instructions(uuid) TO authenticated;
