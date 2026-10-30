REVOKE ALL ON public.zanita_store_settings FROM PUBLIC;
REVOKE ALL ON public.zanita_store_settings FROM anon;
REVOKE ALL ON public.zanita_store_settings FROM authenticated;

GRANT SELECT ON public.zanita_store_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.zanita_store_settings TO authenticated;

DROP POLICY IF EXISTS zanita_store_settings_admin_all
ON public.zanita_store_settings;

CREATE POLICY zanita_store_settings_admin_all
ON public.zanita_store_settings
FOR ALL TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS zanita_store_settings_public_read
ON public.zanita_store_settings;

CREATE POLICY zanita_store_settings_public_read
ON public.zanita_store_settings
FOR SELECT TO public
USING (is_public = true);
