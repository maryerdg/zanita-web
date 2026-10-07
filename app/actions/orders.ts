'use server';

import { createClient } from './supabase-server';
import type { SubmitOrderPayload } from '@/lib/checkout/types';
import { submitOrderWithClient, type SubmitOrderResult } from '@/lib/orders/service';

export type { SubmitOrderResult };

/**
 * Server Action to submit an order via public.submit_order RPC.
 * Validates user session on server, then delegates to submitOrderWithClient.
 */
export async function submitCheckoutOrder(payload: SubmitOrderPayload): Promise<SubmitOrderResult> {
  try {
    const supabase = await createClient();

    // Verify authenticated user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'Debes iniciar sesión para realizar tu pedido.',
      };
    }

    // Delegate to testable application service
    return await submitOrderWithClient(supabase, payload);
  } catch {
    return {
      success: false,
      error: 'No pudimos enviar tu pedido. Tu carrito sigue guardado. Intenta nuevamente.',
    };
  }
}


/**
 * Server Action to fetch authoritative availability slots for checkout.
 */
export async function getCheckoutSlots(
  deliveryMode: 'official_point' | 'home_delivery' | 'cetys_pickup',
  deliveryPointId?: string | null,
  startDate?: string,
  daysAhead: number = 14
) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_checkout_availability', {
      p_delivery_mode: deliveryMode,
      p_delivery_point_id: deliveryPointId || null,
      p_start_date: startDate || null,
      p_days: daysAhead,
    })

    if (error) {
      console.error('Error fetching checkout availability:', error)
      return { error: 'Error al consultar disponibilidad del servicio' }
    }

    return { availability: data }
  } catch (err: unknown) {
    console.error('getCheckoutSlots exception:', err)
    return { error: 'Error al consultar disponibilidad' }
  }
}
