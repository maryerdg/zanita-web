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
