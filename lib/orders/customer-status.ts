/**
 * Customer-Facing Order Status Mapping
 *
 * Translates canonical database order statuses and financial values
 * into clear, reassuring, and customer-friendly labels, descriptions,
 * and stepper progress indices.
 *
 * Separates ORDER STATUS from PAYMENT STATUS.
 */

import type { CanonicalOrderStatus } from './operational-status';
import { derivePaymentStatus, type PaymentStatusMeta } from './payment-status';

export interface CustomerStatusMeta {
  status: CanonicalOrderStatus;
  title: string;
  badgeLabel: string;
  badgeClass: string;
  description: string;
  nextStepText: string;
  stepIndex: number; // 1: Recibido, 2: Aprobado/Pago, 3: Preparación, 4: Listo/Entregado
  isTerminal: boolean;
  isNegative: boolean;
}

export const CUSTOMER_STATUS_MAP: Record<CanonicalOrderStatus, CustomerStatusMeta> = {
  pending_approval: {
    status: 'pending_approval',
    title: 'Pedido recibido',
    badgeLabel: 'En revisión',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Recibimos tu pedido y lo estamos revisando. Confirmaremos disponibilidad y fecha solicitada.',
    nextStepText: 'Estamos revisando tu pedido. Te mostraremos aquí la aprobación para continuar.',
    stepIndex: 1,
    isTerminal: false,
    isNegative: false,
  },
  deposit_pending: {
    status: 'deposit_pending',
    title: 'Pedido aprobado',
    badgeLabel: 'Pendiente de pago',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    description: 'Tu pedido fue aprobado. El siguiente paso es realizar tu pago para que podamos confirmarlo.',
    nextStepText: 'Tu pedido fue aprobado. Realiza tu transferencia con los datos bancarios y confírmala para programar la preparación.',
    stepIndex: 2,
    isTerminal: false,
    isNegative: false,
  },
  confirmed: {
    status: 'confirmed',
    title: 'Pedido confirmado',
    badgeLabel: 'Programado para preparación',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    description: 'Tu pago fue confirmado y tu pedido quedó programado para preparación.',
    nextStepText: 'Tu pedido ya está agendado para tu fecha y horario. Te mostraremos aquí cuando entre a cocina.',
    stepIndex: 2,
    isTerminal: false,
    isNegative: false,
  },
  preparing: {
    status: 'preparing',
    title: 'En preparación',
    badgeLabel: 'En cocina',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    description: 'Estamos preparando tu pedido para que esté listo en la fecha programada.',
    nextStepText: 'Estamos elaborando tu pedido. Te avisaremos en cuanto esté listo para entrega.',
    stepIndex: 3,
    isTerminal: false,
    isNegative: false,
  },
  ready: {
    status: 'ready',
    title: 'Listo para entrega',
    badgeLabel: 'Listo para entrega / pickup',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    description: 'Tu pedido está empacado y listo para ser entregado o retirado.',
    nextStepText: 'Tu pedido te espera en el punto acordado en tu horario programado.',
    stepIndex: 4,
    isTerminal: false,
    isNegative: false,
  },
  delivered: {
    status: 'delivered',
    title: 'Entregado',
    badgeLabel: 'Entregado',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
    description: 'Tu pedido ha sido entregado exitosamente. ¡Gracias por elegir Zanita!',
    nextStepText: 'Pedido concluido. ¡Esperamos que lo disfrutes!',
    stepIndex: 4,
    isTerminal: true,
    isNegative: false,
  },
  rejected: {
    status: 'rejected',
    title: 'Pedido no aprobado',
    badgeLabel: 'No aprobado',
    badgeClass: 'bg-red-50 text-red-800 border-red-200',
    description: 'Lamentablemente no pudimos aceptar tu pedido para la fecha u horario solicitado.',
    nextStepText: 'Tu pedido no pudo ser aprobado por disponibilidad de agenda o insumos.',
    stepIndex: 0,
    isTerminal: true,
    isNegative: true,
  },
  cancelled: {
    status: 'cancelled',
    title: 'Pedido cancelado',
    badgeLabel: 'Cancelado',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    description: 'Este pedido ha sido cancelado.',
    nextStepText: 'El pedido fue cancelado.',
    stepIndex: 0,
    isTerminal: true,
    isNegative: true,
  },
};

export function getCustomerStatusMeta(status: string | null | undefined): CustomerStatusMeta {
  if (status && status in CUSTOMER_STATUS_MAP) {
    return CUSTOMER_STATUS_MAP[status as CanonicalOrderStatus];
  }
  return {
    status: 'pending_approval',
    title: 'Pedido en proceso',
    badgeLabel: status || 'Pendiente',
    badgeClass: 'bg-stone-50 text-stone-700 border-stone-200',
    description: 'Estamos procesando tu pedido.',
    nextStepText: 'Estamos procesando tu pedido.',
    stepIndex: 1,
    isTerminal: false,
    isNegative: false,
  };
}

export interface CustomerOrderSummary {
  orderStatusMeta: CustomerStatusMeta;
  paymentStatusMeta: PaymentStatusMeta;
}

export function getCustomerOrderSummary(
  status: string,
  totalAmountCents: number,
  amountPaidCents: number,
  depositRequiredPct?: number | null,
  paymentReportedAt?: string | Date | null
): CustomerOrderSummary {
  return {
    orderStatusMeta: getCustomerStatusMeta(status),
    paymentStatusMeta: derivePaymentStatus(
      totalAmountCents,
      amountPaidCents,
      depositRequiredPct,
      paymentReportedAt
    ),
  };
}
