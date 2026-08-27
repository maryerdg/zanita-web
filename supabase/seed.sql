-- =================================================================================
-- ZANITA WEB - SEED LOCAL
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

-- 2. PUNTOS DE ENTREGA (Usando UUIDs válidos 'dddd')
INSERT INTO public.zanita_delivery_points (id, name, type, requires_cetys_role, requires_quote, sort_order) VALUES
('dddd0000-0000-0000-0000-000000000001', 'Alba Roja', 'standard', false, false, 1),
('dddd0000-0000-0000-0000-000000000002', 'Ermita', 'standard', false, false, 2),
('dddd0000-0000-0000-0000-000000000003', 'Las Palmas', 'standard', false, false, 3),
('dddd0000-0000-0000-0000-000000000004', 'Hipódromo', 'standard', false, false, 4),
('dddd0000-0000-0000-0000-000000000005', 'Las Ferias', 'standard', false, false, 5),
('dddd0000-0000-0000-0000-000000000006', 'Otro', 'other', false, true, 6),
('dddd0000-0000-0000-0000-000000000007', 'CETYS', 'cetys', true, false, 7)
ON CONFLICT (id) DO NOTHING;

-- 3. PRODUCTOS (Usando UUIDs válidos 'aaaa')
INSERT INTO public.zanita_products (id, slug, name, tagline, price_cents, category, category_label, color_accent, sort_order) VALUES
('aaaa0000-0000-0000-0000-000000000001', 'manzanita-verde', 'Manzanita Verde', 'Manzanita verde preparada', 5000, 'manzanas', 'Manzanas Preparadas', '#4F7942', 1),
('aaaa0000-0000-0000-0000-000000000002', 'manzanita-roja-gala', 'Manzanita Roja Gala', 'Manzanita roja gala preparada', 5000, 'manzanas', 'Manzanas Preparadas', '#87201D', 2),
('aaaa0000-0000-0000-0000-000000000003', 'combo-6-manzanitas-chamoy-jumbo', 'Combo 6 Manzanitas + Chamoy Jumbo', '6 manzanitas con 1 chamoy jumbo', 31000, 'combos', 'Combos & Paquetes', '#D46240', 3),
('aaaa0000-0000-0000-0000-000000000004', 'combo-12-manzanitas-chamoy-jumbo', 'Combo 12 Manzanitas + Chamoy Jumbo', '12 manzanitas con 1 chamoy jumbo', 60000, 'combos', 'Combos & Paquetes', '#87201D', 4),
('aaaa0000-0000-0000-0000-000000000005', 'charola-individual-2-toppings', 'Charola Individual (2 Toppings)', 'Charola individual con 2 toppings a elegir', 12000, 'charolas', 'Charolas Preparadas', '#8E4A56', 5),
('aaaa0000-0000-0000-0000-000000000006', 'charola-mediana-3-toppings', 'Charola Mediana (3 Toppings)', 'Charola mediana con 3 toppings a elegir', 20000, 'charolas', 'Charolas Preparadas', '#832709', 6),
('aaaa0000-0000-0000-0000-000000000007', 'charola-grande-4-toppings', 'Charola Grande (4 Toppings)', 'Charola grande con 4 toppings a elegir', 25000, 'charolas', 'Charolas Preparadas', '#D46240', 7),
('aaaa0000-0000-0000-0000-000000000008', 'charola-jumbo-6-toppings', 'Charola Jumbo (6 Toppings)', 'Charola jumbo con 6 toppings a elegir', 50000, 'charolas', 'Charolas Preparadas', '#87201D', 8),
('aaaa0000-0000-0000-0000-000000000009', 'mix-de-frutas', 'Mix de Frutas', 'Manzanita, 2 frutas extra de temporada y 4 toppings a elegir', 28000, 'snacks', 'Snacks & Mixes', '#4F7942', 9),
('aaaa0000-0000-0000-0000-000000000010', 'munxie-tacos-5-piezas', 'Munxie Tacos (5 piezas)', 'Presentación de 5 piezas', 15000, 'snacks', 'Snacks & Mixes', '#832709', 10),
('aaaa0000-0000-0000-0000-000000000011', 'munxie-tacos-13-piezas', 'Munxie Tacos (13 piezas)', 'Presentación de 13 piezas', 32000, 'snacks', 'Snacks & Mixes', '#87201D', 11),
('aaaa0000-0000-0000-0000-000000000012', 'uvas-forradas', 'Uvas Forradas', 'Uvas forradas', 8000, 'uvas', 'Uvas Preparadas', '#8E4A56', 12)
ON CONFLICT (id) DO NOTHING;

