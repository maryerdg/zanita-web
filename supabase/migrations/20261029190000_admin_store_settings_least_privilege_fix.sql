-- Migration: 20261029190000_admin_store_settings_least_privilege_fix.sql
-- Description: Grant column-level INSERT and UPDATE on public.zanita_store_settings to authenticated,
-- strictly bounded by admin-only RLS via private.is_admin().
-- Fixes permission denied on .upsert() operations for admin base location and operational settings.

-- 1. Explicit least-privilege lockdown on zanita_store_settings
REVOKE ALL ON public.zanita_store_settings FROM PUBLIC;
REVOKE ALL ON public.zanita_store_settings FROM anon;
REVOKE ALL ON public.zanita_store_settings FROM authenticated;

-- 2. Grant table SELECT to anon and authenticated
GRANT SELECT ON public.zanita_store_settings TO anon, authenticated;

-- 3. Grant column-level INSERT strictly on (key, value, is_public) to authenticated
-- Required by PostgREST for .upsert(...) operations (INSERT ... ON CONFLICT DO UPDATE)
GRANT INSERT (key, value, is_public)
ON public.zanita_store_settings
TO authenticated;

-- 4. Grant column-level UPDATE strictly on (value, is_public, updated_at) to authenticated
-- Covers the DO UPDATE clause of the upsert operation without exposing key mutation
GRANT UPDATE (value, is_public, updated_at)
ON public.zanita_store_settings
TO authenticated;

-- 5. Enforce strict Admin-only mutation RLS policy via private.is_admin()
DROP POLICY IF EXISTS zanita_store_settings_admin_all ON public.zanita_store_settings;
CREATE POLICY zanita_store_settings_admin_all ON public.zanita_store_settings
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 6. Preserve public read policy for public store settings
DROP POLICY IF EXISTS zanita_store_settings_public_read ON public.zanita_store_settings;
CREATE POLICY zanita_store_settings_public_read ON public.zanita_store_settings
  FOR SELECT TO public
  USING (is_public = true);
