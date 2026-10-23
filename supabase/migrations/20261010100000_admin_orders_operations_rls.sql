-- Migration: 20261010100000_admin_orders_operations_rls.sql
-- Description: Grant least-privilege UPDATE on zanita_orders to authenticated for admin operations

-- 1. Ensure least-privilege: Revoke all on zanita_orders from public roles
REVOKE ALL ON public.zanita_orders FROM PUBLIC;
REVOKE ALL ON public.zanita_orders FROM anon;
REVOKE ALL ON public.zanita_orders FROM authenticated;

-- 2. Grant strictly SELECT and UPDATE to authenticated role
GRANT SELECT, UPDATE ON public.zanita_orders TO authenticated;

-- 3. Explicit Admin UPDATE policy (only private.is_admin() can mutate orders)
DROP POLICY IF EXISTS zanita_orders_admin_update ON public.zanita_orders;
CREATE POLICY zanita_orders_admin_update ON public.zanita_orders
  FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());
