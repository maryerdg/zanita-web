-- Archivo idempotente para poblar el catálogo de Zanita
-- NO EJECUTAR HASTA REVISIÓN.

-- 1. UPSERT GRUPOS DE OPCIONES
INSERT INTO public.zanita_option_groups (id, name, description, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Toppings', 'Elige los toppings para tu producto', true),
  ('22222222-2222-2222-2222-222222222222', 'Frutas de Temporada', 'Frutas extra incluidas', true),
  ('33333333-3333-3333-3333-333333333333', 'Composición de Manzanitas', 'Elige cuántas manzanitas verdes y rojas llevará tu combo.', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- 2. UPSERT OPCIONES

-- A. Toppings (Por ahora seed administra disponibilidad: is_active = true.
--              NOTA FUTURA: Si en el futuro Mena/admin también controla disponibilidad
--              de toppings desde Admin, is_active deberá pasar a ser admin-managed
--              removiéndolo de ON CONFLICT, igual que Frutas de Temporada).
INSERT INTO public.zanita_options (id, group_id, name, additional_price_cents, always_charge, is_active, display_order)
VALUES
  ('aaaa0001-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Xtremes', 1500, false, true, 1),
  ('aaaa0002-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Skwinkles', 1500, false, true, 2),
  ('aaaa0003-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Skwinkles rellenos', 1500, false, true, 3),
  ('aaaa0004-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Pica fresas', 1500, false, true, 4),
  ('aaaa0005-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Panditas', 1500, false, true, 5),
  ('aaaa0006-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Gusanitos', 1500, false, true, 6),
  ('aaaa0007-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Donitas de durazno', 1500, false, true, 7),
  ('aaaa0008-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Donitas de sandía', 1500, false, true, 8),
  ('aaaa0009-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Donitas de manzana', 1500, false, true, 9),
  ('aaaa0010-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Chaca chaca', 1500, false, true, 10),
  ('aaaa0011-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Cacahuates', 1500, false, true, 11),
  ('aaaa0012-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Tamborcitos', 1500, false, true, 12),
  ('aaaa0013-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Pepino', 1500, false, true, 13),
  ('aaaa0014-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Uvas Forradas', 3500, true, true, 14)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, additional_price_cents = EXCLUDED.additional_price_cents, always_charge = EXCLUDED.always_charge, is_active = EXCLUDED.is_active, display_order = EXCLUDED.display_order;

-- B. Frutas de Temporada (Admin-managed: Mena activa/desactiva desde panel)
--    Primer insert: se crean OFF (is_active = false).
--    ON CONFLICT: actualiza únicamente campos estructurales (name, additional_price_cents, always_charge, display_order).
--    NO actualiza is_active para preservar el estado ON/OFF que Mena haya configurado.
INSERT INTO public.zanita_options (id, group_id, name, additional_price_cents, always_charge, is_active, display_order)
VALUES
  ('bbbb0001-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Sandía', 0, false, false, 1),
  ('bbbb0002-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Uvas', 0, false, false, 2),
  ('bbbb0003-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Fresas', 0, false, false, 3),
  ('bbbb0004-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Mango', 0, false, false, 4),
  ('bbbb0005-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Piña', 0, false, false, 5),
  ('bbbb0006-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Cherries', 0, false, false, 6)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, additional_price_cents = EXCLUDED.additional_price_cents, always_charge = EXCLUDED.always_charge, display_order = EXCLUDED.display_order;

-- C. Composición de Manzanitas (Estructura permanente del Combo: siempre activas is_active = true)
INSERT INTO public.zanita_options (id, group_id, name, additional_price_cents, always_charge, is_active, display_order)
VALUES
  ('cccc0001-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'Manzanita Verde', 0, false, true, 1),
  ('cccc0002-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'Manzanita Roja Gala', 0, false, true, 2)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, additional_price_cents = EXCLUDED.additional_price_cents, always_charge = EXCLUDED.always_charge, is_active = EXCLUDED.is_active, display_order = EXCLUDED.display_order;

-- 3. UPSERT PRODUCTOS BASE
INSERT INTO public.zanita_products (slug, name, tagline, description, base_price_cents, category, category_label, customization_note, featured, color_accent, photo_src, display_order, is_active)
VALUES
  ('manzanita-verde', 'Manzanita Verde', 'Manzanita verde preparada', 'Manzanita verde preparada.', 5000, 'manzanas', 'Manzanas Preparadas', 'Opciones por confirmar', true, '#4F7942', '/products/manzanita-verde.webp', 1, true),
  ('manzanita-roja-gala', 'Manzanita Roja Gala', 'Manzanita roja gala preparada', 'Manzanita roja gala preparada.', 5000, 'manzanas', 'Manzanas Preparadas', 'Opciones por confirmar', true, '#87201D', '/products/manzanita-roja-gala.webp', 2, true),
  ('combo-6-manzanitas-chamoy-jumbo', 'Combo 6 Manzanitas + Chamoy Jumbo', '6 manzanitas con 1 chamoy jumbo', '6 manzanitas con 1 chamoy jumbo.', 31000, 'combos', 'Combos & Paquetes', 'Opciones por confirmar', true, '#D46240', NULL, 3, true),
  ('combo-12-manzanitas-chamoy-jumbo', 'Combo 12 Manzanitas + Chamoy Jumbo', '12 manzanitas con 1 chamoy jumbo', '12 manzanitas con 1 chamoy jumbo.', 60000, 'combos', 'Combos & Paquetes', 'Opciones por confirmar', true, '#87201D', NULL, 4, true),
  ('charola-individual-2-toppings', 'Charola Individual (2 Toppings)', 'Charola individual con 2 toppings a elegir', 'Charola individual con 2 toppings a elegir.', 12000, 'charolas', 'Charolas Preparadas', '2 toppings incluidos', false, '#D46240', NULL, 5, true),
  ('charola-mediana-3-toppings', 'Charola Mediana (3 Toppings)', 'Charola mediana con 3 toppings a elegir', 'Charola mediana con 3 toppings a elegir.', 20000, 'charolas', 'Charolas Preparadas', '3 toppings incluidos', true, '#832709', '/products/charola-mediana-3-toppings.webp', 6, true),
  ('charola-grande-4-toppings', 'Charola Grande (4 Toppings)', 'Charola grande con 4 toppings a elegir', 'Charola grande con 4 toppings a elegir.', 25000, 'charolas', 'Charolas Preparadas', '4 toppings incluidos', false, '#D46240', '/products/charola-grande-4-toppings.webp', 7, true),
  ('charola-jumbo-6-toppings', 'Charola Jumbo (6 Toppings)', 'Charola jumbo con 6 toppings a elegir', 'Charola jumbo con 6 toppings a elegir.', 50000, 'charolas', 'Charolas Preparadas', '6 toppings incluidos', true, '#87201D', '/products/charola-jumbo-6-toppings.webp', 8, true),
  ('mix-de-frutas', 'Mix de Frutas', 'Manzanita, 2 frutas extra de temporada y 4 toppings a elegir', 'Manzanita, 2 frutas extra de temporada y 4 toppings a elegir.', 28000, 'snacks', 'Snacks & Mixes', '4 toppings incluidos', false, '#4F7942', '/products/mix-de-frutas.webp', 9, true),
  ('munxie-tacos-5-piezas', 'Munxie Tacos (5 piezas)', 'Presentación de 5 piezas', 'Presentación de 5 piezas. Jícama y pepino, skwinkles, chaca chaca, cacahuates.', 15000, 'snacks', 'Snacks & Mixes', 'Se vende preparado', false, '#832709', '/products/munxie-tacos-5-piezas.webp', 10, true),
  ('munxie-tacos-13-piezas', 'Munxie Tacos (13 piezas)', 'Presentación de 13 piezas', 'Presentación de 13 piezas. Jícama y pepino, skwinkles, chaca chaca, cacahuates.', 32000, 'snacks', 'Snacks & Mixes', 'Se vende preparado', true, '#87201D', '/products/munxie-tacos-13-piezas.webp', 11, true),
  ('uvas-forradas', 'Uvas Forradas', 'Uvas forradas', 'Uvas forradas.', 9000, 'uvas', 'Uvas Preparadas', 'Se vende preparado', true, '#8E4A56', '/products/uvas-forradas.webp', 12, true)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, tagline = EXCLUDED.tagline, description = EXCLUDED.description, base_price_cents = EXCLUDED.base_price_cents, category = EXCLUDED.category, category_label = EXCLUDED.category_label, customization_note = EXCLUDED.customization_note, featured = EXCLUDED.featured, color_accent = EXCLUDED.color_accent, photo_src = EXCLUDED.photo_src, display_order = EXCLUDED.display_order, is_active = EXCLUDED.is_active;

-- 4. MAPEOS: PRODUCTO -> GRUPOS DE OPCIONES
-- NOTA: Insertamos basándonos en el ID de producto devuelto (como es idempotente, mejor borramos y recreamos las relaciones por ser seed seguro)
DO $$
DECLARE
  prod_id uuid;
BEGIN
  -- Charola Individual
  SELECT id INTO prod_id FROM public.zanita_products WHERE slug = 'charola-individual-2-toppings';
  IF FOUND THEN
    INSERT INTO public.zanita_product_option_groups (product_id, group_id, is_required, min_selections, max_selections, included_selections, allow_repeats, display_order)
    VALUES (prod_id, '11111111-1111-1111-1111-111111111111', true, 2, NULL, 2, true, 1)
    ON CONFLICT (product_id, group_id) DO UPDATE SET is_required = EXCLUDED.is_required, min_selections = EXCLUDED.min_selections, max_selections = EXCLUDED.max_selections, included_selections = EXCLUDED.included_selections, allow_repeats = EXCLUDED.allow_repeats, display_order = EXCLUDED.display_order;
  END IF;

  -- Charola Mediana
  SELECT id INTO prod_id FROM public.zanita_products WHERE slug = 'charola-mediana-3-toppings';
  IF FOUND THEN
    INSERT INTO public.zanita_product_option_groups (product_id, group_id, is_required, min_selections, max_selections, included_selections, allow_repeats, display_order)
    VALUES (prod_id, '11111111-1111-1111-1111-111111111111', true, 3, NULL, 3, true, 1)
    ON CONFLICT (product_id, group_id) DO UPDATE SET is_required = EXCLUDED.is_required, min_selections = EXCLUDED.min_selections, max_selections = EXCLUDED.max_selections, included_selections = EXCLUDED.included_selections, allow_repeats = EXCLUDED.allow_repeats, display_order = EXCLUDED.display_order;
  END IF;

  -- Charola Grande
  SELECT id INTO prod_id FROM public.zanita_products WHERE slug = 'charola-grande-4-toppings';
  IF FOUND THEN
    INSERT INTO public.zanita_product_option_groups (product_id, group_id, is_required, min_selections, max_selections, included_selections, allow_repeats, display_order)
    VALUES (prod_id, '11111111-1111-1111-1111-111111111111', true, 4, NULL, 4, true, 1)
    ON CONFLICT (product_id, group_id) DO UPDATE SET is_required = EXCLUDED.is_required, min_selections = EXCLUDED.min_selections, max_selections = EXCLUDED.max_selections, included_selections = EXCLUDED.included_selections, allow_repeats = EXCLUDED.allow_repeats, display_order = EXCLUDED.display_order;
  END IF;

  -- Charola Jumbo
  SELECT id INTO prod_id FROM public.zanita_products WHERE slug = 'charola-jumbo-6-toppings';
  IF FOUND THEN
    INSERT INTO public.zanita_product_option_groups (product_id, group_id, is_required, min_selections, max_selections, included_selections, allow_repeats, display_order)
    VALUES (prod_id, '11111111-1111-1111-1111-111111111111', true, 6, NULL, 6, true, 1)
    ON CONFLICT (product_id, group_id) DO UPDATE SET is_required = EXCLUDED.is_required, min_selections = EXCLUDED.min_selections, max_selections = EXCLUDED.max_selections, included_selections = EXCLUDED.included_selections, allow_repeats = EXCLUDED.allow_repeats, display_order = EXCLUDED.display_order;
  END IF;

  -- Mix de Frutas (Tiene Toppings Y Frutas de Temporada)
  SELECT id INTO prod_id FROM public.zanita_products WHERE slug = 'mix-de-frutas';
  IF FOUND THEN
    INSERT INTO public.zanita_product_option_groups (product_id, group_id, is_required, min_selections, max_selections, included_selections, allow_repeats, display_order)
    VALUES
      (prod_id, '22222222-2222-2222-2222-222222222222', true, 2, 2, 2, false, 1), -- Frutas
      (prod_id, '11111111-1111-1111-1111-111111111111', true, 4, NULL, 4, true, 2) -- Toppings
    ON CONFLICT (product_id, group_id) DO UPDATE SET is_required = EXCLUDED.is_required, min_selections = EXCLUDED.min_selections, max_selections = EXCLUDED.max_selections, included_selections = EXCLUDED.included_selections, allow_repeats = EXCLUDED.allow_repeats, display_order = EXCLUDED.display_order;
  END IF;


  -- Combo 6 Manzanitas
  SELECT id INTO prod_id FROM public.zanita_products WHERE slug = 'combo-6-manzanitas-chamoy-jumbo';
  IF FOUND THEN
    INSERT INTO public.zanita_product_option_groups (product_id, group_id, is_required, min_selections, max_selections, included_selections, allow_repeats, display_order)
    VALUES
      (prod_id, '33333333-3333-3333-3333-333333333333', true, 6, 6, 6, true, 1), -- Composición
      (prod_id, '11111111-1111-1111-1111-111111111111', false, 0, NULL, 0, true, 2) -- Toppings
    ON CONFLICT (product_id, group_id) DO UPDATE SET is_required = EXCLUDED.is_required, min_selections = EXCLUDED.min_selections, max_selections = EXCLUDED.max_selections, included_selections = EXCLUDED.included_selections, allow_repeats = EXCLUDED.allow_repeats, display_order = EXCLUDED.display_order;
  END IF;

  -- Combo 12 Manzanitas
  SELECT id INTO prod_id FROM public.zanita_products WHERE slug = 'combo-12-manzanitas-chamoy-jumbo';
  IF FOUND THEN
    INSERT INTO public.zanita_product_option_groups (product_id, group_id, is_required, min_selections, max_selections, included_selections, allow_repeats, display_order)
    VALUES
      (prod_id, '33333333-3333-3333-3333-333333333333', true, 12, 12, 12, true, 1), -- Composición
      (prod_id, '11111111-1111-1111-1111-111111111111', false, 0, NULL, 0, true, 2) -- Toppings
    ON CONFLICT (product_id, group_id) DO UPDATE SET is_required = EXCLUDED.is_required, min_selections = EXCLUDED.min_selections, max_selections = EXCLUDED.max_selections, included_selections = EXCLUDED.included_selections, allow_repeats = EXCLUDED.allow_repeats, display_order = EXCLUDED.display_order;
  END IF;

  -- Para todos los demás productos, los toppings son OPCIONALES y SIN toppings incluidos.
  -- Usamos un cursor para iterar los que no sean charolas ni mix.
  FOR prod_id IN SELECT id FROM public.zanita_products WHERE slug NOT IN ('charola-individual-2-toppings', 'charola-mediana-3-toppings', 'charola-grande-4-toppings', 'charola-jumbo-6-toppings', 'mix-de-frutas', 'combo-6-manzanitas-chamoy-jumbo', 'combo-12-manzanitas-chamoy-jumbo') LOOP
    INSERT INTO public.zanita_product_option_groups (product_id, group_id, is_required, min_selections, max_selections, included_selections, allow_repeats, display_order)
    VALUES (prod_id, '11111111-1111-1111-1111-111111111111', false, 0, NULL, 0, true, 1)
    ON CONFLICT (product_id, group_id) DO UPDATE SET is_required = EXCLUDED.is_required, min_selections = EXCLUDED.min_selections, max_selections = EXCLUDED.max_selections, included_selections = EXCLUDED.included_selections, allow_repeats = EXCLUDED.allow_repeats, display_order = EXCLUDED.display_order;
  END LOOP;
END $$;
