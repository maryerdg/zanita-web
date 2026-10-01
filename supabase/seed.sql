-- =================================================================================
-- ZANITA WEB - SEED LOCAL (CATALOG & CUSTOMIZATION RULES)
-- Delivery points y store settings canónicos se cargan desde
-- scripts/seed_checkout_foundation.sql
-- =================================================================================

-- 1. PRODUCTOS Y REGLAS CONCEPTUALES
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
