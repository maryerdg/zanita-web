-- =================================================================================
-- ZANITA WEB - INITIAL SCHEMA (Supabase Compartido)
-- =================================================================================

-- 1. ENUMS
CREATE TYPE public.zanita_app_role AS ENUM ('customer', 'cetys', 'admin');

CREATE TYPE public.zanita_order_status AS ENUM (
  'draft',
  'pending_deposit',
  'deposit_confirmed',
  'in_preparation',
  'ready',
  'delivered',
  'cancelled'
);

CREATE TYPE public.zanita_delivery_quote_status AS ENUM (
  'not_applicable',
  'pending_quote',
  'quoted',
  'confirmed'
);

CREATE TYPE public.zanita_delivery_type AS ENUM ('standard', 'cetys', 'other');

-- 2. SECUENCIAS
CREATE SEQUENCE public.zanita_order_number_seq START 1;

-- 3. TABLAS Y CONSTRAINTS

CREATE TABLE public.zanita_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  role public.zanita_app_role NOT NULL DEFAULT 'customer'::public.zanita_app_role,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.zanita_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  tagline text,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  category text NOT NULL,
  category_label text NOT NULL,
  color_accent text NOT NULL,
  photo_src text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.zanita_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.zanita_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.zanita_option_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE(group_id, name)
);

CREATE TABLE public.zanita_product_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.zanita_products(id) ON DELETE CASCADE,
  option_group_id uuid NOT NULL REFERENCES public.zanita_option_groups(id) ON DELETE CASCADE,
  min_selections integer NOT NULL DEFAULT 0 CHECK (min_selections >= 0),
  max_selections integer NOT NULL DEFAULT 0 CHECK (max_selections >= min_selections),
  is_required boolean NOT NULL DEFAULT false,
  UNIQUE(product_id, option_group_id)
);

CREATE TABLE public.zanita_product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.zanita_products(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.zanita_options(id) ON DELETE CASCADE,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE(product_id, option_id)
);

CREATE TABLE public.zanita_delivery_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.zanita_delivery_type NOT NULL,
  requires_cetys_role boolean NOT NULL DEFAULT false,
  requires_quote boolean NOT NULL DEFAULT false,
  schedule_note text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.zanita_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  status public.zanita_order_status NOT NULL DEFAULT 'pending_deposit'::public.zanita_order_status,
  products_subtotal_cents integer NOT NULL CHECK (products_subtotal_cents >= 0),
  delivery_quote_status public.zanita_delivery_quote_status NOT NULL DEFAULT 'not_applicable'::public.zanita_delivery_quote_status,
  delivery_point_id uuid NOT NULL REFERENCES public.zanita_delivery_points(id),
  requested_date date NOT NULL,
  requested_time time NOT NULL,
  notes text,
  deposit_required_pct smallint NOT NULL DEFAULT 50 CHECK (deposit_required_pct >= 0 AND deposit_required_pct <= 100),
  amount_paid_cents integer NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (amount_paid_cents <= products_subtotal_cents)
);

CREATE TABLE public.zanita_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.zanita_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.zanita_products(id) ON DELETE SET NULL,
  product_name_snapshot text NOT NULL,
  unit_price_snapshot_cents integer NOT NULL CHECK (unit_price_snapshot_cents >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0)
);

CREATE TABLE public.zanita_order_item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.zanita_order_items(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.zanita_options(id) ON DELETE SET NULL,
  option_name_snapshot text NOT NULL,
  group_name_snapshot text NOT NULL
);

CREATE TABLE public.zanita_store_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. ÍNDICES
CREATE INDEX idx_zanita_options_group_id ON public.zanita_options(group_id);
CREATE INDEX idx_zanita_product_options_product_id ON public.zanita_product_options(product_id);
CREATE INDEX idx_zanita_product_options_option_id ON public.zanita_product_options(option_id);
CREATE INDEX idx_zanita_orders_user_id ON public.zanita_orders(user_id);
CREATE INDEX idx_zanita_orders_status ON public.zanita_orders(status);
CREATE INDEX idx_zanita_orders_req_date ON public.zanita_orders(requested_date);
CREATE INDEX idx_zanita_orders_point_id ON public.zanita_orders(delivery_point_id);
CREATE INDEX idx_zanita_order_items_order_id ON public.zanita_order_items(order_id);

-- 5. HELPERS SEGUROS
CREATE OR REPLACE FUNCTION public.zanita_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.zanita_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.zanita_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.zanita_is_admin() FROM anon;
REVOKE ALL ON FUNCTION public.zanita_is_admin() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.zanita_is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.zanita_is_cetys_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.zanita_profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'cetys')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.zanita_is_cetys_or_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.zanita_is_cetys_or_admin() FROM anon;
REVOKE ALL ON FUNCTION public.zanita_is_cetys_or_admin() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.zanita_is_cetys_or_admin() TO authenticated;

