-- =====================================================================================
-- Migration: 20261001150000_remove_unconfirmed_availability_defaults.sql
-- Description: Elimina horarios de entrega no confirmados (10:00–19:00) para
--              official_point y home_delivery de zanita_availability_rules.
--              Conserva la disponibilidad confirmada de CETYS (L-V 16:00–20:00).
--
-- Nota de Arquitectura:
-- 1. official_point y home_delivery quedan sin schedule recurrente por defecto
--    hasta que Mena los defina desde el panel Admin (en 8D.2 ausencia de regla
--    significa 'configuration_required', no abierto todo el día).
-- 2. LEGACY BRIDGE FOR CURRENT CHECKOUT:
--    El registro 'Otra ubicación' en public.zanita_delivery_points se preserva
--    temporalmente para compatibilidad con el flujo actual 8C hasta que 8D.3
--    lo desactive al introducir la modalidad HOME_DELIVERY nativa.
-- =====================================================================================

-- Eliminar únicamente las reglas seed no confirmadas de official_point y home_delivery
DELETE FROM public.zanita_availability_rules
WHERE delivery_mode IN ('official_point', 'home_delivery');
