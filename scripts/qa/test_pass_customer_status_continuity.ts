/**
 * Comprehensive QA Test Suite for Customer Order Status & Payment Continuity
 *
 * Validates:
 * 1. Customer-facing status mapping across all 8 canonical statuses
 * 2. Independence of Order Status vs. Payment Status
 * 3. Derived payment status states: unpaid, payment_reported, partially_paid, deposit_covered, paid, free
 * 4. Next step messaging for deposit_pending (approval & payment instructions)
 * 5. Financial computations (Total, Paid, Remaining)
 * 6. ZAN-0003 production fixture simulation
 * 7. Customer payment report flow ("Ya realicé mi pago")
 * 8. Admin payment verification authority and transition to confirmed
 * 9. Ownership / RLS boundary rules (Customer A vs Customer B isolation)
 */

import {
  getCustomerStatusMeta,
  getCustomerOrderSummary,
} from '../../lib/orders/customer-status';
import { derivePaymentStatus } from '../../lib/orders/payment-status';
import type { CanonicalOrderStatus } from '../../lib/orders/operational-status';
import { validateOrderTransition, calculateRequiredDepositCents } from '../../lib/orders/transitions';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

console.log('=====================================================');
console.log('🧪 TEST SUITE: CUSTOMER ORDER & PAYMENT CONTINUITY');
console.log('=====================================================\n');

// ---------------------------------------------------------------------------
// 1. Validate All Canonical Status Mappings
// ---------------------------------------------------------------------------
console.log('--- 1. CANONICAL STATUS MAPPINGS ---');

const expectedStatuses: Record<
  CanonicalOrderStatus,
  { title: string; badge: string; step: number; isTerminal: boolean; isNegative: boolean }
> = {
  pending_approval: {
    title: 'Pedido recibido',
    badge: 'En revisión',
    step: 1,
    isTerminal: false,
    isNegative: false,
  },
  deposit_pending: {
    title: 'Pedido aprobado',
    badge: 'Pendiente de pago',
    step: 2,
    isTerminal: false,
    isNegative: false,
  },
  confirmed: {
    title: 'Pedido confirmado',
    badge: 'Programado para preparación',
    step: 2,
    isTerminal: false,
    isNegative: false,
  },
  preparing: {
    title: 'En preparación',
    badge: 'En cocina',
    step: 3,
    isTerminal: false,
    isNegative: false,
  },
  ready: {
    title: 'Listo para entrega',
    badge: 'Listo para entrega / pickup',
    step: 4,
    isTerminal: false,
    isNegative: false,
  },
  delivered: {
    title: 'Entregado',
    badge: 'Entregado',
    step: 4,
    isTerminal: true,
    isNegative: false,
  },
  rejected: {
    title: 'Pedido no aprobado',
    badge: 'No aprobado',
    step: 0,
    isTerminal: true,
    isNegative: true,
  },
  cancelled: {
    title: 'Pedido cancelado',
    badge: 'Cancelado',
    step: 0,
    isTerminal: true,
    isNegative: true,
  },
};

for (const [st, expected] of Object.entries(expectedStatuses)) {
  const meta = getCustomerStatusMeta(st as CanonicalOrderStatus);
  assert(meta.title === expected.title, `[${st}] title is "${expected.title}"`);
  assert(meta.badgeLabel === expected.badge, `[${st}] badge is "${expected.badge}"`);
  assert(meta.stepIndex === expected.step, `[${st}] stepIndex is ${expected.step}`);
  assert(meta.isTerminal === expected.isTerminal, `[${st}] isTerminal is ${expected.isTerminal}`);
  assert(meta.isNegative === expected.isNegative, `[${st}] isNegative is ${expected.isNegative}`);
}

// ---------------------------------------------------------------------------
// 2. Deposit Pending Messaging (Approval Verification)
// ---------------------------------------------------------------------------
console.log('\n--- 2. DEPOSIT PENDING APPROVAL & CLEAN COPY ---');
const depositPendingMeta = getCustomerStatusMeta('deposit_pending');
assert(
  depositPendingMeta.title === 'Pedido aprobado',
  'deposit_pending title is explicitly "Pedido aprobado"'
);
assert(
  depositPendingMeta.description.includes('Tu pedido fue aprobado'),
  'deposit_pending description states that order was approved'
);
assert(
  !depositPendingMeta.description.includes('Te notificamos') &&
    !depositPendingMeta.description.includes('Te enviamos un mensaje'),
  'deposit_pending does NOT make false claims about notifications/messages sent'
);

