'use server';

import { createClient } from '@/app/actions/supabase-server';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

export interface SaveSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  platform?: string;
  deviceLabel?: string;
}

export async function getVapidPublicKey(): Promise<string> {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
}

/**
 * Saves or rebinds a push subscription to the authenticated caller.
 * Cross-owner reconciliation (Section 9):
 * If an endpoint was previously registered to a different user (e.g. Device X switch from User A to User B),
 * trusted server-side logic atomically rebinds the endpoint to User B without exposing User A's identity.
 */
export async function savePushSubscription(input: SaveSubscriptionInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Inicia sesión para activar notificaciones.' };
    }

    if (!input.endpoint || !input.p256dh || !input.auth) {
      return { success: false, error: 'Datos de suscripción incompletos.' };
    }

    const serviceClient = getSupabaseServiceClient();

    // Check if endpoint already exists in zanita_push_subscriptions
    const { data: existing, error: queryErr } = await serviceClient
      .from('zanita_push_subscriptions')
      .select('id, user_id')
      .eq('endpoint', input.endpoint)
      .maybeSingle();

    if (queryErr) {
      console.error('[WebPush] Error checking existing subscription:', queryErr);
      return { success: false, error: queryErr.message };
    }

    if (existing) {
      // Rebind endpoint to current user and reactivate
      const { error: updateErr } = await serviceClient
        .from('zanita_push_subscriptions')
        .update({
          user_id: user.id, // Atomically reassigns ownership if previous user was different
          p256dh: input.p256dh,
          auth: input.auth,
          platform: input.platform || null,
          device_label: input.deviceLabel || null,
          disabled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateErr) {
        console.error('[WebPush] Error updating subscription:', updateErr);
        return { success: false, error: updateErr.message };
      }
    } else {
      // Insert new subscription for current user
      const { error: insertErr } = await serviceClient
        .from('zanita_push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          platform: input.platform || null,
          device_label: input.deviceLabel || null,
          disabled_at: null,
          updated_at: new Date().toISOString(),
        });

      if (insertErr) {
        console.error('[WebPush] Error inserting subscription:', insertErr);
        return { success: false, error: insertErr.message };
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[WebPush] savePushSubscription exception:', msg);
    return { success: false, error: msg };
  }
}

export async function removePushSubscription(endpoint: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autorizado' };
    }

    const serviceClient = getSupabaseServiceClient();

    // Mark subscription disabled for the authenticated user only
    const { error } = await serviceClient
      .from('zanita_push_subscriptions')
      .update({
        disabled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('endpoint', endpoint)
      .eq('user_id', user.id);

    if (error) {
      console.error('[WebPush] Error removing subscription:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function getDeviceSubscriptionStatus(endpoint?: string): Promise<{
  isSubscribed: boolean;
  userId?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isSubscribed: false };
    }

    if (!endpoint) {
      return { isSubscribed: false, userId: user.id };
    }

    const serviceClient = getSupabaseServiceClient();

    const { data: sub } = await serviceClient
      .from('zanita_push_subscriptions')
      .select('id, disabled_at')
      .eq('endpoint', endpoint)
      .eq('user_id', user.id)
      .is('disabled_at', null)
      .maybeSingle();

    return {
      isSubscribed: !!sub,
      userId: user.id,
    };
  } catch {
    return { isSubscribed: false };
  }
}
