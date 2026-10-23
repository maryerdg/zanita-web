/**
 * Operational Status Model for Zanita Orders
 *
 * Maps canonical database order statuses into clean operational categories for Mena.
 * Does NOT invent new database statuses.
 */

export type CanonicalOrderStatus =
  | 'pending_approval'
  | 'deposit_pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

export type OperationalCategory =
  | 'needs_attention'
  | 'waiting_payment'
  | 'to_prepare'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export interface OperationalStatusMeta {
  status: CanonicalOrderStatus;
  category: OperationalCategory;
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
  priorityOrder: number; // lower means higher operational priority in lists
}

export const OPERATIONAL_STATUS_MAP: Record<CanonicalOrderStatus, OperationalStatusMeta> = {
  pending_approval: {
    status: 'pending_approval',
    category: 'needs_attention',
    label: 'Por Aprobar',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
    description: 'Pedido recibido esperando revisión de Mena. Requiere aprobación o rechazo.',
    priorityOrder: 1,
  },
  deposit_pending: {
    status: 'deposit_pending',
    category: 'waiting_payment',
    label: 'Por Pagar',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    dotClass: 'bg-blue-500',
    description: 'Aprobado. Esperando que el cliente realice el pago / anticipo.',
    priorityOrder: 3,
  },
  confirmed: {
    status: 'confirmed',
    category: 'to_prepare',
    label: 'Por Preparar',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
    description: 'Confirmado en cola de producción. Listo para entrar a cocina.',
    priorityOrder: 2,
  },
  preparing: {
    status: 'preparing',
    category: 'preparing',
    label: 'En Preparación',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    dotClass: 'bg-orange-500',
    description: 'Mena está preparando el pedido en cocina/taller.',
    priorityOrder: 2,
  },
  ready: {
    status: 'ready',
    category: 'ready',
    label: 'Listo para Entrega',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    dotClass: 'bg-purple-500',
    description: 'Empaquetado y listo para retiro en punto o salida a reparto.',
    priorityOrder: 2,
  },
  delivered: {
    status: 'delivered',
    category: 'completed',
    label: 'Entregado',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
    dotClass: 'bg-stone-400',
    description: 'Entregado al cliente satisfactoriamente.',
    priorityOrder: 5,
  },
  cancelled: {
    status: 'cancelled',
    category: 'cancelled',
    label: 'Cancelado',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
    description: 'Pedido cancelado.',
    priorityOrder: 6,
  },
  rejected: {
    status: 'rejected',
    category: 'rejected',
    label: 'Rechazado',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
    description: 'Pedido rechazado por el taller.',
    priorityOrder: 6,
  },
};

export function getOperationalStatusMeta(status: string | null | undefined): OperationalStatusMeta {
  if (status && status in OPERATIONAL_STATUS_MAP) {
    return OPERATIONAL_STATUS_MAP[status as CanonicalOrderStatus];
  }
  return {
    status: 'pending_approval',
    category: 'needs_attention',
    label: status || 'Desconocido',
    badgeClass: 'bg-stone-50 text-stone-600 border-stone-200',
    dotClass: 'bg-stone-400',
    description: 'Estado no identificado.',
    priorityOrder: 99,
  };
}