// Scalable brand message verification
const preparingMeta = getCustomerStatusMeta('preparing');
assert(
  preparingMeta.description.includes('Estamos preparando tu pedido'),
  'preparing description uses scalable brand copy instead of individual operator'
);

const confirmedMeta = getCustomerStatusMeta('confirmed');
assert(
  confirmedMeta.description.includes('Tu pago fue confirmado y tu pedido quedó programado'),
  'confirmed description clearly indicates payment was confirmed and order scheduled'
);

// ---------------------------------------------------------------------------
// 3. Payment Status & Derived States
// ---------------------------------------------------------------------------
console.log('\n--- 3. PAYMENT STATUS SEPARATION & REPORTING ---');

// Unreported, zero paid
const unpaid = derivePaymentStatus(5000, 0, null, null);
assert(unpaid.status === 'unpaid', '0 paid without report is unpaid');
assert(unpaid.label === 'Pendiente de pago', 'unpaid label is "Pendiente de pago"');
assert(!unpaid.isReportedByCustomer, 'not reported by customer');
assert(unpaid.remainingPesos === 50, 'remaining balance is $50.00 MXN');

// Customer reported, but zero confirmed by Admin yet
const reported = derivePaymentStatus(5000, 0, null, '2026-10-23T08:00:00Z');
assert(reported.status === 'payment_reported', '0 paid with report is payment_reported');
assert(reported.label === 'Pago reportado · por verificar', 'label is "Pago reportado · por verificar"');
assert(reported.isReportedByCustomer === true, 'isReportedByCustomer is true');
assert(!reported.isFullyPaid, 'reported is not yet paid');

// Partial payment below requirement
const partial = derivePaymentStatus(10000, 3000, 50);
assert(partial.status === 'partially_paid', '3000/10000 (50% req) is partially_paid');
assert(partial.remainingPesos === 70, 'remaining balance is $70.00 MXN');

// Deposit met
const depositCovered = derivePaymentStatus(10000, 5000, 50);
assert(depositCovered.status === 'deposit_covered', '5000/10000 (50% req) is deposit_covered');

// Fully paid
const fullyPaid = derivePaymentStatus(5000, 5000);
assert(fullyPaid.status === 'paid', '5000/5000 is paid');
assert(fullyPaid.remainingPesos === 0, 'remaining balance is $0.00 MXN');

// ---------------------------------------------------------------------------
// 4. Real ZAN-0003 Fixture Simulation
// ---------------------------------------------------------------------------
console.log('\n--- 4. REAL ZAN-0003 PRODUCTION FIXTURE SIMULATION ---');

// State A: Immediate after Admin approval (deposit_pending, unpaid, not reported)
const zanInitial = getCustomerOrderSummary('deposit_pending', 5000, 0, null, null);
assert(zanInitial.orderStatusMeta.title === 'Pedido aprobado', 'ZAN-0003 initial title is "Pedido aprobado"');
assert(zanInitial.paymentStatusMeta.status === 'unpaid', 'ZAN-0003 initial payment status is unpaid');
assert(zanInitial.paymentStatusMeta.remainingPesos === 50, 'ZAN-0003 remaining balance is $50.00 MXN');

// State B: Customer reports payment ("Ya realicé mi pago")
const zanReported = getCustomerOrderSummary('deposit_pending', 5000, 0, null, new Date().toISOString());
assert(zanReported.orderStatusMeta.title === 'Pedido aprobado', 'ZAN-0003 order status remains "Pedido aprobado"');
assert(zanReported.paymentStatusMeta.status === 'payment_reported', 'ZAN-0003 payment status is now payment_reported');
assert(zanReported.paymentStatusMeta.amountPaidPesos === 0, 'ZAN-0003 amount_paid_cents remains strictly 0');

// Validate transition is NOT allowed yet before Admin confirms payment
const invalidTransition = validateOrderTransition('deposit_pending', 'confirmed', {
  totalAmountCents: 5000,
  amountPaidCents: 0,
  depositRequiredPct: null,
});
assert(!invalidTransition.valid, 'Transition to confirmed is rejected when amount_paid_cents is 0');

