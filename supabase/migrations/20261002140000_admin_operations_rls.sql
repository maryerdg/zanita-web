-- Migration: 20261002140000_admin_operations_rls.sql
-- Description: Enable admin management on zanita_delivery_points and zanita_store_settings via private.is_admin()

-- 1. Ensure zanita_delivery_points allows admin full management (was previously restricted to SELECT)
DROP POLICY IF EXISTS zanita_delivery_points_admin_all ON public.zanita_delivery_points;
CREATE POLICY zanita_delivery_points_admin_all ON public.zanita_delivery_points
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 2. Ensure zanita_store_settings allows admin full management
DROP POLICY IF EXISTS zanita_store_settings_admin_all ON public.zanita_store_settings;
CREATE POLICY zanita_store_settings_admin_all ON public.zanita_store_settings
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());
