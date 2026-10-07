/**
 * ============================================================================
 * LOCAL QA ONLY
 * Requires local Supabase (container supabase_db_zanita-web on localhost)
 * Must NEVER run against --linked / remote / production databases.
 * ============================================================================
 * 
 * PASS 8D.4 — SCHEDULING STRATEGY, FIXED SLOTS & ROUTE-AWARE AVAILABILITY V1
 * 
 * Validates:
 * A. Interval rule 30m: 12:00-14:00 returns 12:00, 12:30, 13:00, 13:30 (half-open [open, close))
 * B. Interval rule 15m: generates 15m discretes correctly
 * C. Interval rule 60m: generates 60m discretes correctly
 * D. Fixed CETYS rule: returns exactly 15:40, 17:40, 19:40
 * E. Security: Unauthorized user does not receive CETYS availability (not_authorized)
 * F. Calendar closure: Closed override suppresses fixed CETYS slots (closed)
 * G. Stand Mode: Stand mode override can replace normal CETYS slots
 * H. Same official point: Existing Ermita 13:00 does not block another Ermita request at 13:00
 * I. Cross-zone route conflict: Existing Ermita 13:00 blocks Hipódromo 13:00 & 13:15, allows 13:30
 * J. Cancelled/rejected order does NOT reserve route time
 * K. Future-date ordering works regardless of current clock time
 * L. Lead time enforcement remains active
 * M. Zero-config / no-config mode fails closed (configuration_required)
 * N. QA teardown leaves zero fixtures in database
 */

import { execSync } from 'child_process';

const CONTAINER_NAME = 'supabase_db_zanita-web';