-- 4. GRUPOS DE OPCIONES (Usando UUIDs 'bbbb')
INSERT INTO public.zanita_option_groups (id, name, sort_order) VALUES
('bbbb0000-0000-0000-0000-000000000001', 'Toppings', 1),
('bbbb0000-0000-0000-0000-000000000002', 'Frutas de temporada', 2)
ON CONFLICT (id) DO NOTHING;

-- 5. OPCIONES (Usando UUIDs 'cccc')
INSERT INTO public.zanita_options (id, group_id, name, sort_order) VALUES
('cccc0000-0000-0000-0000-000000000001', 'bbbb0000-0000-0000-0000-000000000001', 'Xtremes', 1),
('cccc0000-0000-0000-0000-000000000002', 'bbbb0000-0000-0000-0000-000000000001', 'Skwinkles', 2),
('cccc0000-0000-0000-0000-000000000003', 'bbbb0000-0000-0000-0000-000000000001', 'Skwinkles rellenos', 3),
('cccc0000-0000-0000-0000-000000000004', 'bbbb0000-0000-0000-0000-000000000001', 'Pica fresas', 4),
('cccc0000-0000-0000-0000-000000000005', 'bbbb0000-0000-0000-0000-000000000001', 'Panditas', 5),
('cccc0000-0000-0000-0000-000000000006', 'bbbb0000-0000-0000-0000-000000000001', 'Gusanitos', 6),
('cccc0000-0000-0000-0000-000000000007', 'bbbb0000-0000-0000-0000-000000000001', 'Donitas de durazno', 7),
('cccc0000-0000-0000-0000-000000000008', 'bbbb0000-0000-0000-0000-000000000001', 'Donitas de sandía', 8),
('cccc0000-0000-0000-0000-000000000009', 'bbbb0000-0000-0000-0000-000000000001', 'Donitas de manzana', 9),
('cccc0000-0000-0000-0000-000000000010', 'bbbb0000-0000-0000-0000-000000000001', 'Chaca chaca', 10),
('cccc0000-0000-0000-0000-000000000011', 'bbbb0000-0000-0000-0000-000000000001', 'Cacahuates', 11),
('cccc0000-0000-0000-0000-000000000012', 'bbbb0000-0000-0000-0000-000000000001', 'Tamborcitos', 12),
('cccc0000-0000-0000-0000-000000000013', 'bbbb0000-0000-0000-0000-000000000001', 'Pepino', 13),
('cccc0000-0000-0000-0000-000000000014', 'bbbb0000-0000-0000-0000-000000000001', 'Uvas', 14)
ON CONFLICT (id) DO NOTHING;

-- 6. REGLAS DE GRUPOS POR PRODUCTO (Cantidades Requeridas)
INSERT INTO public.zanita_product_option_groups (product_id, option_group_id, min_selections, max_selections, is_required) VALUES
('aaaa0000-0000-0000-0000-000000000005', 'bbbb0000-0000-0000-0000-000000000001', 2, 2, true),
('aaaa0000-0000-0000-0000-000000000006', 'bbbb0000-0000-0000-0000-000000000001', 3, 3, true),
('aaaa0000-0000-0000-0000-000000000007', 'bbbb0000-0000-0000-0000-000000000001', 4, 4, true),
('aaaa0000-0000-0000-0000-000000000008', 'bbbb0000-0000-0000-0000-000000000001', 6, 6, true),
('aaaa0000-0000-0000-0000-000000000009', 'bbbb0000-0000-0000-0000-000000000002', 2, 2, true),
('aaaa0000-0000-0000-0000-000000000009', 'bbbb0000-0000-0000-0000-000000000001', 4, 4, true)
ON CONFLICT (product_id, option_group_id) DO NOTHING;

-- 7. DISPONIBILIDAD EXACTA DE CADA OPCIÓN POR CADA PRODUCTO
DO $$
DECLARE
  prod_id uuid;
  opt_id uuid;
BEGIN
  -- Iterar sobre todos los productos que tienen el grupo 'Toppings' asignado
  FOR prod_id IN
    SELECT product_id FROM public.zanita_product_option_groups WHERE option_group_id = 'bbbb0000-0000-0000-0000-000000000001'
  LOOP
    FOR opt_id IN SELECT id FROM public.zanita_options WHERE group_id = 'bbbb0000-0000-0000-0000-000000000001' LOOP
      INSERT INTO public.zanita_product_options (product_id, option_id, is_available)
      VALUES (prod_id, opt_id, true) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
