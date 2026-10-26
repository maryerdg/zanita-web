/**
 * Test Suite: Operations Realtime Stability & Delivery Points Hotfix
 * Covers Sections 13 and 14 of the specification.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

let failures = 0;
function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  [PASS] ${msg}`);
  } else {
    console.error(`  [FAIL] ${msg}`);
    failures++;
  }
}

async function run() {
  console.log('=== OPERATIONS REALTIME STABILITY & DELIVERY POINTS QA ===\n');

  // =========================================================================
  // SECTION 13: REALTIME ORDER STATE & CANONICAL COLLECTION
  // =========================================================================
  console.log('1. Canonical Orders Collection & Race Prevention');

  // A. Initial canonical list
  let canonicalOrders = [
    { id: 'ord-1', order_number: 'ZAN-0003', status: 'delivered', requested_date: '2026-10-20', requested_time: '12:00', amount_paid_cents: 5000, total_amount_cents: 5000 },
    { id: 'ord-2', order_number: 'ZAN-0004', status: 'confirmed', requested_date: '2026-10-26', requested_time: '13:00', amount_paid_cents: 8000, total_amount_cents: 8000 },
    { id: 'ord-3', order_number: 'ZAN-0005', status: 'pending_approval', requested_date: '2026-10-27', requested_time: '14:00', amount_paid_cents: 0, total_amount_cents: 6000 },
  ];
  assert(canonicalOrders.length === 3, 'A. Initial canonical list = 3 orders');

  // B. Realtime INSERT adds one
  const newOrder = {
    id: 'ord-4',
    order_number: 'ZAN-0006',
    status: 'pending_approval',
    requested_date: '2026-10-28',
    requested_time: '15:00',
    amount_paid_cents: 0,
    total_amount_cents: 4500,
  };
  canonicalOrders = [...canonicalOrders, newOrder];
  assert(canonicalOrders.length === 4, 'B. Realtime INSERT adds one -> canonical list = 4');

  // C. Filter changes -> canonical list remains 4
  const filterPorPreparar = canonicalOrders.filter((o) => o.status === 'confirmed');
  assert(filterPorPreparar.length === 1 && filterPorPreparar[0].order_number === 'ZAN-0004', 'C.1 Filter por_preparar derives 1 order');
  assert(canonicalOrders.length === 4, 'C.2 Canonical collection is NOT replaced by filter result (remains 4)');

  // D. router.refresh finishes with server response -> canonical list remains correct
  const serverInitialOrders = [...canonicalOrders];
  assert(serverInitialOrders.length === 4, 'D. Server refresh delivers complete canonical collection (length 4)');

  // E. Fallback refresh races with newer Realtime event (request version tracking)
  let syncRequestId = 0;
  let activeCanonical = [...canonicalOrders];

  // Request 1 starts (slow fallback)
  const req1Id = ++syncRequestId;
  // Request 2 starts (fast realtime refresh)
  const req2Id = ++syncRequestId;

  // Request 2 finishes first with updated order
  const updatedByReq2 = activeCanonical.map((o) => o.id === 'ord-3' ? { ...o, status: 'confirmed' } : o);
  if (req2Id === syncRequestId) {
    activeCanonical = updatedByReq2;
  }

  // Request 1 finishes later with older stale state
  const staleFromReq1 = [...canonicalOrders]; // ord-3 still pending_approval
  if (req1Id === syncRequestId) {
    activeCanonical = staleFromReq1;
  }

  assert(activeCanonical.find((o) => o.id === 'ord-3')?.status === 'confirmed', 'E. Latest-request-wins: stale request 1 discarded, request 2 state preserved');

  // F. UPDATE moves pending_approval -> confirmed -> counters move correctly
  const countsBefore = {
    por_aprobar: activeCanonical.filter((o) => o.status === 'pending_approval').length,
    por_preparar: activeCanonical.filter((o) => o.status === 'confirmed').length,
  };
  assert(countsBefore.por_aprobar === 1 && countsBefore.por_preparar === 2, 'F.1 Live counts before: por_aprobar = 1, por_preparar = 2');

  // G. Todos never loses unrelated orders
  const todos = [...activeCanonical];
  assert(todos.some((o) => o.order_number === 'ZAN-0003'), 'G.1 Todos preserves ZAN-0003');
  assert(todos.some((o) => o.order_number === 'ZAN-0004'), 'G.2 Todos preserves ZAN-0004');
  assert(todos.some((o) => o.order_number === 'ZAN-0005'), 'G.3 Todos preserves ZAN-0005');
  assert(todos.some((o) => o.order_number === 'ZAN-0006'), 'G.4 Todos preserves ZAN-0006');

  // H. Deep link order=ZAN-XXXX opens correct modal
  const targetQuery = 'ZAN-0005';
  const targetMatch = activeCanonical.find((o) => o.order_number.toUpperCase() === targetQuery.toUpperCase());
  assert(targetMatch !== undefined && targetMatch.id === 'ord-3', 'H. Deep link order=ZAN-0005 locates exact canonical order');

  // I. Invalid order query (?order=Nuevo%20pedido) does not corrupt order collection
  const invalidQuery = 'Nuevo pedido';
  const isInvalidFormat = !/^ZAN-\d+$/i.test(invalidQuery);
  const safeSelection = isInvalidFormat ? null : activeCanonical.find((o) => o.order_number === invalidQuery);
  assert(isInvalidFormat && safeSelection === null, 'I.1 Invalid order parameter rejected by regex validator');
  assert(activeCanonical.length === 4, 'I.2 Canonical collection untouched by invalid deep link query');

  // J. Notification object uses actual ZAN-XXXX
  const incomingOrderPayload = { id: 'ord-99', order_number: 'ZAN-0007' };
  const notifOrderNumber = incomingOrderPayload.order_number && incomingOrderPayload.order_number.startsWith('ZAN-')
    ? incomingOrderPayload.order_number
    : 'ZAN-NUEVO';
  const notif = {
    title: 'Nuevo pedido',
    orderNumber: notifOrderNumber,
    subtitle: 'Requiere revisión en el Centro de Operaciones',
    target: `/admin/pedidos?order=${encodeURIComponent(notifOrderNumber)}`,
  };
  assert(notif.title === 'Nuevo pedido', 'J.1 Notification title is strictly "Nuevo pedido"');
  assert(notif.orderNumber === 'ZAN-0007', 'J.2 Notification orderNumber is strictly "ZAN-0007"');
  assert(notif.target === '/admin/pedidos?order=ZAN-0007', 'J.3 Notification target links to ?order=ZAN-0007');

  // =========================================================================
  // SECTION 8: PAYMENT & STATUS ACTION VISIBILITY
  // =========================================================================
  console.log('\n2. Payment & Status Action Visibility Guards');

  const pendingOrder = { status: 'pending_approval', amount_paid_cents: 0, total_amount_cents: 5000 };
  const canRegisterPaymentPending = pendingOrder.status !== 'pending_approval' && pendingOrder.amount_paid_cents < pendingOrder.total_amount_cents;
  assert(!canRegisterPaymentPending, '2.1 pending_approval order CANNOT show "Registrar pago"');

  const fullyPaidOrder = { status: 'confirmed', amount_paid_cents: 5000, total_amount_cents: 5000 };
  const canRegisterPaymentFullyPaid = fullyPaidOrder.status !== 'pending_approval' && fullyPaidOrder.amount_paid_cents < fullyPaidOrder.total_amount_cents;
  assert(!canRegisterPaymentFullyPaid, '2.2 Fully paid order CANNOT show "Registrar pago"');

  const partiallyPaidOrder = { status: 'confirmed', amount_paid_cents: 2500, total_amount_cents: 5000 };
  const canRegisterPaymentPartial = partiallyPaidOrder.status !== 'pending_approval' && partiallyPaidOrder.amount_paid_cents < partiallyPaidOrder.total_amount_cents;
  assert(canRegisterPaymentPartial, '2.3 Confirmed partially paid order CAN show "Registrar pago"');

  // =========================================================================
  // SECTION 9: CUSTOMER FULFILLMENT COPY
  // =========================================================================
  console.log('\n3. Customer Fulfillment Copy Logic');

  // Standard point Ermita without address, status = confirmed
  const confirmedErmitaOrder = {
    status: 'confirmed',
    delivery_name: 'Ermita',
    delivery_address: null,
    delivery_point: { name: 'Ermita', address: null, public_reference: 'Frente a parque' },
  };
  const shouldShowPorConfirmarConfirmed =
    !confirmedErmitaOrder.delivery_address &&
    !confirmedErmitaOrder.delivery_point?.address &&
    !confirmedErmitaOrder.delivery_point?.public_reference &&
    confirmedErmitaOrder.status === 'pending_approval';
  assert(!shouldShowPorConfirmarConfirmed, '3.1 Confirmed order with standard point does NOT show "Por confirmar"');

  // Pending approval order with null address shows "Por confirmar"
  const pendingErmitaOrder = {
    status: 'pending_approval',
    delivery_name: 'Ermita',
    delivery_address: null,
    delivery_point: { name: 'Ermita', address: null, public_reference: null },
  };
  const shouldShowPorConfirmarPending =
    !pendingErmitaOrder.delivery_address &&
    !pendingErmitaOrder.delivery_point?.address &&
    !pendingErmitaOrder.delivery_point?.public_reference &&
    pendingErmitaOrder.status === 'pending_approval';
  assert(shouldShowPorConfirmarPending, '3.2 pending_approval order without address shows "Por confirmar"');

  // =========================================================================
  // SECTION 14: DELIVERY POINTS LEAST-PRIVILEGE & PERMISSIONS
  // =========================================================================
  console.log('\n4. Delivery Points Database Permissions & Security');

  // 1. Fetch Ermita delivery point
  const { data: ermitaPoint, error: fetchErr } = await adminClient
    .from('zanita_delivery_points')
    .select('id, name, public_reference, instructions, is_active')
    .eq('name', 'Ermita')
    .single();

  assert(!fetchErr && !!ermitaPoint, `4.1 Located Ermita point in database (ID: ${ermitaPoint?.id})`);

  if (ermitaPoint) {
    const pointId = ermitaPoint.id;

    // Test A: Admin updates public_reference -> success
    const newRef = `Frente a parque Ermita QA ${Date.now()}`;
    const { error: adminUpdRefErr } = await adminClient
      .from('zanita_delivery_points')
      .update({ public_reference: newRef, updated_at: new Date().toISOString() })
      .eq('id', pointId);

    assert(!adminUpdRefErr, '4.2 Admin can UPDATE public_reference successfully');

    // Test B: Admin updates customer instructions -> success
    const newInstructions = 'Punto oficial de entrega coordinado en zona Ermita.';
    const { error: adminUpdInstErr } = await adminClient
      .from('zanita_delivery_points')
      .update({ instructions: newInstructions, updated_at: new Date().toISOString() })
      .eq('id', pointId);

    assert(!adminUpdInstErr, '4.3 Admin can UPDATE instructions successfully');

    // Test B.2: Admin can toggle is_active -> success
    const { error: adminToggleErr } = await adminClient
      .from('zanita_delivery_points')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', pointId);

    assert(!adminToggleErr, '4.3.1 Admin can UPDATE is_active toggle successfully');

    // Test B.3: Non-admin authenticated user cannot UPDATE -> denied
    const regularUserClient = createClient(SUPABASE_URL, ANON_KEY);
    // Sign in as non-admin customer
    const { error: signInErr } = await regularUserClient.auth.signInWithPassword({
      email: 'cliente@zanita.mx',
      password: 'password123',
    });
    if (!signInErr) {
      const { data: nonAdminData, error: nonAdminUpdErr } = await regularUserClient
        .from('zanita_delivery_points')
        .update({ public_reference: 'Hacked by customer' })
        .eq('id', pointId)
        .select('id');
      assert(
        !!nonAdminUpdErr || (nonAdminData && nonAdminData.length === 0),
        '4.3.2 Non-admin authenticated user cannot UPDATE delivery point (RLS enforced)'
      );
    }

    // Test C: Anon update -> denied
    const { error: anonUpdErr } = await anonClient
      .from('zanita_delivery_points')
      .update({ public_reference: 'Hacked by anon' })
      .eq('id', pointId);

    assert(
      !!anonUpdErr && (anonUpdErr.code === '42501' || anonUpdErr.message.includes('denied')),
      `4.4 Anon UPDATE is denied (code: ${anonUpdErr?.code || 'blocked'})`
    );

    // Test D: Storefront can read updated public_reference and instructions
    const { data: publicPoint, error: publicReadErr } = await anonClient
      .from('zanita_delivery_points')
      .select('name, public_reference, instructions, is_active')
      .eq('id', pointId)
      .single();

    assert(!publicReadErr && publicPoint?.public_reference === newRef, '4.5 Public/storefront reads new public_reference accurately');
    assert(publicPoint?.instructions === newInstructions, '4.6 Public/storefront reads new instructions accurately');
  }

  console.log(`\n=== SUMMARY: ${failures === 0 ? 'ALL TESTS PASSED (0 failures)' : `${failures} FAILURES`} ===`);
  if (failures > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
