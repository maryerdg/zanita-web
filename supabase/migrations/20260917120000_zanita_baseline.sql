-- 1. SCHEMAS Y EXTENSIONES
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- 2. SEQUENCES
CREATE SEQUENCE IF NOT EXISTS private.zanita_order_number_seq START WITH 1 INCREMENT BY 1;

-- 3. TABLAS BASE
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  cetys_pickup_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FUNCION Y TRIGGER DE UPDATED_AT
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

-- Productos (Alineado con data/products.ts)
CREATE TABLE public.zanita_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  tagline text,
  description text,
  base_price_cents integer NOT NULL CHECK (base_price_cents >= 0),
  category text NOT NULL,
  category_label text NOT NULL,
  customization_note text,
  featured boolean NOT NULL DEFAULT false,
  color_accent text,
  photo_src text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER on_zanita_products_updated
  BEFORE UPDATE ON public.zanita_products FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- Grupos de Opciones
CREATE TABLE public.zanita_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Opciones
CREATE TABLE public.zanita_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.zanita_option_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  additional_price_cents integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Relación Producto -> Grupos de Opciones (M:N)
CREATE TABLE public.zanita_product_option_groups (
  product_id uuid NOT NULL REFERENCES public.zanita_products(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.zanita_option_groups(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT false,
  min_selections integer NOT NULL DEFAULT 0 CHECK (min_selections >= 0),
  max_selections integer NOT NULL DEFAULT 1,
  display_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, group_id),
  CONSTRAINT check_selections CHECK (max_selections >= min_selections)
);

-- Relación Producto -> Opciones Disponibles
CREATE TABLE public.zanita_product_options (
  product_id uuid NOT NULL REFERENCES public.zanita_products(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.zanita_options(id) ON DELETE CASCADE,
  is_available boolean NOT NULL DEFAULT true,
  PRIMARY KEY (product_id, option_id)
);

-- Puntos de Entrega
CREATE TABLE public.zanita_delivery_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  instructions text,
  type text NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'special', 'other')),
  requires_quote boolean NOT NULL DEFAULT false,
  delivery_fee_cents integer CHECK (delivery_fee_cents >= 0),
  requires_special_pickup_permission boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Órdenes
CREATE TABLE public.zanita_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Snapshots del usuario para no perder historial
  customer_name_snapshot text NOT NULL,
  customer_phone_snapshot text NOT NULL,
  customer_email_snapshot text NOT NULL,

  -- Estados de la orden
  status text NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'deposit_pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', 'rejected')),

  -- Modelo financiero
  products_subtotal_cents integer NOT NULL CHECK (products_subtotal_cents >= 0),
  delivery_fee_cents integer CHECK (delivery_fee_cents >= 0),
  total_amount_cents integer NOT NULL CHECK (total_amount_cents >= 0),
  deposit_required_pct integer NOT NULL DEFAULT 50 CHECK (deposit_required_pct BETWEEN 0 AND 100),
  amount_paid_cents integer NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0 AND amount_paid_cents <= total_amount_cents),
  CONSTRAINT check_total_amount_sum CHECK (total_amount_cents = products_subtotal_cents + COALESCE(delivery_fee_cents, 0)),

  -- Snapshots de Entrega y Cotización
  requested_date date NOT NULL,
  requested_time time NOT NULL,
  delivery_point_id uuid REFERENCES public.zanita_delivery_points(id) ON DELETE SET NULL,
  delivery_name_snapshot text NOT NULL,
  delivery_type_snapshot text NOT NULL,
  delivery_address_snapshot text,
  delivery_requires_quote_snapshot boolean NOT NULL,
  delivery_quote_status text NOT NULL DEFAULT 'not_required' CHECK (delivery_quote_status IN ('not_required', 'pending', 'quoted', 'confirmed')),

  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER on_zanita_orders_updated
  BEFORE UPDATE ON public.zanita_orders FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- Ítems de la Orden
CREATE TABLE public.zanita_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.zanita_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.zanita_products(id) ON DELETE SET NULL,
  product_name_snapshot text NOT NULL,
  base_unit_price_snapshot_cents integer NOT NULL CHECK (base_unit_price_snapshot_cents >= 0),
  final_unit_price_snapshot_cents integer NOT NULL CHECK (final_unit_price_snapshot_cents >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  CONSTRAINT check_item_subtotal CHECK (subtotal_cents = final_unit_price_snapshot_cents * quantity)
);

-- Opciones seleccionadas por Ítem
CREATE TABLE public.zanita_order_item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.zanita_order_items(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.zanita_options(id) ON DELETE SET NULL,
  option_name_snapshot text NOT NULL,
  group_name_snapshot text NOT NULL,
  additional_price_snapshot_cents integer NOT NULL DEFAULT 0 CHECK (additional_price_snapshot_cents >= 0)
);

-- Configuración general de la tienda
CREATE TABLE public.zanita_store_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER on_zanita_store_settings_updated
  BEFORE UPDATE ON public.zanita_store_settings FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- 4. ÍNDICES
CREATE INDEX idx_zanita_options_group_id ON public.zanita_options(group_id);
CREATE INDEX idx_zanita_product_options_product_id ON public.zanita_product_options(product_id);
CREATE INDEX idx_zanita_product_options_option_id ON public.zanita_product_options(option_id);
CREATE INDEX idx_zanita_orders_user_id ON public.zanita_orders(user_id);
CREATE INDEX idx_zanita_orders_status ON public.zanita_orders(status);
CREATE INDEX idx_zanita_orders_req_date ON public.zanita_orders(requested_date);
CREATE INDEX idx_zanita_orders_point_id ON public.zanita_orders(delivery_point_id);
CREATE INDEX idx_zanita_order_items_order_id ON public.zanita_order_items(order_id);

