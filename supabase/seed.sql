-- =================================================================================
-- ZANITA WEB - SEED LOCAL CONCEPTUAL
-- =================================================================================

-- 1. STORE SETTINGS
INSERT INTO public.zanita_store_settings (key, value, is_public) VALUES
('min_order_cents', '15000'::jsonb, true),
('min_anticipation_hours', '24'::jsonb, true),
('deposit_required_pct', '50'::jsonb, true),
('whatsapp_cutoff_time', '"20:00"'::jsonb, true),
('general_schedule', '{"monday":"08:00-15:00","tuesday":"08:00-15:00","wednesday":"08:00-15:00","thursday":"08:00-15:00","friday":"08:00-15:00","saturday":"08:00-17:30","sunday":"09:00-14:00"}'::jsonb, true),
('cetys_schedule', '{"monday":"16:00-20:00","tuesday":"16:00-20:00","wednesday":"16:00-20:00","thursday":"16:00-20:00","friday":"16:00-20:00"}'::jsonb, true)
ON CONFLICT (key) DO NOTHING;

-- 2. PUNTOS DE ENTREGA (Mocks Conceptuales)
INSERT INTO public.zanita_delivery_points (id, name, type, requires_quote, requires_special_pickup_permission, is_active, display_order) VALUES
('dddd0000-0000-0000-0000-000000000001', 'Punto Normal Activo', 'standard', false, false, true, 1),
('dddd0000-0000-0000-0000-000000000002', 'CETYS Especial Activo', 'special', false, true, true, 2),
('dddd0000-0000-0000-0000-000000000003', 'CETYS Especial Inactivo', 'special', false, true, false, 3),
('dddd0000-0000-0000-0000-000000000004', 'Envio Foraneo', 'other', true, false, true, 4)
ON CONFLICT (id) DO NOTHING;

-- 3. PRODUCTOS Y REGLAS CONCEPTUALES
INSERT INTO public.zanita_products (id, slug, name, tagline, description, base_price_cents, category, category_label, customization_note, featured, color_accent, photo_src, is_active, display_order) VALUES
('aaaa0000-0000-0000-0000-000000000001', 'manzanita-verde', 'Manzanita Verde', 'Clasica con chamoy', 'Deliciosa', 5000, 'manzanas', 'Manzanas Preparadas', 'Elige tus toppings', true, '#4F7942', '/assets/img/manzana.jpg', true, 1),
('aaaa0000-0000-0000-0000-000000000002', 'charola-mediana-3-toppings', 'Charola Mediana (3 Toppings)', '3 toppings a elegir', 'Charola ideal para compartir', 20000, 'charolas', 'Charolas Preparadas', 'Elige exactamente 3 toppings', true, '#832709', '/assets/img/charola.jpg', true, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.zanita_option_groups (id, name, description, is_active) VALUES
('bbbb0000-0000-0000-0000-000000000001', 'Toppings', 'Elige tus toppings favoritos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.zanita_options (id, group_id, name, additional_price_cents, is_active, display_order) VALUES
('cccc0000-0000-0000-0000-000000000001', 'bbbb0000-0000-0000-0000-000000000001', 'Skwinkles', 0, true, 1),
('cccc0000-0000-0000-0000-000000000002', 'bbbb0000-0000-0000-0000-000000000001', 'Panditas', 0, true, 2),
('cccc0000-0000-0000-0000-000000000003', 'bbbb0000-0000-0000-0000-000000000001', 'Uvas forradas', 3500, true, 3)
ON CONFLICT (id) DO NOTHING;

-- Configurar Charola para pedir exactamente 3 toppings
INSERT INTO public.zanita_product_option_groups (product_id, group_id, is_required, min_selections, max_selections) VALUES
('aaaa0000-0000-0000-0000-000000000002', 'bbbb0000-0000-0000-0000-000000000001', true, 3, 3)
ON CONFLICT DO NOTHING;

-- Configurar Manzanita para pedir hasta 1 topping (0 a 1)
INSERT INTO public.zanita_product_option_groups (product_id, group_id, is_required, min_selections, max_selections) VALUES
('aaaa0000-0000-0000-0000-000000000001', 'bbbb0000-0000-0000-0000-000000000001', false, 0, 1)
ON CONFLICT DO NOTHING;
