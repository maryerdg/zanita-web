-- =================================================================================
-- ZANITA WEB - SEED CHECKOUT FOUNDATION (LOCAL / AUDIT ONLY)
-- NO APLICAR A PRODUCCIÓN HASTA REVISIÓN.
--
-- Puntos oficiales de entrega y configuración base de órdenes.
-- Totalmente idempotente: preserva is_active administrado por Mena en re-ejecuciones.
-- =================================================================================

-- 1. PUNTOS DE ENTREGA DETERMINÍSTICOS
INSERT INTO public.zanita_delivery_points (
  id,
  name,
  address,
  instructions,
  type,
  requires_quote,
  delivery_fee_cents,
  requires_special_pickup_permission,
  is_active,
  display_order
) VALUES
  -- Puntos Oficiales Estándar (Alba Roja, Ermita, Las Palmas, Hipódromo, Las Ferias, Punto Medio)
  -- NOTA DE NEGOCIO: requires_quote = true porque Mena cotiza/asigna manualmente el costo de entrega.
  ('dddd0001-0000-0000-0000-000000000000', 'Alba Roja', NULL, 'Punto oficial de entrega en zona Alba Roja.', 'standard', true, NULL, false, true, 1),
  ('dddd0002-0000-0000-0000-000000000000', 'Ermita', NULL, 'Punto oficial de entrega en zona Ermita.', 'standard', true, NULL, false, true, 2),
  ('dddd0003-0000-0000-0000-000000000000', 'Las Palmas', NULL, 'Punto oficial de entrega en zona Las Palmas.', 'standard', true, NULL, false, true, 3),
  ('dddd0004-0000-0000-0000-000000000000', 'Hipódromo', NULL, 'Punto oficial de entrega en zona Hipódromo.', 'standard', true, NULL, false, true, 4),
  ('dddd0005-0000-0000-0000-000000000000', 'Las Ferias', NULL, 'Punto oficial de entrega en zona Las Ferias.', 'standard', true, NULL, false, true, 5),
  ('dddd0006-0000-0000-0000-000000000000', 'Punto Medio', NULL, 'Punto oficial de entrega coordinado en Punto Medio.', 'standard', true, NULL, false, true, 6),

  -- Pickup Especial CETYS
  -- NOTA DE NEGOCIO: Representa pickup exclusivo para cuentas habilitadas, L-V 16:00 a 20:00. Sin costo de entrega.
  ('dddd0007-0000-0000-0000-000000000000', 'Pickup CETYS', 'Campus CETYS Universidad Tijuana', 'Disponible únicamente de lunes a viernes, de 4:00 p.m. a 8:00 p.m. para cuentas autorizadas.', 'special', false, 0, true, true, 7),

  -- Otra Ubicación (A cotizar por distancia $50-$100 MXN)
  -- NOTA DE NEGOCIO: Requiere que el cliente escriba su dirección completa en el checkout.
  ('dddd0008-0000-0000-0000-000000000000', 'Otra ubicación', NULL, 'Entrega a domicilio fuera de puntos oficiales. Cotización de envío orientativa entre $50 y $100 MXN según distancia.', 'other', true, NULL, false, true, 8)
ON CONFLICT (id) DO UPDATE SET
  name                               = EXCLUDED.name,
  address                            = EXCLUDED.address,
  instructions                       = EXCLUDED.instructions,
  type                               = EXCLUDED.type,
  requires_quote                     = EXCLUDED.requires_quote,
  delivery_fee_cents                 = EXCLUDED.delivery_fee_cents,
  requires_special_pickup_permission = EXCLUDED.requires_special_pickup_permission,
  display_order                      = EXCLUDED.display_order;
  -- is_active NO se sobreescribe para preservar cambios manuales de administración.


-- 2. CONFIGURACIÓN BASE DE LA TIENDA (STORE SETTINGS)
INSERT INTO public.zanita_store_settings (key, value, is_public) VALUES
  ('timezone', '"America/Tijuana"'::jsonb, true),
  ('min_anticipation_hours', '24'::jsonb, true),
  ('cetys_pickup_schedule', '{"days": [1, 2, 3, 4, 5], "start": "16:00", "end": "20:00"}'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET
  value     = EXCLUDED.value,
  is_public = EXCLUDED.is_public;
