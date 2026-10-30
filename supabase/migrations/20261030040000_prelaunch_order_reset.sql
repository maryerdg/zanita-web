-- FINAL PRE-LAUNCH ORDER RESET
-- IMPORTANT: Keep this migration on the ops/prelaunch-order-reset branch until
-- all functional QA is complete and Maryer explicitly approves the final reset.
--
-- Scope:
--   - Deletes ALL existing Zanita orders in Production.
--   - Child order items/options are removed by ON DELETE CASCADE.
--   - Push notification outbox events linked to orders are removed by ON DELETE CASCADE.
--   - Preserves auth users, profiles, push subscriptions, catalog, delivery settings,
--     availability configuration, store settings and all non-order operational data.
--   - Restarts the canonical order-number sequence so the next real order is ZAN-0001.

BEGIN;

-- Prevent a checkout from inserting a new order in the middle of the reset.
LOCK TABLE public.zanita_orders IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  v_orders integer;
  v_items integer;
  v_item_options integer;
  v_notifications integer;
BEGIN
  SELECT count(*) INTO v_orders FROM public.zanita_orders;
  SELECT count(*) INTO v_items FROM public.zanita_order_items;
  SELECT count(*) INTO v_item_options FROM public.zanita_order_item_options;
  SELECT count(*) INTO v_notifications FROM public.zanita_notification_events;

  RAISE NOTICE
    'ZANITA PRE-LAUNCH RESET — before cleanup: orders=%, items=%, item_options=%, notification_events=%',
    v_orders, v_items, v_item_options, v_notifications;
END
$$;

-- Order items cascade from zanita_orders.
-- Item options cascade from zanita_order_items.
-- Order-scoped notification events cascade from zanita_orders.
DELETE FROM public.zanita_orders;

-- nextval(...) must return 1 for the next real order.
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

  IF v_orders <> 0 OR v_items <> 0 OR v_item_options <> 0 OR v_order_notifications <> 0 THEN
    RAISE EXCEPTION
      'ZANITA PRE-LAUNCH RESET FAILED — remaining rows: orders=%, items=%, item_options=%, order_notifications=%',
      v_orders, v_items, v_item_options, v_order_notifications;
  END IF;

  RAISE NOTICE
    'ZANITA PRE-LAUNCH RESET COMPLETE — next generated order number will be ZAN-0001';
END
$$;

COMMIT;
