-- FINAL PRE-LAUNCH ORDER RESET
-- Explicitly approved on 2026-11-02.
--
-- Deletes all existing Zanita orders (QA/test history) and their dependent
-- order items/options + order-scoped push outbox events through ON DELETE CASCADE.
--
-- Preserves:
-- - auth users and profiles
-- - Admin/customer roles
-- - push subscriptions
-- - catalog/products/options
-- - delivery points/settings
-- - availability schedules
-- - store settings
--
-- After this migration, the next generated order number is ZAN-0001.

BEGIN;

-- Prevent a checkout from inserting a new order during the reset.
LOCK TABLE public.zanita_orders IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  v_orders integer;
  v_items integer;
  v_item_options integer;
  v_order_notifications integer;
BEGIN
  SELECT count(*) INTO v_orders FROM public.zanita_orders;
  SELECT count(*) INTO v_items FROM public.zanita_order_items;
  SELECT count(*) INTO v_item_options FROM public.zanita_order_item_options;
  SELECT count(*) INTO v_order_notifications
  FROM public.zanita_notification_events
  WHERE order_id IS NOT NULL;

  RAISE NOTICE
    'ZANITA FINAL RESET — before: orders=%, items=%, item_options=%, order_notifications=%',
    v_orders, v_items, v_item_options, v_order_notifications;
END
$$;

-- FK cascades:
-- zanita_orders -> zanita_order_items
-- zanita_order_items -> zanita_order_item_options
-- zanita_orders -> zanita_notification_events
DELETE FROM public.zanita_orders;

-- Canonical order-number generator.
ALTER SEQUENCE private.zanita_order_number_seq RESTART WITH 1;

DO $$
DECLARE
  v_orders integer;
  v_items integer;
  v_item_options integer;
  v_order_notifications integer;
BEGIN
  SELECT count(*) INTO v_orders FROM public.zanita_orders;
  SELECT count(*) INTO v_items FROM public.zanita_order_items;
  SELECT count(*) INTO v_item_options FROM public.zanita_order_item_options;
  SELECT count(*) INTO v_order_notifications
  FROM public.zanita_notification_events
  WHERE order_id IS NOT NULL;

  IF v_orders <> 0
     OR v_items <> 0
     OR v_item_options <> 0
     OR v_order_notifications <> 0 THEN
    RAISE EXCEPTION
      'ZANITA FINAL RESET FAILED — remaining: orders=%, items=%, item_options=%, order_notifications=%',
      v_orders, v_items, v_item_options, v_order_notifications;
  END IF;

  RAISE NOTICE
    'ZANITA FINAL RESET COMPLETE — next generated order number will be ZAN-0001';
END
$$;

COMMIT;
