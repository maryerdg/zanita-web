// lib/push/sender.ts
// Server-side Web Push dispatcher with transactional outbox, atomic concurrency claim, retry/drain, and bounded delivery handling

import webpush from 'web-push';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * NOTE ON 'SENT' STATUS SEMANTICS:
 * Status 'sent' means the Web Push payload was accepted by the browser push service
 * (e.g. FCM for Chrome, Apple Web Push for Safari/iOS, Mozilla Autopush for Firefox)
 * with HTTP 201 Created.
 * It does NOT guarantee that the customer's device is currently powered on,
 * connected to the internet, or that the notification was visibly rendered on screen.
 */

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  eventKey?: string;
  scope?: 'admin' | 'customer';
}

export interface ZanitaNotificationEvent {
  id: string;
  event_key: string;
  type: string;
  order_id?: string;
  order_number: string;
  recipient_scope: 'admin' | 'customer';
  recipient_user_id?: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'sent' | 'partial' | 'failed' | 'no_subscribers';
  attempt_count: number;
  created_at: string;
  updated_at: string;
  sent_at?: string | null;
  last_error?: string | null;
}

let vapidConfigured = false;

function ensureVapidConfig(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'https://zanita.maryerdigital.com';

  if (!publicKey || !privateKey) {
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error('[WebPush] Error configuring VAPID details:', err);
    return false;
  }
}

/**
 * Dispatch a specific notification event or trigger the outbox drain worker.
 * Push errors NEVER throw or bubble up to the caller.
 */
export async function triggerPushDispatch(options?: { eventKey?: string }): Promise<void> {
  try {
    if (options?.eventKey) {
      await dispatchNotificationEvent(options.eventKey);
    } else {
      await processPendingNotificationOutbox({ limit: 10 });
    }
  } catch (err: unknown) {
    console.error('[WebPush] triggerPushDispatch error:', err);
  }
}

/**
 * Drains pending or retriable failed events from the zanita_notification_events outbox.
 * Concurrency model:
 * - Uses private.claim_pending_notification_events() with FOR UPDATE SKIP LOCKED
 * - Prevents multiple workers / overlapping cron runs from processing the same event
 * - Atomically marks claimed events as 'processing' with incremented attempt_count
 * - Reclaims stuck 'processing' events older than 5 minutes
 */
export async function processPendingNotificationOutbox(
  options: { limit?: number } = {}
): Promise<{ processed: number; errors: number }> {
  const limit = options.limit || 10;
  const supabase = getSupabaseServiceClient();

  let processed = 0;
  let errors = 0;

  try {
    // Atomically claim rows using FOR UPDATE SKIP LOCKED via RPC
    const { data: claimedEvents, error } = await supabase.rpc(
      'claim_pending_notification_events',
      { p_limit: limit }
    );

    if (error) {
      console.error('[WebPush] Failed claiming outbox events via RPC:', error);
      return { processed: 0, errors: 1 };
    }

    if (!claimedEvents || claimedEvents.length === 0) {
      return { processed: 0, errors: 0 };
    }

    for (const ev of claimedEvents as ZanitaNotificationEvent[]) {
      try {
        await executeEventDispatch(ev);
        processed++;
      } catch (e) {
        console.error(`[WebPush] Failed dispatching claimed event ${ev.event_key}:`, e);
        errors++;
      }
    }

    return { processed, errors };
  } catch (err) {
    console.error('[WebPush] processPendingNotificationOutbox exception:', err);
    return { processed, errors: errors + 1 };
  }
}

/**
 * Dispatches an authoritative notification event by eventKey to all active recipient subscriptions.
 * Used for targeted dispatch.
 */
