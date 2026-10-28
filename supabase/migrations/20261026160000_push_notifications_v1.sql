-- Migration: 20261026160000_push_notifications_v1.sql
-- Description: Standards-based Web Push Notification tables, authoritative database triggers, and least-privilege RLS policies

-- 1. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.zanita_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    device_label TEXT,
    platform TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_success_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_zanita_push_subscriptions_user_id 
    ON public.zanita_push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_zanita_push_subscriptions_active 
    ON public.zanita_push_subscriptions (user_id) 
    WHERE disabled_at IS NULL;

-- 2. Notification Events Outbox Table
-- Status lifecycle:
-- 'pending': inserted by database trigger, waiting for worker drain
-- 'processing': atomically claimed by drain worker under FOR UPDATE SKIP LOCKED
-- 'sent': push service (FCM, Apple Web Push, Mozilla) accepted payload (HTTP 201 Created)
-- 'partial': delivered to some subscriptions, but at least one failed
-- 'failed': all endpoint dispatches failed or non-retriable error
-- 'no_subscribers': recipient user or admin role had 0 active subscriptions
--
-- NOTE ON 'SENT' SEMANTICS:
-- Status 'sent' indicates that the browser Web Push service accepted the payload (HTTP 201 Created).
-- It does NOT guarantee that the recipient's device is currently powered on, connected to internet,
-- or that the push was visually displayed to the user.
CREATE TABLE IF NOT EXISTS public.zanita_notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    order_id UUID REFERENCES public.zanita_orders(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    recipient_scope TEXT NOT NULL, -- 'admin' | 'customer'
    recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'sent' | 'partial' | 'failed' | 'no_subscribers'
    attempt_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    sent_at TIMESTAMPTZ,
    last_error TEXT
);

-- Ensure updated_at exists if table already existed previously
ALTER TABLE public.zanita_notification_events 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_zanita_notification_events_order_id 
    ON public.zanita_notification_events (order_id);

CREATE INDEX IF NOT EXISTS idx_zanita_notification_events_recipient_user_id 
    ON public.zanita_notification_events (recipient_user_id);

CREATE INDEX IF NOT EXISTS idx_zanita_notification_events_status 
    ON public.zanita_notification_events (status);

CREATE INDEX IF NOT EXISTS idx_zanita_notification_events_claim 
    ON public.zanita_notification_events (status, updated_at, attempt_count);

-- 3. RLS on zanita_push_subscriptions
ALTER TABLE public.zanita_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Authenticated users manage ONLY their own push subscriptions
DROP POLICY IF EXISTS "user_select_own_push_subscriptions" ON public.zanita_push_subscriptions;
CREATE POLICY "user_select_own_push_subscriptions"
    ON public.zanita_push_subscriptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_insert_own_push_subscriptions" ON public.zanita_push_subscriptions;
CREATE POLICY "user_insert_own_push_subscriptions"
    ON public.zanita_push_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_update_own_push_subscriptions" ON public.zanita_push_subscriptions;
CREATE POLICY "user_update_own_push_subscriptions"
    ON public.zanita_push_subscriptions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_delete_own_push_subscriptions" ON public.zanita_push_subscriptions;
CREATE POLICY "user_delete_own_push_subscriptions"
    ON public.zanita_push_subscriptions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. RLS on zanita_notification_events
ALTER TABLE public.zanita_notification_events ENABLE ROW LEVEL SECURITY;

-- Admins can view notification events for operational auditing
DROP POLICY IF EXISTS "admin_select_notification_events" ON public.zanita_notification_events;
CREATE POLICY "admin_select_notification_events"
    ON public.zanita_notification_events
    FOR SELECT
    TO authenticated
    USING (private.is_admin());

-- 5. Table Grants
-- Anon has NO access to subscriptions or events
REVOKE ALL ON public.zanita_push_subscriptions FROM anon;
REVOKE ALL ON public.zanita_notification_events FROM anon;

-- Authenticated can manage their own subscriptions and read events if admin
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zanita_push_subscriptions TO authenticated;
GRANT SELECT ON public.zanita_notification_events TO authenticated;

