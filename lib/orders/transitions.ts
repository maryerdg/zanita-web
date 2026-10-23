/**
 * Authoritative Order Lifecycle Transition Engine
 *
 * Governs all allowed status mutations for Zanita orders.
 * Strictly enforces canonical rules and prevents payment bypasses.
 *
 * Canonical Lifecycle:
 * pending_approval -> deposit_pending -> confirmed -> preparing -> ready -> delivered
 *
 * Terminal/Branching states:
 * pending_approval -> rejected
 * Any non-terminal state -> cancelled (exceptional administrative cancellation)
 */

import type { CanonicalOrderStatus } from './operational-status';

export interface OrderTransitionContext {
  totalAmountCents: number;
  amountPaidCents: number;
  depositRequiredPct?: number | null;
  deliveryQuoteStatus?: string | null;
  deliveryRequiresQuote?: boolean;
}

export interface TransitionValidationResult {
  valid: boolean;
  error?: string;
  allowedNextStatuses: CanonicalOrderStatus[];
}

/**
 * Returns the list of theoretically allowable next statuses for a given status,
 * regardless of financial checks.
 */
export function getAllowedTransitions(currentStatus: CanonicalOrderStatus): CanonicalOrderStatus[] {
  switch (currentStatus) {
    case 'pending_approval':
      // From pending_approval, can approve (to deposit_pending), or reject.
      // There is no direct jump to confirmed.
      return ['deposit_pending', 'rejected'];

    case 'deposit_pending':
      // Waiting for payment. Can transition to confirmed once paid, or cancel
      return ['confirmed', 'cancelled'];

    case 'confirmed':
      // Ready for kitchen production
      return ['preparing', 'cancelled'];

    case 'preparing':
      // In preparation, can finish to ready
      return ['ready', 'cancelled'];

    case 'ready':
      // Packaged and waiting, can be delivered
      return ['delivered', 'cancelled'];

    case 'delivered':
    case 'cancelled':
    case 'rejected':
      // Terminal states
      return [];

    default:
      return [];
  }
}

/**
 * Authoritatively calculates required deposit in cents.
 * If depositRequiredPct is not provided, defaults to 100% of total.
 */
export function calculateRequiredDepositCents(
  totalAmountCents: number,
  depositRequiredPct?: number | null
): number {
  const total = Math.max(0, totalAmountCents);
  if (total === 0) return 0;
  const pct = depositRequiredPct ?? 100;
  return Math.round((total * pct) / 100);
}

/**
 * Authoritatively validates whether transitioning from currentStatus to requestedStatus is permitted,
 * checking both state machine graph and financial/quote prerequisites.
 */
export function validateOrderTransition(
  currentStatus: CanonicalOrderStatus,
  requestedStatus: CanonicalOrderStatus,
  context: OrderTransitionContext
): { valid: boolean; error?: string } {
  const allowed = getAllowedTransitions(currentStatus);

  if (!allowed.includes(requestedStatus)) {
    return {
      valid: false,
      error: `Transición no permitida: no se puede pasar de "${currentStatus}" a "${requestedStatus}".`,
    };
  }

  // Rule 1: Approval from pending_approval must always route to deposit_pending or rejected.
  // Direct jump to confirmed is disallowed in all cases.

  // Rule 2: Moving from deposit_pending to confirmed requires verified payment threshold
  if (currentStatus === 'deposit_pending' && requestedStatus === 'confirmed') {
    const total = Math.max(0, context.totalAmountCents);
    const paid = Math.max(0, context.amountPaidCents);

    // If total is 0, zero-cost exception applies
    if (total === 0) {
      return { valid: true };
    }

    const requiredThresholdCents = calculateRequiredDepositCents(total, context.depositRequiredPct);

    if (paid < requiredThresholdCents) {
      return {
        valid: false,
        error: `El pedido no cumple con el pago requerido para confirmación. Registrado: $${(paid / 100).toFixed(2)} MXN, requerido: $${(requiredThresholdCents / 100).toFixed(2)} MXN.`,
      };
    }
  }

  return { valid: true };
}
