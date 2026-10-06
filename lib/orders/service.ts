import type { SubmitOrderPayload } from '@/lib/checkout/types';

export interface SubmitOrderResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  status?: string;
  productsSubtotalCents?: number;
  deliveryFeeCents?: number | null;
  totalAmountCents?: number;
  deliveryQuoteStatus?: string;
  isIdempotentReplay?: boolean;
  error?: string;
}

/**
 * Maps raw PostgreSQL/Supabase errors to customer-friendly messages.
 * Disambiguates P0003 between missing requested datetime and insufficient anticipation (<24h).
 * Never leaks raw error strings, SQLSTATE codes, or internal implementation details.
 */
export function mapSubmitOrderError(rawError: { message?: string; code?: string }): string {
  const msg = rawError.message || '';
  const code = rawError.code || '';

  if (code === 'P0001' || msg.includes('No autorizado') || msg.includes('iniciar sesión')) {
    return 'Debes iniciar sesión para realizar tu pedido.';
  }
  // P0003 Disambiguation: missing datetime vs insufficient anticipation (<24h)
  if (
    msg.includes('fecha y hora') ||
    msg.includes('solicitadas son obligatorias') ||
    (code === 'P0003' && !msg.includes('anticipa') && !msg.includes('24 horas'))
  ) {
    return 'Selecciona una fecha y hora para tu pedido.';
  }
  if (
    msg.includes('anticipación') ||
    msg.includes('anticipacion') ||
    msg.includes('24 horas') ||
    code === 'P0003'
  ) {
    return 'Selecciona una fecha y hora con al menos 24 horas de anticipación.';
  }
  if (
    code === 'P0036' ||
    msg.includes('cerramos la recepción de pedidos') ||
    msg.includes('cerramos la recepcion de pedidos')
  ) {
    return 'Por hoy ya cerramos la recepción de pedidos para entrega hoy. Por favor elige otra fecha u horario para continuar.';
  }
  if (code === 'P0004' || msg.includes('Punto de entrega no encontrado') || msg.includes('punto de entrega')) {
    return 'El punto de entrega seleccionado no está disponible. Selecciona otro punto.';
  }
  if (code === 'P0005' || (msg.includes('CETYS') && (msg.includes('autorización') || msg.includes('autorizacion')))) {
    return 'No tienes autorización para seleccionar entrega en CETYS Universidad.';
  }
  if (code === 'P0006' || msg.includes('lunes a viernes')) {
    return 'La entrega en CETYS solo está disponible de lunes a viernes.';
  }
  if (code === 'P0007' || msg.includes('horario de entrega en CETYS')) {
    return 'El horario de entrega en CETYS debe ser entre 4:00 p.m. y 8:00 p.m.';
  }
  if (code === 'P0008' || msg.includes('dirección de entrega') || msg.includes('direccion de entrega')) {
    return 'Por favor ingresa tu dirección completa para la entrega.';
  }
  if (code === 'P0009' || msg.includes('carrito está vacío') || msg.includes('carrito esta vacio')) {
    return 'Tu carrito está vacío. Agrega productos antes de continuar.';
  }
  if (code === 'P0011' || msg.includes('Producto no encontrado') || msg.includes('inactivo')) {
    return 'Uno de los productos de tu carrito ya no está disponible. Revisa tu carrito.';
  }
  if (
    code === 'P0010' ||
    (code >= 'P0014' && code <= 'P0021') ||
    msg.includes('opciones') ||
    msg.includes('opción') ||
    msg.includes('opcion')
  ) {
    return 'La configuración de uno de tus productos cambió o no está disponible. Revisa tu carrito.';
  }

  // Safe generic fallback without leaking implementation or stack
  return 'No pudimos enviar tu pedido. Tu carrito sigue guardado. Intenta nuevamente.';
}

/**
 * Reusable and testable application service to submit an order using any authenticated Supabase client.
 * Handles payload validation, RPC execution, error mapping, and response normalization.
 * Does NOT require or accept service_role.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function submitOrderWithClient(supabase: any, payload: SubmitOrderPayload): Promise<SubmitOrderResult> {
  try {
    // 1. Validate payload essentials
    if (!payload.idempotency_key) {
      return {
        success: false,
        error: 'Clave de solicitud inválida. Por favor recarga e intenta de nuevo.',
      };
    }

    if (!payload.items || payload.items.length === 0) {
      return {
        success: false,
        error: 'Tu carrito está vacío.',
      };
    }

    // 2. Call public.submit_order RPC
    const { data, error: rpcError } = await supabase.rpc('submit_order', {
      p_idempotency_key: payload.idempotency_key,
      p_customer_name: payload.customer_name,
      p_customer_phone: payload.customer_phone,
      p_customer_email: payload.customer_email,
      p_requested_date: payload.requested_date,
      p_requested_time: payload.requested_time,
      p_delivery_point_id: payload.delivery_point_id,
      p_delivery_address: payload.delivery_address,
      p_notes: payload.notes,
      p_items: payload.items,
    });

    if (rpcError) {
      return {
        success: false,
        error: mapSubmitOrderError(rpcError),
      };
    }

    // 3. Ensure RPC returned required identifiers
    if (!data || !data.order_id || !data.order_number) {
      return {
        success: false,
        error: 'No pudimos procesar tu pedido. Tu carrito sigue guardado. Intenta nuevamente.',
      };
    }

    return {
      success: true,
      orderId: data.order_id,
      orderNumber: data.order_number,
      status: data.status,
      productsSubtotalCents: data.products_subtotal_cents,
      deliveryFeeCents: data.delivery_fee_cents,
      totalAmountCents: data.total_amount_cents,
      deliveryQuoteStatus: data.delivery_quote_status,
      isIdempotentReplay: data.is_idempotent_replay === true,
    };
  } catch {
    return {
      success: false,
      error: 'No pudimos enviar tu pedido. Tu carrito sigue guardado. Intenta nuevamente.',
    };
  }
}
