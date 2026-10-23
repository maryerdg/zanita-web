/**
 * Derived Payment Status for Zanita Orders
 *
 * In 8E.1, payment status is strictly DERIVED from canonical financial fields:
 * - total_amount_cents
 * - amount_paid_cents
 * - deposit_required_pct
 *
 * It is strictly READ-ONLY in 8E.1. No automatic or bypass mutations.
 */

import { calculateRequiredDepositCents } from './transitions';

export type DerivedPaymentStatus =
  | 'unpaid'
  | 'partially_paid'
  | 'deposit_covered'
  | 'paid'
  | 'free';

export interface PaymentStatusMeta {
  status: DerivedPaymentStatus;
  label: string;
  badgeClass: string;
  detail: string;
  amountPaidPesos: number;
  totalPesos: number;
  remainingPesos: number;
  requiredDepositPesos: number;
  isFullyPaid: boolean;
  isDepositCovered: boolean;
}

export function derivePaymentStatus(
  totalAmountCents: number = 0,
  amountPaidCents: number = 0,
  depositRequiredPct?: number | null
): PaymentStatusMeta {
  const total = Math.max(0, totalAmountCents);
  const paid = Math.max(0, amountPaidCents);
  const remaining = Math.max(0, total - paid);
  const requiredDeposit = calculateRequiredDepositCents(total, depositRequiredPct);

  const totalPesos = total / 100;
  const paidPesos = paid / 100;
  const remainingPesos = remaining / 100;
  const requiredDepositPesos = requiredDeposit / 100;

  // Case 1: Total is 0
  if (total === 0) {
    return {
      status: 'free',
      label: 'Sin costo',
      badgeClass: 'bg-stone-50 text-stone-700 border-stone-200',
      detail: 'Pedido sin cargo monetario',
      amountPaidPesos: 0,
      totalPesos: 0,
      remainingPesos: 0,
      requiredDepositPesos: 0,
      isFullyPaid: true,
      isDepositCovered: true,
    };
  }

  // Case 2: Fully paid (amount_paid >= total)
  if (paid >= total) {
    return {
      status: 'paid',
      label: 'Liquidado',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      detail: `$${paidPesos.toFixed(2)} MXN pagado`,
      amountPaidPesos: paidPesos,
      totalPesos,
      remainingPesos: 0,
      requiredDepositPesos,
      isFullyPaid: true,
      isDepositCovered: true,
    };
  }

  // Case 3: Deposit met or exceeded, but not fully paid (amount_paid >= required_deposit AND amount_paid < total)
  if (paid >= requiredDeposit && paid > 0) {
    return {
      status: 'deposit_covered',
      label: 'Anticipo cubierto · saldo pendiente',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      detail: `Pagado $${paidPesos.toFixed(2)} (Resta $${remainingPesos.toFixed(2)} MXN)`,
      amountPaidPesos: paidPesos,
      totalPesos,
      remainingPesos,
      requiredDepositPesos,
      isFullyPaid: false,
      isDepositCovered: true,
    };
  }

  // Case 4: Partial payment below deposit threshold (0 < amount_paid < required_deposit)
  if (paid > 0 && paid < requiredDeposit) {
    const missingForDepositPesos = (requiredDeposit - paid) / 100;
    return {
      status: 'partially_paid',
      label: 'Pago parcial',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
      detail: `Pagado $${paidPesos.toFixed(2)} (Faltan $${missingForDepositPesos.toFixed(2)} para anticipo)`,
      amountPaidPesos: paidPesos,
      totalPesos,
      remainingPesos,
      requiredDepositPesos,
      isFullyPaid: false,
      isDepositCovered: false,
    };
  }

  // Case 5: Zero paid (amount_paid == 0)
  return {
    status: 'unpaid',
    label: 'Pendiente de pago',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    detail: `Pendiente: $${totalPesos.toFixed(2)} MXN`,
    amountPaidPesos: 0,
    totalPesos,
    remainingPesos: totalPesos,
    requiredDepositPesos,
    isFullyPaid: false,
    isDepositCovered: false,
  };
}
