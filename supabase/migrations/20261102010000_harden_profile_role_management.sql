-- Harden profile role changes and make Admin role management safe.
-- Customers may continue editing their own profile data, but can never promote
-- themselves to Admin. Admin role changes are guarded at the database layer.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE TO authenticated
USING (
  id = (SELECT auth.uid())
  AND role = 'customer'
)
WITH CHECK (
  id = (SELECT auth.uid())
  AND role = 'customer'
);

CREATE OR REPLACE FUNCTION private.guard_zanita_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_other_admins integer;
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar roles.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.id = (SELECT auth.uid())
     AND OLD.role = 'admin'
     AND NEW.role <> 'admin' THEN
    RAISE EXCEPTION 'No puedes quitar tu propio acceso de administrador.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.role = 'admin' AND NEW.role <> 'admin' THEN
    SELECT count(*)
    INTO v_other_admins
    FROM public.profiles
    WHERE role = 'admin'
      AND id <> OLD.id;

    IF v_other_admins < 1 THEN
      RAISE EXCEPTION 'Zanita debe conservar al menos un administrador.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.role = 'admin' THEN
    NEW.cetys_pickup_enabled := false;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_zanita_profile_role_change()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zanita_guard_profile_role_change
ON public.profiles;

CREATE TRIGGER zanita_guard_profile_role_change
BEFORE UPDATE OF role
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION private.guard_zanita_profile_role_change();