-- Service role has full administrative access for background dispatch
GRANT ALL ON public.zanita_push_subscriptions TO service_role;
GRANT ALL ON public.zanita_notification_events TO service_role;

-- 6. Authoritative Database Trigger for Transactional Notification Intent
-- Hardened SECURITY DEFINER with empty search_path and fully schema-qualified calls
CREATE OR REPLACE FUNCTION private.zanita_orders_notification_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_event_key TEXT;
    v_type TEXT;
    v_title TEXT;
    v_body TEXT;
    v_url TEXT;
BEGIN
    -- 1. Order Creation Event (Admin Scope)
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'pending_approval' THEN
            INSERT INTO public.zanita_notification_events (
                event_key,
                type,
                order_id,
                order_number,
                recipient_scope,
                recipient_user_id,
                payload,
                status,
                attempt_count,
                created_at,
                updated_at
            ) VALUES (
                'new_order:' || NEW.id::pg_catalog.text,
                'new_order',
                NEW.id,
                NEW.order_number,
                'admin',
                NULL,
                pg_catalog.jsonb_build_object(
                    'title', 'Nuevo pedido',
                    'body', NEW.order_number || ' requiere revisión',
                    'url', '/admin/pedidos?order=' || NEW.order_number,
                    'scope', 'admin'
                ),
                'pending',
                0,
                pg_catalog.timezone('utc', pg_catalog.now()),
                pg_catalog.timezone('utc', pg_catalog.now())
            )
            ON CONFLICT (event_key) DO NOTHING;
        END IF;
        RETURN NEW;
    END IF;

    -- 2. Order Updates (Admin & Customer Scope)
    IF TG_OP = 'UPDATE' THEN
        -- A. Payment Reported by Customer (Admin Alert)
        IF OLD.payment_reported_at IS NULL AND NEW.payment_reported_at IS NOT NULL THEN
            INSERT INTO public.zanita_notification_events (
                event_key,
                type,
                order_id,
                order_number,
                recipient_scope,
                recipient_user_id,
                payload,
                status,
                attempt_count,
                created_at,
                updated_at
            ) VALUES (
                'payment_reported:' || NEW.id::pg_catalog.text || ':' || pg_catalog.to_char(NEW.payment_reported_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI'),
                'payment_reported',
                NEW.id,
                NEW.order_number,
                'admin',
                NULL,
                pg_catalog.jsonb_build_object(
                    'title', 'Pago reportado',
                    'body', 'Revisa el pago de ' || NEW.order_number,
                    'url', '/admin/pedidos?order=' || NEW.order_number,
                    'scope', 'admin'
                ),
                'pending',
                0,
                pg_catalog.timezone('utc', pg_catalog.now()),
                pg_catalog.timezone('utc', pg_catalog.now())
            )
            ON CONFLICT (event_key) DO NOTHING;
        END IF;

        -- B. Status Transitions (Customer Alerts)
        IF OLD.status IS DISTINCT FROM NEW.status AND NEW.user_id IS NOT NULL THEN
            v_type := NULL;

            IF OLD.status = 'pending_approval' AND NEW.status = 'deposit_pending' THEN
                v_type := 'order_approved';
                v_title := 'Pedido aprobado';
                v_body := NEW.order_number || ' fue aprobado. Ya puedes realizar tu pago.';
                v_url := '/pedidos/' || NEW.order_number;
                v_event_key := 'order_approved:' || NEW.id::pg_catalog.text || ':deposit_pending';

            ELSIF OLD.status = 'deposit_pending' AND NEW.status = 'confirmed' THEN
                v_type := 'payment_confirmed';
                v_title := 'Pago confirmado';
                v_body := 'Tu pedido ' || NEW.order_number || ' quedó confirmado.';
                v_url := '/pedidos/' || NEW.order_number;
                v_event_key := 'payment_confirmed:' || NEW.id::pg_catalog.text || ':confirmed';

            ELSIF NEW.status = 'preparing' THEN
                v_type := 'preparing';
                v_title := 'Estamos preparando tu pedido';
                v_body := NEW.order_number || ' ya está en preparación.';
                v_url := '/pedidos/' || NEW.order_number;
                v_event_key := 'preparing:' || NEW.id::pg_catalog.text || ':preparing';

            ELSIF NEW.status = 'ready' THEN
                v_type := 'ready';
                v_title := 'Tu pedido está listo';
                v_body := NEW.order_number || ' está listo para entrega.';
                v_url := '/pedidos/' || NEW.order_number;
                v_event_key := 'ready:' || NEW.id::pg_catalog.text || ':ready';

            ELSIF NEW.status = 'rejected' THEN
                v_type := 'rejected';
                v_title := 'Actualización de tu pedido';
                v_body := NEW.order_number || ' no pudo ser aprobado. Consulta los detalles.';
                v_url := '/pedidos/' || NEW.order_number;
                v_event_key := 'rejected:' || NEW.id::pg_catalog.text || ':rejected';

            ELSIF NEW.status = 'cancelled' THEN
                v_type := 'cancelled';
                v_title := 'Pedido cancelado';
                v_body := 'Consulta la actualización de ' || NEW.order_number || '.';
                v_url := '/pedidos/' || NEW.order_number;
                v_event_key := 'cancelled:' || NEW.id::pg_catalog.text || ':cancelled';
            END IF;

            IF v_type IS NOT NULL THEN
                INSERT INTO public.zanita_notification_events (
                    event_key,
                    type,
                    order_id,
                    order_number,
                    recipient_scope,
                    recipient_user_id,
                    payload,
                    status,
                    attempt_count,
                    created_at,
                    updated_at
                ) VALUES (
                    v_event_key,
                    v_type,
                    NEW.id,
                    NEW.order_number,
                    'customer',
                    NEW.user_id,
                    pg_catalog.jsonb_build_object(
                        'title', v_title,
                        'body', v_body,
                        'url', v_url,
                        'scope', 'customer'
                    ),
                    'pending',
                    0,
                    pg_catalog.timezone('utc', pg_catalog.now()),
                    pg_catalog.timezone('utc', pg_catalog.now())
                )
                ON CONFLICT (event_key) DO NOTHING;
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_zanita_orders_notification ON public.zanita_orders;
CREATE TRIGGER trg_zanita_orders_notification
AFTER INSERT OR UPDATE ON public.zanita_orders
FOR EACH ROW
EXECUTE FUNCTION private.zanita_orders_notification_trigger();

-- 7. Atomic Concurrency Claim Function for Drain Workers
-- Prevents race conditions and double-dispatch across concurrent workers.
-- Supports lease timeout reclamation for stuck 'processing' events (> 5 minutes).
-- Uses SECURITY INVOKER because service_role already holds all necessary table grants and bypassrls.
CREATE OR REPLACE FUNCTION public.claim_pending_notification_events(p_limit INT DEFAULT 10)
RETURNS SETOF public.zanita_notification_events
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    WITH claimable AS (
        SELECT id
        FROM public.zanita_notification_events
        WHERE (
            status = 'pending'
            OR (status = 'failed' AND attempt_count < 3)
            OR (status = 'processing' AND updated_at < (pg_catalog.now() - INTERVAL '5 minutes') AND attempt_count < 3)
        )
        ORDER BY created_at ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.zanita_notification_events e
    SET status = 'processing',
        attempt_count = e.attempt_count + 1,
        updated_at = pg_catalog.now()
    FROM claimable
    WHERE e.id = claimable.id
    RETURNING e.*;
END;
$$;

-- Explicitly lock down claim RPC privileges:
-- By default in PostgreSQL, newly created functions grant EXECUTE to PUBLIC.
-- We explicitly REVOKE from PUBLIC, anon, and authenticated, and GRANT strictly to service_role.
REVOKE ALL ON FUNCTION public.claim_pending_notification_events(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_pending_notification_events(integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_pending_notification_events(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_notification_events(integer) TO service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
