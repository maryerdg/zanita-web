-- =================================================================================
-- MIGRATION: PASS 8D.5D — GRANT ADMIN FIXED SLOTS PRIVILEGES
-- =================================================================================
-- Description:
-- Table-level grant for authenticated role on public.zanita_availability_fixed_slots.
-- Row Level Security (RLS) ensures only verified admins (private.is_admin()) can SELECT,
-- INSERT, UPDATE, or DELETE rows.
-- Public and anon roles have ALL privileges explicitly revoked.
-- =================================================================================

-- 1. Ensure public and anon have zero privileges on zanita_availability_fixed_slots
REVOKE ALL ON TABLE public.zanita_availability_fixed_slots FROM PUBLIC;
REVOKE ALL ON TABLE public.zanita_availability_fixed_slots FROM anon;

-- 2. Grant table-level CRUD to authenticated role (access is strictly guarded by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.zanita_availability_fixed_slots TO authenticated;

-- 3. Verify / Ensure RLS is enabled
ALTER TABLE public.zanita_availability_fixed_slots ENABLE ROW LEVEL SECURITY;

-- 4. Verify / Ensure admin policy is active
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
