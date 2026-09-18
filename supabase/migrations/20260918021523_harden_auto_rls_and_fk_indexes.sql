-- Harden Automatic RLS function to prevent external execution
-- Uses DO block to gracefully skip if the function does not exist in some environments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable') THEN
        REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
        REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
        REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
    END IF;
END
$$;

-- Add missing foreign key covering indexes for performance optimization
CREATE INDEX IF NOT EXISTS zanita_order_item_options_option_id_idx ON public.zanita_order_item_options(option_id);
CREATE INDEX IF NOT EXISTS zanita_order_item_options_order_item_id_idx ON public.zanita_order_item_options(order_item_id);
CREATE INDEX IF NOT EXISTS zanita_order_items_product_id_idx ON public.zanita_order_items(product_id);
CREATE INDEX IF NOT EXISTS zanita_product_option_groups_group_id_idx ON public.zanita_product_option_groups(group_id);