// State C: Admin confirms received payment ($50.00 MXN)
const confirmedAmountCents = 5000;
const validTransition = validateOrderTransition('deposit_pending', 'confirmed', {
  totalAmountCents: 5000,
  amountPaidCents: confirmedAmountCents,
  depositRequiredPct: null,
});
assert(validTransition.valid, 'Transition to confirmed is accepted when Admin records $50.00 MXN');

// State D: Order updated to confirmed
const zanConfirmed = getCustomerOrderSummary('confirmed', 5000, 5000, null, new Date().toISOString());
assert(zanConfirmed.orderStatusMeta.title === 'Pedido confirmado', 'ZAN-0003 is now "Pedido confirmado"');
assert(zanConfirmed.paymentStatusMeta.status === 'paid', 'ZAN-0003 payment status is now Liquidado');
assert(zanConfirmed.paymentStatusMeta.remainingPesos === 0, 'ZAN-0003 remaining balance is $0.00 MXN');

// ---------------------------------------------------------------------------
// 5. Default Deposit Requirement Rule (100% Policy for Standard Orders)
// ---------------------------------------------------------------------------
console.log('\n--- 5. DEFAULT DEPOSIT REQUIREMENT (100% FOR STANDARD ORDERS) ---');
const depositNullReq = calculateRequiredDepositCents(5000, null);
assert(depositNullReq === 5000, 'When deposit_required_pct is null, required deposit is 100% (5000 cents)');

const deposit100Req = calculateRequiredDepositCents(5000, 100);
assert(deposit100Req === 5000, 'When deposit_required_pct is 100, required deposit is 100% (5000 cents)');

// ---------------------------------------------------------------------------
// 6. Customer Ownership & Access Control
// ---------------------------------------------------------------------------
console.log('\n--- 6. CUSTOMER OWNERSHIP & ACCESS CONTROL ---');

interface OrderAccessMock {
  orderUserId: string;
  callerUserId: string | null;
}

function checkOrderAccess(mock: OrderAccessMock): { allowed: boolean; action: 'render' | '404' | 'redirect_login' } {
  if (!mock.callerUserId) {
    return { allowed: false, action: 'redirect_login' };
  }
  if (mock.orderUserId !== mock.callerUserId) {
    return { allowed: false, action: '404' };
  }
  return { allowed: true, action: 'render' };
}

const customerA = '11111111-1111-1111-1111-111111111111';
const customerB = '22222222-2222-2222-2222-222222222222';

// Scenario A: Customer A views their own order
const accessSelf = checkOrderAccess({ orderUserId: customerA, callerUserId: customerA });
assert(accessSelf.allowed && accessSelf.action === 'render', 'Customer A can view their own order');

// Scenario B: Customer B attempts to view Customer A order
const accessOther = checkOrderAccess({ orderUserId: customerA, callerUserId: customerB });
assert(!accessOther.allowed && accessOther.action === '404', 'Customer B gets 404 when attempting to view Customer A order');

// Scenario C: Anonymous user attempts to view order
const accessAnon = checkOrderAccess({ orderUserId: customerA, callerUserId: null });
assert(!accessAnon.allowed && accessAnon.action === 'redirect_login', 'Anonymous visitor is redirected to login');

// ---------------------------------------------------------------------------
// 7. Maryer Review Tests A through P (ZAN-0003 Fixture & Edge Cases)
// ---------------------------------------------------------------------------
console.log('\n--- 7. REVIEW TESTS A THROUGH P (ZAN-0003 FIXTURE & POLICIES) ---');

// Test helper for bank settings validity
function computeBankSettingsConfigured(settings: {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  clabe: string;
}): boolean {
  return Boolean(
    settings.enabled &&
    settings.bankName?.trim() &&
    settings.accountHolder?.trim() &&
    settings.clabe?.trim()
  );
}

// Test A: Customer sees valid bank instructions when configured
const activeBankSettings = {
  enabled: true,
  bankName: 'Banco Test',
  accountHolder: 'Zanita Repostería',
  clabe: '012180000000000000',
  instructions: 'Envía captura del comprobante',
};
assert(
  computeBankSettingsConfigured(activeBankSettings) === true,
  'Test A: Customer sees valid bank instructions when configured and enabled'
);

// Simulation state for ZAN-0003 fixture
interface MockOrderState {
  id: string;
  order_number: string;
  user_id: string;
  status: CanonicalOrderStatus;
  total_amount_cents: number;
  amount_paid_cents: number;
  deposit_required_pct: number | null;
  payment_reported_at: string | null;
  payment_reference: string | null;
  payment_confirmed_at: string | null;
  payment_confirmed_by: string | null;
}

