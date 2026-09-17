-- 1. Add cetys_pickup_enabled column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cetys_pickup_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Migrate existing 'cetys' roles to customer + cetys_pickup_enabled
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
UPDATE public.profiles SET cetys_pickup_enabled = true, role = 'customer' WHERE role = 'cetys';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('customer', 'admin'));

-- 3. Drop cetys_access_requests table (unused, assigned manually now)
DROP TABLE IF EXISTS public.cetys_access_requests CASCADE;

-- 4. Drop old trigger functions related to cetys_access_requests
DROP FUNCTION IF EXISTS public.handle_cetys_request_update CASCADE;
DROP FUNCTION IF EXISTS public.enforce_customer_only_requests CASCADE;

-- 5. Secure profiles from self-escalation
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    -- If the user is an admin, they can change anything.
    IF current_user IN ('postgres', 'service_role', 'supabase_admin') OR private.is_admin() THEN
        RETURN NEW;
    END IF;

    -- If a non-admin tries to change their role, block it
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'No tienes permisos para modificar el rol.' USING ERRCODE = 'P0001';
    END IF;

    -- If a non-admin tries to change their cetys_pickup_enabled, block it
    IF NEW.cetys_pickup_enabled IS DISTINCT FROM OLD.cetys_pickup_enabled THEN
        RAISE EXCEPTION 'No tienes permisos para modificar privilegios especiales.' USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_update_protect_privileges ON public.profiles;
CREATE TRIGGER on_profile_update_protect_privileges
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_privileges();

-- 6. Grant UPDATE on protected columns so the Trigger can handle the restriction gracefully
GRANT UPDATE (role, cetys_pickup_enabled) ON public.profiles TO authenticated;

-- 7. RLS Policy to allow admins to update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

-- 8. Explicitly revoke INSERT and DELETE on profiles (handled via auth.users triggers and admin dashboard backend)
REVOKE INSERT, DELETE ON public.profiles FROM PUBLIC, anon, authenticated;
