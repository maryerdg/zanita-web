'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from './supabase-server';
import type { SubmitOrderPayload } from '@/lib/checkout/types';
import { submitOrderWithClient, type SubmitOrderResult } from '@/lib/orders/service';

export type { SubmitOrderResult };

export interface BankTransferSettings {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  clabe: string;
  instructions: string;
  isConfigured: boolean;
}

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
    const result = await submitOrderWithClient(supabase, payload);

    if (result.success && result.orderId && !result.isIdempotentReplay) {
      // Database trigger owns notification intent creation (Section 1 & 2).
      // Request immediate background dispatch:
      try {
        const { triggerPushDispatch } = await import('@/lib/push/sender');
        triggerPushDispatch({ eventKey: `new_order:${result.orderId}` });
      } catch (pushErr) {
        console.error('Failed to trigger push dispatch:', pushErr);
      }
    }

    return result;
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
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_checkout_availability', {
      p_delivery_mode: deliveryMode,
      p_delivery_point_id: deliveryPointId || null,
      p_start_date: startDate || null,
      p_days: daysAhead,
    });

    if (error) {
      console.error('Error fetching checkout availability:', error);
      return { error: 'Error al consultar disponibilidad del servicio' };
    }

    return { availability: data };
  } catch (err: unknown) {
    console.error('getCheckoutSlots exception:', err);
    return { error: 'Error al consultar disponibilidad' };
  }
}

/**
 * Retrieves configurable bank transfer instructions for approved orders.
 * Accessible only to authenticated order owners with orders in deposit_pending via get_order_payment_instructions RPC.
 * Returns isConfigured = false when disabled, incomplete, or if caller is not the verified order owner.
 * No dummy production data is returned.
 */
export async function getStoreBankTransferSettings(orderId?: string): Promise<BankTransferSettings> {
  const unconfigured: BankTransferSettings = {
    enabled: false,
    bankName: '',
    accountHolder: '',
    clabe: '',
    instructions: '',
    isConfigured: false,
  };

  if (!orderId) {
    return unconfigured;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_order_payment_instructions', {
      p_order_id: orderId,
    });

    if (error) {
      console.error('get_order_payment_instructions error (code):', error.code);
      return unconfigured;
    }

    if (data && typeof data === 'object') {
      const val = data as Record<string, unknown>;
      const bankName = typeof val.bank_name === 'string' ? val.bank_name.trim() : '';
      const accountHolder = typeof val.account_holder === 'string' ? val.account_holder.trim() : '';
      const clabe = typeof val.clabe === 'string' ? val.clabe.trim() : '';
      const instructions = typeof val.instructions === 'string' ? val.instructions.trim() : '';

      const isConfigured = Boolean(bankName && accountHolder && clabe && /^\d{18}$/.test(clabe));

      return {
        enabled: isConfigured,
        bankName,
        accountHolder,
        clabe,
        instructions,
        isConfigured,
      };
    }
  } catch {
    console.error('getStoreBankTransferSettings exception');
  }

  return unconfigured;
}

/**
 * Server Action for an authenticated customer to report having made their payment.
 * Updates payment_reported_at and optional reference.
 * Does NOT set amount_paid_cents.
 * Does NOT advance order status.
 * Idempotent: repeated clicks preserve original report timestamp and update reference.
 */
export async function reportCustomerOrderPayment(
  orderId: string,
  reference?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Debes iniciar sesión para reportar tu pago.' };
    }

    const sanitizedRef = reference ? reference.trim().slice(0, 50) : null;

    // Fetch order first to verify owner and have identifiers ready for notifications
    const { data: order, error: fetchErr } = await supabase
      .from('zanita_orders')
      .select('id, user_id, status, order_number, payment_reported_at')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchErr || !order || order.user_id !== user.id) {
      return { success: false, error: 'Pedido no encontrado o no autorizado.' };
    }

    if (order.status !== 'deposit_pending') {
      return { success: false, error: 'El pedido no se encuentra en espera de pago.' };
    }

    // 1. Try public.report_order_payment RPC
    let reportSaved = false;
    const { data: rpcData, error: rpcError } = await supabase.rpc('report_order_payment', {
      p_order_id: orderId,
      p_reference: sanitizedRef,
    });

    if (!rpcError && rpcData?.success) {
      reportSaved = true;
    } else {
      // 2. Fallback in case RPC is not yet in DB: verified server-side update
      const nowIso = new Date().toISOString();
      const { error: updErr } = await supabase
        .from('zanita_orders')
        .update({
          payment_reported_at: order.payment_reported_at || nowIso,
          payment_reference: sanitizedRef,
          updated_at: nowIso,
        })
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (updErr) {
        console.error('reportCustomerOrderPayment update error:', updErr);
        return { success: false, error: 'No se pudo guardar el reporte de pago.' };
      }
      reportSaved = true;
    }

    if (reportSaved) {
      // Database trigger automatically inserts payment_reported outbox event (Section 1 & 2).
      // Request immediate background dispatch:
      try {
        const { triggerPushDispatch } = await import('@/lib/push/sender');
        triggerPushDispatch();
      } catch (pushErr) {
        console.error('Failed to trigger push dispatch on payment report:', pushErr);
      }

      revalidatePath(`/pedidos/${order.order_number}`);
      revalidatePath('/mi-cuenta');
      revalidatePath('/admin');
      revalidatePath('/admin/pedidos');
      return { success: true };
    }

    return { success: false, error: 'No se pudo registrar el reporte de pago.' };
  } catch (err: unknown) {
    console.error('reportCustomerOrderPayment exception:', err);
    return { success: false, error: 'Error inesperado al reportar el pago.' };
  }
}