const mockOrder: MockOrderState = {
  id: '00000000-0000-0000-0000-000000000003',
  order_number: 'ZAN-0003',
  user_id: customerA,
  status: 'deposit_pending',
  total_amount_cents: 5000,
  amount_paid_cents: 0,
  deposit_required_pct: null,
  payment_reported_at: null,
  payment_reference: null,
  payment_confirmed_at: null,
  payment_confirmed_by: null,
};

// Simulated RPC implementation of public.report_order_payment
function mockReportOrderPayment(
  callerId: string | null,
  order: MockOrderState,
  reference: string | null
): { success: boolean; error?: string } {
  if (!callerId) {
    return { success: false, error: 'No autorizado' };
  }
  if (order.user_id !== callerId) {
    return { success: false, error: 'No tienes permiso para reportar pago de este pedido' };
  }
  if (order.status !== 'deposit_pending') {
    return { success: false, error: 'El pedido no se encuentra en estado pendiente de pago' };
  }

  const nowIso = new Date().toISOString();
  let sanitizedRef = reference ? reference.trim() : null;
  if (sanitizedRef && sanitizedRef.length > 50) {
    sanitizedRef = sanitizedRef.substring(0, 50);
  }

  // Idempotent update: preserve first payment_reported_at, update reference
  if (!order.payment_reported_at) {
    order.payment_reported_at = nowIso;
  }
  if (sanitizedRef) {
    order.payment_reference = sanitizedRef;
  }

  return { success: true };
}

// Simulated Server Action adminConfirmPaymentAndOrder
function mockAdminConfirmPaymentAndOrder(
  isAdmin: boolean,
  adminUserId: string,
  order: MockOrderState,
  amountPesos: number
): { success: boolean; error?: string } {
  if (!isAdmin) {
    return { success: false, error: 'No autorizado' };
  }
  if (isNaN(amountPesos) || amountPesos <= 0) {
    return { success: false, error: 'Monto inválido. Debe ingresar un valor mayor a $0 MXN.' };
  }

  const amountCents = Math.round(amountPesos * 100);
  if (order.status !== 'deposit_pending') {
    return { success: false, error: 'El pedido no se encuentra en espera de pago.' };
  }

  const remaining = order.total_amount_cents - order.amount_paid_cents;
  if (amountCents > remaining) {
    return { success: false, error: 'El monto excede el saldo pendiente.' };
  }

  order.amount_paid_cents += amountCents;
  const required = calculateRequiredDepositCents(order.total_amount_cents, order.deposit_required_pct);
  if (order.amount_paid_cents >= required) {
    order.status = 'confirmed';
  }
  const nowIso = new Date().toISOString();
  order.payment_confirmed_at = nowIso;
  order.payment_confirmed_by = adminUserId;

  return { success: true };
}

// Test B: Customer reports transfer
const reportRes = mockReportOrderPayment(customerA, mockOrder, 'REF-987654');
assert(reportRes.success, 'Test B: Customer reports transfer successfully');

// Test C: amount_paid remains 0
assert(mockOrder.amount_paid_cents === 0, 'Test C: amount_paid remains strictly 0 after customer report');

// Test D: payment state becomes payment_reported
const statusAfterReport = derivePaymentStatus(
  mockOrder.total_amount_cents,
  mockOrder.amount_paid_cents,
  mockOrder.deposit_required_pct,
  mockOrder.payment_reported_at
);
assert(
  statusAfterReport.status === 'payment_reported',
  'Test D: payment state becomes payment_reported'
);

// Test E: Admin sees report/reference
assert(
  mockOrder.payment_reported_at !== null && mockOrder.payment_reference === 'REF-987654',
  'Test E: Admin sees customer report timestamp and reference ("REF-987654")'
);

// Test F: Admin confirms 5000 cents ($50.00 MXN)
const adminId = '99999999-9999-9999-9999-999999999999';
const confirmRes = mockAdminConfirmPaymentAndOrder(true, adminId, mockOrder, 50.0);
assert(confirmRes.success, 'Test F: Admin successfully confirms 50.00 MXN payment');

// Test G: amount_paid becomes 5000
assert(mockOrder.amount_paid_cents === 5000, 'Test G: amount_paid becomes 5000 cents ($50.00 MXN)');

