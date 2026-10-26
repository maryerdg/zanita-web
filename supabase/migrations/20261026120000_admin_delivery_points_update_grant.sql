-- Migration: 20261026120000_admin_delivery_points_update_grant.sql
-- Description: Grant column-level UPDATE on zanita_delivery_points strictly on
-- (public_reference, instructions, is_active, updated_at) to authenticated,
-- with dedicated FOR UPDATE RLS policy for Admin operations.

-- 1. Explicit least-privilege lockdown on zanita_delivery_points
REVOKE ALL ON public.zanita_delivery_points FROM PUBLIC;
REVOKE ALL ON public.zanita_delivery_points FROM anon;
REVOKE ALL ON public.zanita_delivery_points FROM authenticated;

-- 2. Grant table SELECT to anon and authenticated (RLS filters rows)
GRANT SELECT ON public.zanita_delivery_points TO anon, authenticated;

-- 3. Grant column-level UPDATE strictly on approved editable fields to authenticated
GRANT UPDATE (
  public_reference,
  instructions,
  is_active,
  updated_at
) ON public.zanita_delivery_points TO authenticated;

-- 4. Clean up broad policies and establish dedicated Admin UPDATE policy
DROP POLICY IF EXISTS zanita_delivery_points_admin_all ON public.zanita_delivery_points;
DROP POLICY IF EXISTS zanita_delivery_points_admin_update ON public.zanita_delivery_points;

CREATE POLICY zanita_delivery_points_admin_update
ON public.zanita_delivery_points
FOR UPDATE
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());