-- 6. SEGURIDAD Y RLS
ALTER TABLE public.zanita_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_delivery_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zanita_store_settings ENABLE ROW LEVEL SECURITY;

-- 7. PRIVILEGIOS DATA API EXPLICITOS
-- Anon solo tiene permiso de leer (SELECT) en recursos publicos.
GRANT SELECT ON public.zanita_products TO anon, authenticated;
GRANT SELECT ON public.zanita_option_groups TO anon, authenticated;
GRANT SELECT ON public.zanita_options TO anon, authenticated;
GRANT SELECT ON public.zanita_product_option_groups TO anon, authenticated;
GRANT SELECT ON public.zanita_product_options TO anon, authenticated;
GRANT SELECT ON public.zanita_delivery_points TO anon, authenticated;
GRANT SELECT ON public.zanita_store_settings TO anon, authenticated;

-- Authenticated requiere SELECT en las tablas de negocio, e INSERT explícito a zanita_profiles.
GRANT SELECT ON public.zanita_profiles TO authenticated;
GRANT INSERT ON public.zanita_profiles TO authenticated;
GRANT SELECT ON public.zanita_orders TO authenticated;
GRANT SELECT ON public.zanita_order_items TO authenticated;
GRANT SELECT ON public.zanita_order_item_options TO authenticated;

-- (No se otorgan permisos DELETE/UPDATE, ni INSERT general a public/anon).
-- El update seguro de perfil o las escrituras de ordenes irán por Server Actions o Funciones limitadas.

-- 8. POLITICAS DE LECTURA / ESCRITURA
CREATE POLICY zanita_products_public_read ON public.zanita_products FOR SELECT TO public USING (is_active = true);
CREATE POLICY zanita_option_groups_public_read ON public.zanita_option_groups FOR SELECT TO public USING (is_active = true);
CREATE POLICY zanita_options_public_read ON public.zanita_options FOR SELECT TO public USING (is_active = true);
CREATE POLICY zanita_product_opt_groups_public_read ON public.zanita_product_option_groups FOR SELECT TO public USING (true);
CREATE POLICY zanita_product_options_public_read ON public.zanita_product_options FOR SELECT TO public USING (is_available = true);
CREATE POLICY zanita_store_settings_public_read ON public.zanita_store_settings FOR SELECT TO public USING (is_public = true);

-- Delivery Points
CREATE POLICY zanita_delivery_points_read_public ON public.zanita_delivery_points FOR SELECT TO public
USING (is_active = true AND requires_cetys_role = false);

CREATE POLICY zanita_delivery_points_read_cetys_admin ON public.zanita_delivery_points FOR SELECT TO authenticated
USING (public.zanita_is_cetys_or_admin() = true);

-- Perfiles
CREATE POLICY zanita_profiles_select_own ON public.zanita_profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY zanita_profiles_insert_own_customer ON public.zanita_profiles FOR INSERT TO authenticated WITH CHECK (
  id = auth.uid() AND role = 'customer'::public.zanita_app_role AND auth.uid() IS NOT NULL
);
CREATE POLICY zanita_profiles_admin_all ON public.zanita_profiles FOR ALL TO authenticated USING (public.zanita_is_admin() = true);

-- Pedidos (Lectura. ESCRITURA PENDIENTE).
CREATE POLICY zanita_orders_select_own ON public.zanita_orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY zanita_orders_admin_all ON public.zanita_orders FOR ALL TO authenticated USING (public.zanita_is_admin() = true);

CREATE POLICY zanita_order_items_select_own ON public.zanita_order_items FOR SELECT TO authenticated USING (
  order_id IN (SELECT id FROM public.zanita_orders WHERE user_id = auth.uid())
);
CREATE POLICY zanita_order_items_admin_all ON public.zanita_order_items FOR ALL TO authenticated USING (public.zanita_is_admin() = true);

CREATE POLICY zanita_order_item_options_select_own ON public.zanita_order_item_options FOR SELECT TO authenticated USING (
  order_item_id IN (
    SELECT oi.id FROM public.zanita_order_items oi
    JOIN public.zanita_orders o ON oi.order_id = o.id
    WHERE o.user_id = auth.uid()
  )
);
CREATE POLICY zanita_order_item_opt_admin_all ON public.zanita_order_item_options FOR ALL TO authenticated USING (public.zanita_is_admin() = true);

-- 9. TRIGGER FOLIO ZANITA
CREATE OR REPLACE FUNCTION public.zanita_generate_order_number()
RETURNS trigger AS $$
BEGIN
  NEW.order_number := 'ZAN-' || LPAD(nextval('public.zanita_order_number_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zanita_assign_order_number
  BEFORE INSERT ON public.zanita_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.zanita_generate_order_number();


-- Se otorgan permisos específicos de UPDATE para roles
GRANT UPDATE (role, updated_at) ON public.zanita_profiles TO authenticated;