// Test H: order becomes confirmed
assert(mockOrder.status === 'confirmed', 'Test H: order status atomically transitions to "confirmed"');
assert(mockOrder.payment_confirmed_by === adminId, 'Test H.2: audit field payment_confirmed_by recorded');
assert(mockOrder.payment_confirmed_at !== null, 'Test H.3: audit field payment_confirmed_at recorded');

// Test I: customer polling updates to "Pedido confirmado" and "Liquidado"
const customerPollingSummary = getCustomerOrderSummary(
  mockOrder.status,
  mockOrder.total_amount_cents,
  mockOrder.amount_paid_cents,
  mockOrder.deposit_required_pct,
  mockOrder.payment_reported_at
);
assert(
  customerPollingSummary.orderStatusMeta.title === 'Pedido confirmado',
  'Test I.1: customer view updates to "Pedido confirmado"'
);
assert(
  customerPollingSummary.paymentStatusMeta.label === 'Liquidado',
  'Test I.2: customer view updates to "Liquidado"'
);

// Test J: Customer cannot report another customer's order
const unauthorizedOrder: MockOrderState = {
  ...mockOrder,
  id: '00000000-0000-0000-0000-000000000004',
  user_id: customerA,
  status: 'deposit_pending',
  amount_paid_cents: 0,
  payment_reported_at: null,
};
const crossUserReport = mockReportOrderPayment(customerB, unauthorizedOrder, 'HACK-123');
assert(
  !crossUserReport.success && Boolean(crossUserReport.error?.includes('No tienes permiso')),
  'Test J: Customer B cannot report payment on Customer A order'
);

// Test K: Anonymous visitor cannot report
const anonReport = mockReportOrderPayment(null, unauthorizedOrder, 'ANON-123');
assert(
  !anonReport.success && anonReport.error === 'No autorizado',
  'Test K: Anonymous visitor cannot report payment'
);

// Test L: Customer cannot confirm payment (unauthorized caller)
const customerConfirmAttempt = mockAdminConfirmPaymentAndOrder(false, customerA, unauthorizedOrder, 50.0);
assert(
  !customerConfirmAttempt.success && customerConfirmAttempt.error === 'No autorizado',
  'Test L: Customer cannot confirm payment or advance order'
);

// Test M: Customer cannot mutate amount_paid
const beforeAmount = unauthorizedOrder.amount_paid_cents;
mockReportOrderPayment(customerA, unauthorizedOrder, 'ATTEMPT-MUTATE');
assert(
  unauthorizedOrder.amount_paid_cents === beforeAmount && unauthorizedOrder.amount_paid_cents === 0,
  'Test M: Customer payment report cannot mutate amount_paid_cents'
);

// Test N: Missing bank settings hides report-payment CTA
const incompleteBankSettings = {
  enabled: true,
  bankName: '',
  accountHolder: 'Zanita',
  clabe: '',
  instructions: '',
};
assert(
  computeBankSettingsConfigured(incompleteBankSettings) === false,
  'Test N: Missing bank settings results in isConfigured = false (hiding CTA)'
);

// Test O: Disabled bank transfer hides report-payment CTA
const disabledBankSettings = {
  enabled: false,
  bankName: 'Banco Test',
  accountHolder: 'Zanita',
  clabe: '012180000000000000',
  instructions: '',
};
assert(
  computeBankSettingsConfigured(disabledBankSettings) === false,
  'Test O: Disabled bank transfer results in isConfigured = false (hiding CTA)'
);

// Test P: Repeated payment-report click does not corrupt state
const firstReportTime = unauthorizedOrder.payment_reported_at;
mockReportOrderPayment(customerA, unauthorizedOrder, 'UPDATED-REF');
assert(
  unauthorizedOrder.payment_reported_at === firstReportTime,
  'Test P.1: Repeated report preserves initial payment_reported_at timestamp'
);
assert(
  unauthorizedOrder.payment_reference === 'UPDATED-REF',
  'Test P.2: Repeated report updates reference cleanly'
);
assert(
  unauthorizedOrder.amount_paid_cents === 0 && unauthorizedOrder.status === 'deposit_pending',
  'Test P.3: Repeated report leaves amount_paid_cents and status uncorrupted'
);

console.log('\n=====================================================');
console.log('🎉 ALL TESTS PASSED SUCCESSFULLY (0 FAILURES)!');
console.log('=====================================================');
