-- 1. Create Private Schema for internal security definer functions
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

-- 2. Create tables
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'cetys', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.cetys_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Unique constraint to prevent multiple pending requests per user
CREATE UNIQUE INDEX cetys_access_requests_pending_idx 
ON public.cetys_access_requests(user_id) 
WHERE status = 'pending';

-- 3. Security Definer helper for RLS (to avoid recursion and escalate safely)
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT role = 'admin' FROM public.profiles WHERE id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- 4. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cetys_access_requests ENABLE ROW LEVEL SECURITY;

-- 5. Profiles Policies
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (id = (SELECT auth.uid()) OR private.is_admin());

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (id = (SELECT auth.uid())) 
WITH CHECK (id = (SELECT auth.uid()));

-- 6. Access Requests Policies
CREATE POLICY "Users can view own requests" 
ON public.cetys_access_requests FOR SELECT 
TO authenticated 
USING (user_id = (SELECT auth.uid()) OR private.is_admin());

CREATE POLICY "Users can insert own requests" 
ON public.cetys_access_requests FOR INSERT 
TO authenticated 
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can update requests" 
ON public.cetys_access_requests FOR UPDATE 
TO authenticated 
USING (private.is_admin()) 
WITH CHECK (private.is_admin());

-- 7. GRANTS (Column level protection)
REVOKE UPDATE ON public.profiles FROM PUBLIC, authenticated, anon;
GRANT UPDATE (full_name, phone) ON public.profiles TO authenticated;

REVOKE UPDATE, INSERT ON public.cetys_access_requests FROM PUBLIC, authenticated, anon;
GRANT INSERT (user_id) ON public.cetys_access_requests TO authenticated;
GRANT UPDATE (status) ON public.cetys_access_requests TO authenticated;

-- 8. Triggers & Logic

-- A. Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION private.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.handle_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_profiles_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.handle_updated_at();

-- B. Handle new user signup (auto-create profile)
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        NEW.email,
        'customer'
    );
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- B2. Sync email changes
CREATE OR REPLACE FUNCTION private.handle_user_email_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.handle_user_email_update() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_updated
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_user_email_update();

-- C. Handle CETYS Access Request Approval/Rejection atomically
CREATE OR REPLACE FUNCTION private.handle_cetys_request_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
    IF OLD.status != 'pending' THEN
        RAISE EXCEPTION 'Cannot modify an already resolved request.';
    END IF;

    IF NEW.status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status transition.';
    END IF;

    NEW.reviewed_at = NOW();
    NEW.reviewed_by = (SELECT auth.uid());

    IF NEW.status = 'approved' THEN
        UPDATE public.profiles SET role = 'cetys' WHERE id = OLD.user_id;
    END IF;

    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.handle_cetys_request_update() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_cetys_request_updated
BEFORE UPDATE ON public.cetys_access_requests
FOR EACH ROW EXECUTE FUNCTION private.handle_cetys_request_update();

-- D. Enforce only customers can create CETYS requests
CREATE OR REPLACE FUNCTION private.enforce_customer_only_requests()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF (SELECT role FROM public.profiles WHERE id = NEW.user_id) != 'customer' THEN
        RAISE EXCEPTION 'Solo los usuarios con rol customer pueden solicitar acceso CETYS.';
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.enforce_customer_only_requests() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_cetys_request_insert
BEFORE INSERT ON public.cetys_access_requests
FOR EACH ROW EXECUTE FUNCTION private.enforce_customer_only_requests();
