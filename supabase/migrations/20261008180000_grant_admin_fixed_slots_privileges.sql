-- =================================================================================
-- MIGRATION: PASS 8D.5E — RESTRICT ADMIN FIXED SLOTS TO CRUD
-- =================================================================================
-- Description:
-- Explicit least-privilege configuration for public.zanita_availability_fixed_slots.
-- Revokes all default and inherited table-level privileges from PUBLIC, anon, and authenticated.
-- Grants strictly SELECT, INSERT, UPDATE, DELETE to authenticated (no TRUNCATE, TRIGGER, or REFERENCES).
-- Row Level Security (RLS) ensures only verified admins (private.is_admin()) can execute CRUD operations.
-- Customers and anonymous users have zero access.
-- =================================================================================

-- 1. Ensure PUBLIC, anon, and authenticated have zero residual privileges on the table
REVOKE ALL ON TABLE public.zanita_availability_fixed_slots FROM PUBLIC;
REVOKE ALL ON TABLE public.zanita_availability_fixed_slots FROM anon;
REVOKE ALL ON TABLE public.zanita_availability_fixed_slots FROM authenticated;

-- 2. Grant strictly CRUD privileges to authenticated role (access is guarded by RLS)
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