export async function dispatchNotificationEvent(eventKey: string): Promise<void> {
  const supabase = getSupabaseServiceClient();

  try {
    // 1. Fetch event
    const { data: event, error: eventError } = await supabase
      .from('zanita_notification_events')
      .select('*')
      .eq('event_key', eventKey)
      .single();

    if (eventError || !event) {
      console.warn(`[WebPush] Event not found for dispatch: ${eventKey}`);
      return;
    }

    // Do not resend already sent or completed events
    if (event.status === 'sent' || event.status === 'no_subscribers') {
      return;
    }

    // Check bounded attempts
    if (event.attempt_count >= 3) {
      console.warn(`[WebPush] Max attempts reached for event ${eventKey}`);
      return;
    }

    // Mark as processing with lease timestamp
    await supabase
      .from('zanita_notification_events')
      .update({
        status: 'processing',
        attempt_count: (event.attempt_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', event.id);

    await executeEventDispatch({
      ...event,
      status: 'processing',
      attempt_count: (event.attempt_count || 0) + 1,
      updated_at: new Date().toISOString(),
    } as ZanitaNotificationEvent);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WebPush] Dispatch exception for event ${eventKey}:`, msg);
    await supabase
      .from('zanita_notification_events')
      .update({
        status: 'failed',
        last_error: msg,
        updated_at: new Date().toISOString(),
      })
      .eq('event_key', eventKey);
  }
}

/**
 * Core dispatch execution for an already claimed or selected event.
 */
async function executeEventDispatch(event: ZanitaNotificationEvent): Promise<void> {
  const supabase = getSupabaseServiceClient();

  // 1. Resolve recipient active subscriptions
  interface PushSubRow {
    id: string;
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }

  let subscriptions: PushSubRow[] = [];

  if (event.recipient_scope === 'admin') {
    // Canonical admin resolution: find all admin profile IDs (public.profiles.role = 'admin')
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    const adminUserIds = (adminProfiles || []).map((p: { id: string }) => p.id);

    if (adminUserIds.length > 0) {
      const { data: adminSubs } = await supabase
        .from('zanita_push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth')
        .in('user_id', adminUserIds)
        .is('disabled_at', null);

      subscriptions = adminSubs || [];
    }
  } else if (event.recipient_scope === 'customer' && event.recipient_user_id) {
    const { data: customerSubs } = await supabase
      .from('zanita_push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .eq('user_id', event.recipient_user_id)
      .is('disabled_at', null);

    subscriptions = customerSubs || [];
  }

  // 2. Handle zero subscribers safely
  if (subscriptions.length === 0) {
    await supabase
      .from('zanita_notification_events')
      .update({
        status: 'no_subscribers',
        sent_at: new Date().toISOString(),
        last_error: 'NO_ACTIVE_SUBSCRIPTIONS',
        updated_at: new Date().toISOString(),
      })
      .eq('id', event.id);
    return;
  }

  // 3. Validate VAPID configuration
  const isVapidReady = ensureVapidConfig();
  const isTestOrLocalMock =
    process.env.NODE_ENV === 'test' || process.env.LOCAL_MOCK_PUSH === 'true';

  if (!isVapidReady) {
    if (isTestOrLocalMock) {
      console.warn('[WebPush] VAPID keys not configured in test environment; recording mocked delivery.');
      await supabase
        .from('zanita_notification_events')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_error: 'VAPID keys not configured (mock delivery)',
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);
      return;
    } else {
      console.error('[WebPush] Missing VAPID configuration in preview/production.');
      await supabase
        .from('zanita_notification_events')
        .update({
          status: 'failed',
          last_error: 'PUSH_CONFIG_MISSING',
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);
      return;
    }
  }

  // Ensure payload has origin-safe URL and icon
  const payloadObj = (event.payload || {}) as Record<string, unknown>;
  const pushPayloadString = JSON.stringify({
    title: payloadObj.title,
    body: payloadObj.body,
    url: payloadObj.url || '/',
    icon: payloadObj.icon || '/icon-192.png',
    badge: payloadObj.badge || '/icon-192.png',
    scope: event.recipient_scope,
    eventKey: event.event_key,
  });

  let sentSuccessCount = 0;
  let sentFailureCount = 0;
  let lastSendError = '';

  // 4. Send push to all active devices
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        pushPayloadString
      );

      sentSuccessCount++;
      // Update subscription last_success_at
      await supabase
        .from('zanita_push_subscriptions')
        .update({
          last_success_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.id);
    } catch (sendErr: unknown) {
      sentFailureCount++;
      const statusCode = (sendErr as { statusCode?: number })?.statusCode;
      lastSendError = (sendErr as Error)?.message || String(sendErr);

      console.warn(`[WebPush] Delivery failed for sub ${sub.id}: ${lastSendError} (HTTP ${statusCode})`);

      // HTTP 410 (Gone) or 404 (Not Found): subscription permanently expired
      if (statusCode === 410 || statusCode === 404) {
        console.log(`[WebPush] Subscription ${sub.id} expired/unregistered (HTTP ${statusCode}). Disabling.`);
        await supabase
          .from('zanita_push_subscriptions')
          .update({
            disabled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', sub.id);
      }
    }
  }

  // 5. Record final outbox status semantics
  let finalStatus: string;
  if (sentSuccessCount > 0 && sentFailureCount === 0) {
    finalStatus = 'sent';
  } else if (sentSuccessCount > 0 && sentFailureCount > 0) {
    finalStatus = 'partial';
  } else {
    finalStatus = 'failed';
  }

  await supabase
    .from('zanita_notification_events')
    .update({
      status: finalStatus,
      sent_at: sentSuccessCount > 0 ? new Date().toISOString() : null,
      last_error: lastSendError || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', event.id);
}
