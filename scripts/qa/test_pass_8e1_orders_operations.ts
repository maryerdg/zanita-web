/**
 * Automated Verification Suite for Phase 8E.1A — Orders Operations Center V1
 *
 * Runs against the local Supabase instance.
 * Verifies:
 * 1. Operational metrics calculation (Today in Tijuana)
 * 2. Corrected payment label semantics (Unpaid, Partial below deposit, Deposit covered, Liquidated, Free)
 * 3. Authoritative order lifecycle state machine & payment-bypass prevention
 * 4. Local QA seeded orders audit (ZAN-0101 to ZAN-0109)
 * 5. Security regression with real auth contexts (Admin, Customer, Anon)
 * 6. Customer checkout creation regression via public.submit_order RPC
 */

import { createClient } from '@supabase/supabase-js';
import { validateOrderTransition, calculateRequiredDepositCents } from '../../lib/orders/transitions';
import { derivePaymentStatus } from '../../lib/orders/payment-status';
import {
  getTijuanaDateString,
  isTijuanaToday,
  formatDateLong,
  formatDateCompact,
} from '../../lib/time/tijuana';
import crypto from 'crypto';

const LOCAL_URL = 'http://127.0.0.1:54321';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function runTests() {
  console.log('=== TEST PASS 8E.1C: ORDERS OPERATIONS REVIEW GATE ===\n');

  const supabaseAdmin = createClient(LOCAL_URL, SERVICE_KEY);
  const supabaseAnon = createClient(LOCAL_URL, ANON_KEY);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: TIMEZONE & DATE-ONLY FORMATTING REGRESSION (CALENDAR DATES)
  // --------------------------------------------------------------------------
  console.log('1. Timezone & Date-Only Formatting Regression');
  const tijuanaToday = getTijuanaDateString();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(tijuanaToday), `Tijuana today format is YYYY-MM-DD: ${tijuanaToday}`);
  assert(isTijuanaToday(tijuanaToday), `isTijuanaToday("${tijuanaToday}") is true`);
  assert(!isTijuanaToday('2026-01-01'), 'isTijuanaToday("2026-01-01") is false');

  // Exact calendar date formatting tests independent of runtime timezone
  assert(
    formatDateLong('2026-10-13') === 'martes, 13 de octubre de 2026',
    '2026-10-13 -> martes, 13 de octubre de 2026'
  );
  assert(
    formatDateLong('2026-01-01') === 'jueves, 1 de enero de 2026',
    '2026-01-01 -> jueves, 1 de enero de 2026'
  );
  assert(
    formatDateLong('2026-07-04') === 'sábado, 4 de julio de 2026',
    '2026-07-04 -> sábado, 4 de julio de 2026'
  );
  assert(
    formatDateCompact('2026-10-13') === 'mar, 13 oct',
    '2026-10-13 -> mar, 13 oct'
  );

  // --------------------------------------------------------------------------
  // TEST 2: CORRECTED PAYMENT LABEL SEMANTICS
  // --------------------------------------------------------------------------
  console.log('\n2. Corrected Payment Label Semantics');

  // A. $0 paid -> Pendiente de pago
  const p1 = derivePaymentStatus(10000, 0, 50);
  assert(
    p1.status === 'unpaid' && p1.label === 'Pendiente de pago' && !p1.isFullyPaid && !p1.isDepositCovered,
    '$0 paid -> Pendiente de pago (unpaid)'
  );

  // B. Partial below deposit threshold -> Pago parcial
  const p2 = derivePaymentStatus(10000, 2000, 50); // requires 5000 cents ($50), paid 2000 ($20)
  assert(
    p2.status === 'partially_paid' && p2.label === 'Pago parcial' && !p2.isDepositCovered,
    'Partial below deposit -> Pago parcial (partially_paid)'
  );

  // C. Deposit exactly met -> Anticipo cubierto · saldo pendiente
  const p3 = derivePaymentStatus(10000, 5000, 50); // requires 5000, paid 5000
  assert(
    p3.status === 'deposit_covered' && p3.label === 'Anticipo cubierto · saldo pendiente' && p3.isDepositCovered && !p3.isFullyPaid,
    'Deposit exactly met -> Anticipo cubierto · saldo pendiente (deposit_covered)'
  );

  // D. Deposit exceeded but not fully paid -> Anticipo cubierto · saldo pendiente
  const p4 = derivePaymentStatus(10000, 7500, 50); // requires 5000, paid 7500
  assert(
    p4.status === 'deposit_covered' && p4.label === 'Anticipo cubierto · saldo pendiente' && p4.isDepositCovered && !p4.isFullyPaid,
    'Deposit exceeded but not full -> Anticipo cubierto · saldo pendiente'
  );

  // E. Fully paid -> Liquidado
  const p5 = derivePaymentStatus(10000, 10000, 50);
  assert(
    p5.status === 'paid' && p5.label === 'Liquidado' && p5.isFullyPaid && p5.isDepositCovered,
    'Fully paid -> Liquidado (paid)'
  );

  // F. Zero-cost order -> Sin costo
  const p6 = derivePaymentStatus(0, 0);
  assert(
    p6.status === 'free' && p6.label === 'Sin costo' && p6.isFullyPaid && p6.isDepositCovered,
    'Zero-cost order -> Sin costo (free)'
  );

  // G. Deposit calculation helper consistency
  assert(calculateRequiredDepositCents(10000, 50) === 5000, 'calculateRequiredDepositCents matches 50% deposit');
  assert(calculateRequiredDepositCents(10000, null) === 10000, 'calculateRequiredDepositCents defaults to 100% when null');

  // --------------------------------------------------------------------------
  // TEST 3: CANONICAL STATE MACHINE & PAYMENT BYPASS GUARDS
  // --------------------------------------------------------------------------
  console.log('\n3. Canonical State Machine & Payment Bypass Guards');

  // A. Bypass attempt: pending_approval -> confirmed on order with cost > 0
  const bypassAttempt = validateOrderTransition('pending_approval', 'confirmed', {
    totalAmountCents: 10000,
    amountPaidCents: 0,
  });
  assert(
    !bypassAttempt.valid,
    'Blocked direct jump from pending_approval to confirmed on order with cost'
  );

  // B. Disallowed: pending_approval -> confirmed even on zero-cost order (no unproven bypass)
  const zeroCostApprove = validateOrderTransition('pending_approval', 'confirmed', {
    totalAmountCents: 0,
    amountPaidCents: 0,
  });
  assert(
    !zeroCostApprove.valid,
    'Blocked direct jump from pending_approval to confirmed on zero-cost order (canonical path is deposit_pending)'
  );

  // C. Allowed: pending_approval -> deposit_pending (approval awaiting payment)
  const normalApprove = validateOrderTransition('pending_approval', 'deposit_pending', {
    totalAmountCents: 10000,
    amountPaidCents: 0,
  });
  assert(normalApprove.valid, 'Allowed pending_approval -> deposit_pending');

  // D. Allowed: pending_approval -> rejected
  const rejectOrder = validateOrderTransition('pending_approval', 'rejected', {
    totalAmountCents: 10000,
    amountPaidCents: 0,
  });
  assert(rejectOrder.valid, 'Allowed pending_approval -> rejected');

  // E. Bypass attempt: deposit_pending -> confirmed when UNPAID
  const unpaidConfirmAttempt = validateOrderTransition('deposit_pending', 'confirmed', {
    totalAmountCents: 10000,
    amountPaidCents: 0,
    depositRequiredPct: 50,
  });
  assert(
    !unpaidConfirmAttempt.valid,
    'Blocked deposit_pending -> confirmed when payment is below threshold'
  );

  // F. Bypass attempt: deposit_pending -> confirmed with partial payment BELOW deposit
  const partialBelowConfirmAttempt = validateOrderTransition('deposit_pending', 'confirmed', {
    totalAmountCents: 10000,
    amountPaidCents: 2000,
    depositRequiredPct: 50,
  });
  assert(
    !partialBelowConfirmAttempt.valid,
    'Blocked deposit_pending -> confirmed when partial payment is below deposit'
  );

  // G. Allowed: deposit_pending -> confirmed when payment threshold met
  const paidConfirm = validateOrderTransition('deposit_pending', 'confirmed', {
    totalAmountCents: 10000,
    amountPaidCents: 5000,
    depositRequiredPct: 50,
  });
  assert(paidConfirm.valid, 'Allowed deposit_pending -> confirmed when deposit threshold met');

  // H. Downstream lifecycle transitions
  assert(
    validateOrderTransition('confirmed', 'preparing', { totalAmountCents: 10000, amountPaidCents: 10000 }).valid,
    'Allowed confirmed -> preparing'
  );
  assert(
    validateOrderTransition('preparing', 'ready', { totalAmountCents: 10000, amountPaidCents: 10000 }).valid,
    'Allowed preparing -> ready'
  );
  assert(
    validateOrderTransition('ready', 'delivered', { totalAmountCents: 10000, amountPaidCents: 10000 }).valid,
    'Allowed ready -> delivered'
  );

  // I. Invalid jump: delivered -> pending_approval
  assert(
    !validateOrderTransition('delivered', 'pending_approval', { totalAmountCents: 10000, amountPaidCents: 10000 }).valid,
    'Blocked backward transition from delivered -> pending_approval'
  );

  // --------------------------------------------------------------------------
  // TEST 4: LOCAL QA SEEDED ORDERS AUDIT (ZAN-0101 TO ZAN-0109)
  // --------------------------------------------------------------------------
  console.log('\n4. Local QA Seeded Orders Audit');
  const { data: qaOrders, error: qaErr } = await supabaseAdmin
    .from('zanita_orders')
    .select('order_number, status, total_amount_cents, amount_paid_cents, requested_date, requested_time, items:zanita_order_items(id, product_name_snapshot, quantity, options:zanita_order_item_options(id, option_name_snapshot))')
    .order('order_number');

  assert(!qaErr && (qaOrders || []).length >= 9, `Found ${(qaOrders || []).length} seeded orders in local DB`);

  const o101 = qaOrders?.find((o) => o.order_number === 'ZAN-0101');
  assert(o101?.status === 'pending_approval', 'ZAN-0101 has status pending_approval (official point: Alba Roja)');

  const o102 = qaOrders?.find((o) => o.order_number === 'ZAN-0102');
  assert(o102?.status === 'pending_approval', 'ZAN-0102 has status pending_approval (home delivery requiring quote)');

  const o103 = qaOrders?.find((o) => o.order_number === 'ZAN-0103');
  assert(o103?.status === 'deposit_pending', 'ZAN-0103 has status deposit_pending (Pickup CETYS)');

  const o104 = qaOrders?.find((o) => o.order_number === 'ZAN-0104');
  assert(o104?.status === 'confirmed', 'ZAN-0104 has status confirmed (to prepare)');
  assert((o104?.items?.length || 0) >= 2, 'ZAN-0104 is multi-item');
  const hasOptions = o104?.items?.some((it: { options?: unknown[] }) => (it.options?.length || 0) > 0);
  assert(Boolean(hasOptions), 'ZAN-0104 is customized with options');

  const o105 = qaOrders?.find((o) => o.order_number === 'ZAN-0105');
  assert(o105?.status === 'preparing', 'ZAN-0105 has status preparing (Pickup CETYS)');

  const o106 = qaOrders?.find((o) => o.order_number === 'ZAN-0106');
  assert(o106?.status === 'ready', 'ZAN-0106 has status ready (Pickup CETYS)');

  const o107 = qaOrders?.find((o) => o.order_number === 'ZAN-0107');
  assert(o107?.status === 'delivered', 'ZAN-0107 has status delivered');

  const o108 = qaOrders?.find((o) => o.order_number === 'ZAN-0108');
  assert(o108?.status === 'confirmed', 'ZAN-0108 has status confirmed (upcoming future order)');

  const o109 = qaOrders?.find((o) => o.order_number === 'ZAN-0109');
  assert(o109?.status === 'rejected', 'ZAN-0109 has status rejected');

  // Operational metrics assertions for today in Tijuana
  const todayActiveOrders = (qaOrders || []).filter(
    (o) => o.requested_date === tijuanaToday && !['cancelled', 'rejected'].includes(o.status)
  );
  assert(todayActiveOrders.length === 6, 'Operational metrics: Pedidos Hoy count is exactly 6');

  const scheduledTotalCents = todayActiveOrders.reduce((sum, o) => sum + (o.total_amount_cents || 0), 0);
  assert(scheduledTotalCents === 83500, `Operational metrics: Total Programado Hoy is exactly 83500 cents ($835.00 MXN), got ${scheduledTotalCents}`);

  const toPrepareCount = (qaOrders || []).filter(
    (o) => o.status === 'confirmed' && o.requested_date <= tijuanaToday && !['cancelled', 'rejected'].includes(o.status)
  ).length;
  assert(toPrepareCount === 1, 'Operational metrics: Por Preparar count is exactly 1 (ZAN-0104)');

  const readyCount = todayActiveOrders.filter((o) => o.status === 'ready').length;
  assert(readyCount === 1, 'Operational metrics: Listos count is exactly 1 (ZAN-0106)');

  const pendingApprovalCount = (qaOrders || []).filter((o) => o.status === 'pending_approval').length;
  assert(pendingApprovalCount === 2, 'Operational metrics: Por Aprobar count is exactly 2 (ZAN-0101, ZAN-0102)');

  // --------------------------------------------------------------------------
  // TEST 5: REAL AUTH CONTEXT SECURITY REGRESSION (ADMIN, CUSTOMER, ANON)
  // --------------------------------------------------------------------------
  console.log('\n5. Real Auth Context Security Regression');

  // A. Anonymous client
  const { data: anonOrders } = await supabaseAnon.from('zanita_orders').select('id');
  assert((anonOrders || []).length === 0, 'ANON: receives 0 orders from public.zanita_orders');

  const { error: anonUpdateErr } = await supabaseAnon
    .from('zanita_orders')
    .update({ status: 'delivered' })
    .eq('order_number', 'ZAN-0101');
  assert(Boolean(anonUpdateErr), 'ANON: cannot UPDATE zanita_orders (permission denied)');

  // B. Customer client (cliente@zanita.mx)
  const supabaseCustomer = createClient(LOCAL_URL, ANON_KEY);
  const { error: custSignInErr } = await supabaseCustomer.auth.signInWithPassword({
    email: 'cliente@zanita.mx',
    password: 'Cliente123!',
  });
  assert(!custSignInErr, 'CUSTOMER: signed in successfully as cliente@zanita.mx');

  // Customer cannot update orders
  const { data: custUpdateData, error: custUpdateErr } = await supabaseCustomer
    .from('zanita_orders')
    .update({ status: 'delivered' })
    .eq('order_number', 'ZAN-0103') // ZAN-0103 belongs to Ximena Diaz
    .select();
  assert(
    custUpdateErr !== null || (custUpdateData || []).length === 0,
    'CUSTOMER: direct UPDATE on another customer order affects 0 rows (RLS prevented)'
  );

  const { data: custSelfUpdateData } = await supabaseCustomer
    .from('zanita_orders')
    .update({ status: 'confirmed' })
    .eq('order_number', 'ZAN-0101') // Own order
    .select();
  assert(
    (custSelfUpdateData || []).length === 0,
    'CUSTOMER: direct UPDATE on own order status affects 0 rows (only admin can UPDATE status)'
  );

  // C. Admin client (admin@zanita.mx)
  const supabaseAdminUser = createClient(LOCAL_URL, ANON_KEY);
  const { error: adminSignInErr } = await supabaseAdminUser.auth.signInWithPassword({
    email: 'admin@zanita.mx',
    password: 'AdminPassword123!',
  });
  assert(!adminSignInErr, 'ADMIN: signed in successfully as admin@zanita.mx');

  // Admin can select orders
  const { data: adminOrders, error: adminSelectErr } = await supabaseAdminUser
    .from('zanita_orders')
    .select('order_number');
  assert(!adminSelectErr && (adminOrders || []).length >= 9, `ADMIN: can select all ${(adminOrders || []).length} orders`);

  // Admin can execute allowed transition via direct RLS update
  const { data: adminUpdateRes, error: adminUpdateErr } = await supabaseAdminUser
    .from('zanita_orders')
    .update({ status: 'preparing' })
    .eq('order_number', 'ZAN-0104')
    .select();
  assert(!adminUpdateErr && (adminUpdateRes || []).length === 1, 'ADMIN: can update order status (confirmed -> preparing)');

  // Restore ZAN-0104 back to confirmed
  await supabaseAdminUser
    .from('zanita_orders')
    .update({ status: 'confirmed' })
    .eq('order_number', 'ZAN-0104');

  // --------------------------------------------------------------------------
  // TEST 6: CUSTOMER CHECKOUT CREATION REGRESSION (via public.submit_order RPC)
  // --------------------------------------------------------------------------
  console.log('\n6. Customer Checkout Creation Regression');

  const supabaseCetysCustomer = createClient(LOCAL_URL, ANON_KEY);
  await supabaseCetysCustomer.auth.signInWithPassword({
    email: 'ximena.diaz@cetys.edu.mx',
    password: 'Cliente123!',
  });

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 2);
  while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  const futureDateStr = targetDate.toISOString().split('T')[0];

  const idempotencyKey = crypto.randomUUID();
  const checkoutPayload = {
    p_idempotency_key: idempotencyKey,
    p_customer_name: 'Ximena Diaz',
    p_customer_phone: '6649876543',
    p_customer_email: 'ximena.diaz@cetys.edu.mx',
    p_requested_date: futureDateStr,
    p_requested_time: '15:40:00',
    p_delivery_point_id: 'dddd0007-0000-0000-0000-000000000000',
    p_delivery_address: null,
    p_notes: 'QA Checkout creation regression test',
    p_items: [
      {
        product_id: 'aaaa0000-0000-0000-0000-000000000001',
        quantity: 1,
        options: [],
      },
    ],
  };

  const { data: checkoutRes, error: checkoutErr } = await supabaseCetysCustomer.rpc(
    'submit_order',
    checkoutPayload
  );

  assert(!checkoutErr && Boolean(checkoutRes?.order_id), `CUSTOMER: created order via submit_order (${checkoutRes?.order_number})`);
  assert(checkoutRes?.status === 'pending_approval', 'CUSTOMER: newly created order starts in pending_approval');

  // Verify created order in DB
  const { data: verifiedOrder } = await supabaseAdmin
    .from('zanita_orders')
    .select('id, order_number, status, items:zanita_order_items(id, product_name_snapshot)')
    .eq('id', checkoutRes?.order_id)
    .single();

  assert(Boolean(verifiedOrder && (verifiedOrder.items || []).length > 0), 'CUSTOMER: items persisted correctly in newly submitted order');

  // Clean up created regression test order
  if (checkoutRes?.order_id) {
    await supabaseAdmin.from('zanita_order_items').delete().eq('order_id', checkoutRes.order_id);
    await supabaseAdmin.from('zanita_orders').delete().eq('id', checkoutRes.order_id);
    console.log(`  [CLEANUP] Deleted temporary regression test order ${checkoutRes.order_number}`);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