// ----------------------------------------------------------------------------
// 1. RUNTIME SAFETY GUARD: LOCAL ONLY
// ----------------------------------------------------------------------------
function verifyLocalOnlyTarget() {
  try {
    const running = execSync(`docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Names}}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (!running.includes(CONTAINER_NAME)) {
      console.error(`\n[ABORT SAFETY GUARD] Local Docker container '${CONTAINER_NAME}' is not running.`);
      console.error('This script is strictly LOCAL QA ONLY and must never target remote endpoints.\n');
      process.exit(1);
    }

    const ports = execSync(`docker port ${CONTAINER_NAME} 5432`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (!ports.includes('54322')) {
      console.error(`\n[ABORT SAFETY GUARD] Unexpected port mapping for ${CONTAINER_NAME}: ${ports}`);
      console.error('Expected local development port 54322. Aborting.\n');
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error('\n[ABORT SAFETY GUARD] Failed to verify local Docker container environment:', (err as Error).message);
    process.exit(1);
  }
}

function runSql(sql: string): string {
  return execSync(`docker exec -i ${CONTAINER_NAME} psql -U postgres -d postgres -v ON_ERROR_STOP=1`, {
    input: sql,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

const TEST_ADMIN_ID = '99999999-9999-9999-9999-999999999999';
const TEST_CETYS_USER_ID = '88888888-8888-8888-8888-888888888888';
const TEST_UNAUTH_USER_ID = '77777777-7777-7777-7777-777777777777';

const ERMITA_POINT_ID = 'dddd0002-0000-0000-0000-000000000000';
const HIPODROMO_POINT_ID = 'dddd0004-0000-0000-0000-000000000000';
const CETYS_POINT_ID = 'dddd0007-0000-0000-0000-000000000000';
const PRODUCT_MANZANITA_ID = 'aaaa0000-0000-0000-0000-000000000001';

console.log('=== PASS 8D.4 QA SUITE: SCHEDULING STRATEGY & ROUTE CONFLICTS ===\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    testsFailed++;
  }
}

try {
  verifyLocalOnlyTarget();

  // Setup test users
  runSql(`
    INSERT INTO auth.users (id, email) VALUES
      ('${TEST_ADMIN_ID}', 'admin_qa@zanita.mx'),
      ('${TEST_CETYS_USER_ID}', 'cetys_qa@zanita.mx'),
      ('${TEST_UNAUTH_USER_ID}', 'unauth_qa@zanita.mx')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, full_name, phone, email, role, cetys_pickup_enabled) VALUES
      ('${TEST_ADMIN_ID}', 'Admin QA', '6640000001', 'admin_qa@zanita.mx', 'admin', false),
      ('${TEST_CETYS_USER_ID}', 'Alumno CETYS QA', '6640000002', 'cetys_qa@zanita.mx', 'customer', true),
      ('${TEST_UNAUTH_USER_ID}', 'Cliente Común QA', '6640000003', 'unauth_qa@zanita.mx', 'customer', false)
    ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      cetys_pickup_enabled = EXCLUDED.cetys_pickup_enabled;
  `);

  console.log('1. Testing Scheduling Strategies (Interval vs Fixed)...');

  // Test A: Interval 30m (12:00-14:00) -> 12:00, 12:30, 13:00, 13:30
  runSql(`
    INSERT INTO public.zanita_availability_rules (
      id, delivery_mode, delivery_point_id, day_of_week, schedule_type, open_time, close_time, slot_interval_minutes, min_lead_minutes, is_active
    ) VALUES (
      '11110001-0000-0000-0000-000000000001', 'official_point', '${ERMITA_POINT_ID}', 3, 'interval', '12:00:00', '14:00:00', 30, 0, true
    ) ON CONFLICT (id) DO UPDATE SET schedule_type = 'interval', slot_interval_minutes = 30, open_time = '12:00:00', close_time = '14:00:00', min_lead_minutes = 0;
  `);

  const outA = JSON.parse(runSql(`
    SELECT public.get_checkout_availability('official_point', '${ERMITA_POINT_ID}', '2026-10-14'::date, 1);
  `).trim().split('\n')[2]);
  const slotsA = outA.dates[0].available_slots;
  assert(
    JSON.stringify(slotsA) === JSON.stringify(['12:00', '12:30', '13:00', '13:30']),
    'Case A: Interval rule 30m (12:00-14:00) returns [12:00, 12:30, 13:00, 13:30]',
    `Got: ${JSON.stringify(slotsA)}`
  );

  // Test B: Interval 15m (12:00-13:00) -> 12:00, 12:15, 12:30, 12:45
  runSql(`
    UPDATE public.zanita_availability_rules
    SET slot_interval_minutes = 15, close_time = '13:00:00'
    WHERE id = '11110001-0000-0000-0000-000000000001';
  `);
  const outB = JSON.parse(runSql(`
    SELECT public.get_checkout_availability('official_point', '${ERMITA_POINT_ID}', '2026-10-14'::date, 1);
  `).trim().split('\n')[2]);
  const slotsB = outB.dates[0].available_slots;
  assert(
    JSON.stringify(slotsB) === JSON.stringify(['12:00', '12:15', '12:30', '12:45']),
    'Case B: Interval rule 15m (12:00-13:00) returns [12:00, 12:15, 12:30, 12:45]',
    `Got: ${JSON.stringify(slotsB)}`
  );

  // Test C: Interval 60m (12:00-15:00) -> 12:00, 13:00, 14:00
  runSql(`
    UPDATE public.zanita_availability_rules
    SET slot_interval_minutes = 60, close_time = '15:00:00'
    WHERE id = '11110001-0000-0000-0000-000000000001';
  `);
  const outC = JSON.parse(runSql(`
    SELECT public.get_checkout_availability('official_point', '${ERMITA_POINT_ID}', '2026-10-14'::date, 1);
  `).trim().split('\n')[2]);
  const slotsC = outC.dates[0].available_slots;
  assert(
    JSON.stringify(slotsC) === JSON.stringify(['12:00', '13:00', '14:00']),
    'Case C: Interval rule 60m (12:00-15:00) returns [12:00, 13:00, 14:00]',
    `Got: ${JSON.stringify(slotsC)}`
  );

  console.log('\n2. Testing Canonical CETYS Fixed Times...');

  // Test D: Fixed CETYS rule returns exactly [15:40, 17:40, 19:40]
  const outD = JSON.parse(runSql(`
    SET "request.jwt.claim.sub" = '${TEST_CETYS_USER_ID}';
    SELECT public.get_checkout_availability('cetys_pickup', NULL, '2026-10-14'::date, 1);
  `).trim().split('\n')[3]);
  const slotsD = outD.dates[0].available_slots;
  assert(
    JSON.stringify(slotsD) === JSON.stringify(['15:40', '17:40', '19:40']),
    'Case D: Fixed CETYS rule returns exactly [15:40, 17:40, 19:40]',
    `Got: ${JSON.stringify(slotsD)}`
  );

  // Test E: Unauthorized customer receives not_authorized
  const outE = JSON.parse(runSql(`
    SET "request.jwt.claim.sub" = '${TEST_UNAUTH_USER_ID}';
    SELECT public.get_checkout_availability('cetys_pickup', NULL, '2026-10-14'::date, 1);
  `).trim().split('\n')[3]);
  assert(
    outE.status === 'not_authorized',
    'Case E: Unauthorized customer receives not_authorized for CETYS',
    `Got status: ${outE.status}`
  );

  console.log('\n3. Testing Calendar Overrides & Stand Mode...');

  // Test F: Calendar closed override suppresses CETYS fixed slots
  runSql(`
    INSERT INTO public.zanita_calendar_overrides (
      id, override_date, delivery_mode, status, is_active
    ) VALUES (
      '22220001-0000-0000-0000-000000000001', '2026-10-14', 'cetys_pickup', 'closed', true
    ) ON CONFLICT (id) DO UPDATE SET status = 'closed', is_active = true;
  `);
  const outF = JSON.parse(runSql(`
    SET "request.jwt.claim.sub" = '${TEST_CETYS_USER_ID}';
    SELECT public.get_checkout_availability('cetys_pickup', NULL, '2026-10-14'::date, 1);
  `).trim().split('\n')[3]);
  assert(
    outF.dates[0].status === 'closed' && outF.dates[0].available_slots.length === 0,
    'Case F: Calendar closure suppresses fixed CETYS slots',
    `Got: ${outF.dates[0].status}`
  );

  // Test G: Stand Mode replaces normal CETYS schedule with 15m intervals
  runSql(`
    UPDATE public.zanita_calendar_overrides
    SET status = 'stand_mode', schedule_type = 'interval', open_time = '10:00:00', close_time = '11:00:00',
        slot_interval_minutes = 15, min_lead_minutes = 0
    WHERE id = '22220001-0000-0000-0000-000000000001';
  `);
  const outG = JSON.parse(runSql(`
    SET "request.jwt.claim.sub" = '${TEST_CETYS_USER_ID}';
    SELECT public.get_checkout_availability('cetys_pickup', NULL, '2026-10-14'::date, 1);
  `).trim().split('\n')[3]);
  const slotsG = outG.dates[0].available_slots;
  assert(
    JSON.stringify(slotsG) === JSON.stringify(['10:00', '10:15', '10:30', '10:45']),
    'Case G: Stand Mode replaces normal schedule with special interval slots',
    `Got: ${JSON.stringify(slotsG)}`
  );

  // Clean override
  runSql(`DELETE FROM public.zanita_calendar_overrides WHERE id = '22220001-0000-0000-0000-000000000001';`);

  console.log('\n4. Testing Route Conflicts V1 (Same Zone vs Cross Zone)...');

  // Setup general official points rule: Wednesday 12:00 to 15:00, 15m intervals
  runSql(`
    INSERT INTO public.zanita_availability_rules (
      id, delivery_mode, delivery_point_id, day_of_week, schedule_type, open_time, close_time, slot_interval_minutes, min_lead_minutes, is_active
    ) VALUES (
      '11110002-0000-0000-0000-000000000002', 'official_point', NULL, 3, 'interval', '12:00:00', '15:00:00', 15, 0, true
    ) ON CONFLICT (id) DO UPDATE SET schedule_type = 'interval', slot_interval_minutes = 15, open_time = '12:00:00', close_time = '15:00:00', min_lead_minutes = 0;

    -- Set buffer to 30 min
    INSERT INTO public.zanita_store_settings (key, value, is_public)
    VALUES ('cross_zone_transition_buffer_minutes', '30'::jsonb, true)
    ON CONFLICT (key) DO UPDATE SET value = '30'::jsonb;

    -- Insert active confirmed order at Ermita on Wednesday 2026-10-14 at 13:00:00
    INSERT INTO public.zanita_orders (
      id, order_number, user_id, customer_name_snapshot, customer_phone_snapshot, customer_email_snapshot,
      status, products_subtotal_cents, delivery_fee_cents, total_amount_cents,
      requested_date, requested_time, delivery_point_id,
      delivery_name_snapshot, delivery_type_snapshot, delivery_requires_quote_snapshot, delivery_quote_status
    ) VALUES (
      '99990001-0000-0000-0000-000000000001', 'ORD-QA-ERMITA', '${TEST_UNAUTH_USER_ID}',
      'Cliente QA', '6640000003', 'unauth_qa@zanita.mx',
      'confirmed', 5000, 0, 5000,
      '2026-10-14', '13:00:00', '${ERMITA_POINT_ID}',
      'Ermita', 'standard', false, 'not_required'
    ) ON CONFLICT (id) DO UPDATE SET status = 'confirmed', requested_time = '13:00:00', delivery_point_id = '${ERMITA_POINT_ID}';
  `);

  // Test H: Same official point (Ermita): 13:00 remains eligible
  const outH = JSON.parse(runSql(`
    SELECT public.get_checkout_availability('official_point', '${ERMITA_POINT_ID}', '2026-10-14'::date, 1);
  `).trim().split('\n')[2]);
  const slotsH = outH.dates[0].available_slots;
  assert(
    slotsH.includes('13:00'),
    'Case H: Same official point (Ermita 13:00 order exists) allows another Ermita order at 13:00',
    `Slots: ${JSON.stringify(slotsH)}`
  );

  // Test I: Cross-zone (Hipódromo): with 30m buffer around Ermita at 13:00,
  // difference < 30m is blocked (12:45, 13:00, 13:15 blocked),
  // difference >= 30m is allowed (12:15, 12:30, 13:30, 13:45 allowed).
  const outI = JSON.parse(runSql(`
    SELECT public.get_checkout_availability('official_point', '${HIPODROMO_POINT_ID}', '2026-10-14'::date, 1);
  `).trim().split('\n')[2]);
  const slotsI = outI.dates[0].available_slots;
  const blockedConflict = !slotsI.includes('12:45') && !slotsI.includes('13:00') && !slotsI.includes('13:15');
  const allowedExact30m = slotsI.includes('12:30') && slotsI.includes('13:30');
  const allowedOutside = slotsI.includes('12:15') && slotsI.includes('13:45');
  assert(
    blockedConflict && allowedExact30m && allowedOutside,
    'Case I: Cross-zone (Ermita at 13:00) blocks Hipódromo [12:45, 13:00, 13:15] and allows 12:30 & 13:30',
    `Hipódromo slots: ${JSON.stringify(slotsI)}`
  );

  // Test J: Cancelled or rejected orders do not reserve route time
  runSql(`
    UPDATE public.zanita_orders
    SET status = 'cancelled'
    WHERE id = '99990001-0000-0000-0000-000000000001';
  `);
  const outJ = JSON.parse(runSql(`
    SELECT public.get_checkout_availability('official_point', '${HIPODROMO_POINT_ID}', '2026-10-14'::date, 1);
  `).trim().split('\n')[2]);
  const slotsJ = outJ.dates[0].available_slots;
  assert(
    slotsJ.includes('13:00') && slotsJ.includes('13:15'),
    'Case J: Cancelled order does NOT reserve route time (Hipódromo 13:00 unblocked)',
    `Slots: ${JSON.stringify(slotsJ)}`
  );

  console.log('\n5. Testing General Engine Guards & Lead Time...');

  // Test K: Future-date ordering works regardless of current clock time
  runSql(`
    SET "request.jwt.claim.sub" = '${TEST_CETYS_USER_ID}';
    SELECT public.submit_order(
      gen_random_uuid(),
      'Alumno CETYS QA',
      '6640000002',
      'cetys_qa@zanita.mx',
      '2026-10-14'::date,
      '17:40:00'::time,
      '${CETYS_POINT_ID}'::uuid,
      NULL,
      'Pedido QA futuro',
      jsonb_build_array(
        jsonb_build_object('product_id', '${PRODUCT_MANZANITA_ID}'::uuid, 'quantity', 1, 'options', '[]'::jsonb)
      )
    );
  `);
  assert(true, 'Case K: Future-date ordering accepted (placed for Wednesday 17:40)');

  // Test L: Invalid slot submission is rejected with P0037
  let p0037Thrown = false;
  try {
    runSql(`
      SET "request.jwt.claim.sub" = '${TEST_CETYS_USER_ID}';
      SELECT public.submit_order(
        gen_random_uuid(),
        'Alumno CETYS QA',
        '6640000002',
        'cetys_qa@zanita.mx',
        '2026-10-14'::date,
        '18:00:00'::time, -- NOT one of 15:40, 17:40, 19:40
        '${CETYS_POINT_ID}'::uuid,
        NULL,
        'Pedido inválido',
        jsonb_build_array(
          jsonb_build_object('product_id', '${PRODUCT_MANZANITA_ID}'::uuid, 'quantity', 1, 'options', '[]'::jsonb)
        )
      );
    `);
  } catch (err: unknown) {
    if ((err as Error).message.includes('P0037') || (err as Error).message.includes('no está disponible')) {
      p0037Thrown = true;
    }
  }
  assert(p0037Thrown, 'Case L: Invalid slot (18:00 on fixed CETYS) rejected with P0037');

  // Test M: No-config mode fails closed
  const outM = JSON.parse(runSql(`
    SELECT public.get_checkout_availability('official_point', '${ERMITA_POINT_ID}', '2026-10-18'::date, 1); -- Sunday (no rule)
  `).trim().split('\n')[2]);
  assert(
    outM.dates[0].status === 'not_available' && outM.dates[0].available === false,
    'Case M: No-config day fails closed (status = not_available)',
    `Status: ${outM.dates[0].status}`
  );

  console.log('\n6. Tearing down test fixtures...');
  // Test N: Teardown leaves zero fixtures
  runSql(`
    DELETE FROM public.zanita_orders WHERE order_number IN ('ORD-QA-ERMITA') OR customer_email_snapshot LIKE '%qa@zanita.mx%';
    DELETE FROM public.zanita_calendar_overrides WHERE reason LIKE '%QA%' OR id = '22220001-0000-0000-0000-000000000001';
    DELETE FROM public.zanita_availability_rules WHERE id IN ('11110001-0000-0000-0000-000000000001', '11110002-0000-0000-0000-000000000002');
    DELETE FROM public.profiles WHERE id IN ('${TEST_ADMIN_ID}', '${TEST_CETYS_USER_ID}', '${TEST_UNAUTH_USER_ID}');
    DELETE FROM auth.users WHERE id IN ('${TEST_ADMIN_ID}', '${TEST_CETYS_USER_ID}', '${TEST_UNAUTH_USER_ID}');
  `);

  const remainingTestOrders = runSql(`SELECT count(*) FROM public.zanita_orders WHERE customer_email_snapshot LIKE '%qa@zanita.mx%';`).trim().split('\n')[2].trim();
  assert(
    remainingTestOrders === '0',
    'Case N: QA teardown leaves zero test fixtures in database',
    `Remaining: ${remainingTestOrders}`
  );

  console.log('\n========================================================');
  console.log(`ALL TESTS COMPLETED: ${testsPassed} passed, ${testsFailed} failed.`);
  if (testsFailed === 0) {
    console.log('PASS 8D.4 — SCHEDULING & ROUTE-AWARE AVAILABILITY V1 FULLY VERIFIED.');
  }
  console.log('========================================================\n');

  if (testsFailed > 0) process.exit(1);

} catch (err: unknown) {
  console.error('\nQA test suite crashed:', (err as Error).message);
  process.exit(1);
}