-- 5. SEGURIDAD Y FUNCIONES PRIVILEGIADAS (SCHEMA PRIVATE)

-- is_admin helper
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- has_special_pickup_permission helper
CREATE OR REPLACE FUNCTION private.has_special_pickup_permission()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT cetys_pickup_enabled = true FROM public.profiles WHERE id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION private.has_special_pickup_permission() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_special_pickup_permission() TO authenticated;

-- handle_new_user trigger (Auth sync)
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, email, role, cetys_pickup_enabled)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        NEW.email,
        'customer',
        false
    );
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- sync_user_email trigger
CREATE OR REPLACE FUNCTION private.sync_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.profiles SET email = NEW.email, updated_at = now() WHERE id = NEW.id;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_user_email() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_email_updated
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    WHEN (OLD.email IS DISTINCT FROM NEW.email)
    EXECUTE FUNCTION private.sync_user_email();

-- protect_profile_privileges (movido a private)
CREATE OR REPLACE FUNCTION private.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    IF private.is_admin() THEN
        RETURN NEW;
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'No tienes permisos para modificar el rol.' USING ERRCODE = 'P0001';
    END IF;

    IF NEW.cetys_pickup_enabled IS DISTINCT FROM OLD.cetys_pickup_enabled THEN
        RAISE EXCEPTION 'No tienes permisos para modificar privilegios especiales.' USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.protect_profile_privileges() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_profile_update_protect_privileges
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION private.protect_profile_privileges();

-- zanita_generate_order_number (movido a private)
CREATE OR REPLACE FUNCTION private.zanita_generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.order_number := 'ZAN-' || LPAD(nextval('private.zanita_order_number_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.zanita_generate_order_number() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER zanita_assign_order_number
  BEFORE INSERT ON public.zanita_orders
  FOR EACH ROW
  EXECUTE FUNCTION private.zanita_generate_order_number();

-- 6. HABILITAR RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
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

-- 7. PRIVILEGIOS EXPLICITOS
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, role, cetys_pickup_enabled) ON public.profiles TO authenticated;

GRANT SELECT ON public.zanita_products TO anon, authenticated;
GRANT SELECT ON public.zanita_option_groups TO anon, authenticated;
GRANT SELECT ON public.zanita_options TO anon, authenticated;
GRANT SELECT ON public.zanita_product_option_groups TO anon, authenticated;
GRANT SELECT ON public.zanita_product_options TO anon, authenticated;
GRANT SELECT ON public.zanita_delivery_points TO anon, authenticated;
GRANT SELECT ON public.zanita_store_settings TO anon, authenticated;

GRANT SELECT ON public.zanita_orders TO authenticated;
GRANT SELECT ON public.zanita_order_items TO authenticated;
GRANT SELECT ON public.zanita_order_item_options TO authenticated;

-- 8. POLÍTICAS RLS

-- Perfiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (private.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- Catálogo
CREATE POLICY zanita_products_public_read ON public.zanita_products FOR SELECT TO public USING (is_active = true);
CREATE POLICY zanita_option_groups_public_read ON public.zanita_option_groups FOR SELECT TO public USING (is_active = true);
CREATE POLICY zanita_options_public_read ON public.zanita_options FOR SELECT TO public USING (is_active = true);
CREATE POLICY zanita_product_opt_groups_public_read ON public.zanita_product_option_groups FOR SELECT TO public USING (true);
CREATE POLICY zanita_product_options_public_read ON public.zanita_product_options FOR SELECT TO public USING (is_available = true);
CREATE POLICY zanita_store_settings_public_read ON public.zanita_store_settings FOR SELECT TO public USING (is_public = true);

-- Puntos de Entrega
CREATE POLICY zanita_delivery_points_read_public ON public.zanita_delivery_points FOR SELECT TO public
USING (is_active = true AND requires_special_pickup_permission = false);

CREATE POLICY zanita_delivery_points_read_special ON public.zanita_delivery_points FOR SELECT TO authenticated
USING (is_active = true AND requires_special_pickup_permission = true AND (private.has_special_pickup_permission() OR private.is_admin()));

CREATE POLICY zanita_delivery_points_admin_all ON public.zanita_delivery_points FOR SELECT TO authenticated USING (private.is_admin());

-- Pedidos (Lectura)
CREATE POLICY zanita_orders_select_own ON public.zanita_orders FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY zanita_orders_admin_all ON public.zanita_orders FOR SELECT TO authenticated USING (private.is_admin());

CREATE POLICY zanita_order_items_select_own ON public.zanita_order_items FOR SELECT TO authenticated USING (
  order_id IN (SELECT id FROM public.zanita_orders WHERE user_id = (SELECT auth.uid()))
);
CREATE POLICY zanita_order_items_admin_all ON public.zanita_order_items FOR SELECT TO authenticated USING (private.is_admin());

CREATE POLICY zanita_order_item_options_select_own ON public.zanita_order_item_options FOR SELECT TO authenticated USING (
  order_item_id IN (
    SELECT oi.id FROM public.zanita_order_items oi
    JOIN public.zanita_orders o ON oi.order_id = o.id
    WHERE o.user_id = (SELECT auth.uid())
  )
);
CREATE POLICY zanita_order_item_opt_admin_all ON public.zanita_order_item_options FOR SELECT TO authenticated USING (private.is_admin());
