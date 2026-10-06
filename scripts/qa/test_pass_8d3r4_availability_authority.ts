/**
 * ============================================================================
 * LOCAL QA ONLY
 * Requires local Supabase (container supabase_db_zanita-web on localhost)
 * Must NEVER run against --linked / remote / production databases.
 * ============================================================================
 * 
 * PASS 8D.3R.4A — AVAILABILITY AUTHORITY AUTOMATED REGRESSION SUITE
 * 
 * Validates:
 * 1. Runtime guard: Aborts immediately if targeting anything other than local container.
 * 2. Unconfigured CETYS Baseline: When slot_interval_minutes is NULL, returns
 *    status = 'configuration_required' with reason = 'slot_interval_required'.
 * 3. Matrix Future Orders: Future orders (e.g. Wednesday 17:00 placed Monday 19:00)
 *    are ALLOWED when schedule has configured slots.
 * 4. Lead Time Enforcement: Slots within configured lead time are rejected by engine.
 * 5. Same-Day Cutoff: Cutoff time applies strictly to the same day and never bleeds to future days.
 * 6. Stand Mode Flexibility: Shortened lead times (e.g. 15m) work without global 24h blocker.
 * 7. Security: Unauthorized CETYS accounts cannot view or submit orders (P0005).
 * 8. Zero-Config Safety: Unconfigured fulfillment modes reject orders (P0037).
 * 9. Overrides & Subtractive Blocks: Closed overrides and blocks are respected.
 * 10. Self-Cleaning: All test users, orders, blocks, overrides, and test rules are purged.
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

    // Verify container port mapping is strictly localhost/127.0.0.1
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

const CETYS_POINT_ID = 'dddd0007-0000-0000-0000-000000000000';
const PRODUCT_MANZANITA_ID = 'aaaa0000-0000-0000-0000-000000000001';

console.log('=== PASS 8D.3R.4A REGRESSION SUITE: AVAILABILITY AUTHORITY ===\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  [PASS] ${msg}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    testsFailed++;
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function setup() {
  console.log('1. Verifying local-only safety and setting up QA test fixtures...');
  verifyLocalOnlyTarget();

  runSql(`
    -- Setup test users
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES 
      ('${TEST_ADMIN_ID}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin_qa@zanita.local', 'dummy', '{"provider":"email"}', '{"full_name":"Admin QA","phone":"6641111111"}', now(), now()),
      ('${TEST_CETYS_USER_ID}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cetys_qa@zanita.local', 'dummy', '{"provider":"email"}', '{"full_name":"CETYS QA","phone":"6642222222"}', now(), now()),
      ('${TEST_UNAUTH_USER_ID}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'unauth_qa@zanita.local', 'dummy', '{"provider":"email"}', '{"full_name":"Unauth QA","phone":"6643333333"}', now(), now())
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.profiles SET role = 'admin' WHERE id = '${TEST_ADMIN_ID}';
    UPDATE public.profiles SET role = 'customer', cetys_pickup_enabled = true WHERE id = '${TEST_CETYS_USER_ID}';
    UPDATE public.profiles SET role = 'customer', cetys_pickup_enabled = false WHERE id = '${TEST_UNAUTH_USER_ID}';
  `);
  console.log('   Local container verified & test fixtures created.\n');
}

function testCetysBaselineUnconfigured() {
  console.log('2. Verifying Baseline CETYS State (No invented slot_interval)...');

  // Baseline CETYS recurring rules have slot_interval_minutes = NULL.
  // The availability engine MUST return status = 'configuration_required'
  // and dates[i].reason = 'slot_interval_required'.
  runSql(`
    DO $$
    DECLARE
      v_res jsonb;
      v_date0 jsonb;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '${TEST_CETYS_USER_ID}', true);
      PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_CETYS_USER_ID}","role":"authenticated"}', true);
      PERFORM set_config('zanita.test_current_time', '2026-10-05 10:00:00', true);

      v_res := public.get_checkout_availability('cetys_pickup', NULL, '2026-10-05'::date, 5);
      IF v_res->>'status' != 'configuration_required' THEN
        RAISE EXCEPTION 'Expected top status configuration_required, got: %', v_res->>'status';
      END IF;

      v_date0 := (v_res->'dates')->0;
      IF v_date0->>'status' != 'configuration_required' OR v_date0->>'reason' != 'slot_interval_required' THEN
        RAISE EXCEPTION 'Expected date status configuration_required with slot_interval_required, got: %', v_date0;
      END IF;
    END $$;
  `);

  assert(true, 'Baseline CETYS: slot_interval_minutes is NULL -> engine returns configuration_required (slot_interval_required)');
  console.log();
}

function testFutureOrderMatrixWithConfiguredQA() {
  console.log('3. Running Matrix Future Orders Tests (with QA-configured interval)...');

  // Configure recurring interval for testing future order semantics (temporarily 60m for QA)
  runSql(`
    UPDATE public.zanita_availability_rules
    SET slot_interval_minutes = 60
    WHERE delivery_mode = 'cetys_pickup';
  `);

  // Case A: Monday 19:00 -> Wednesday 17:00 slot (ALLOWED)
  runSql(`
    DO $$
    DECLARE
      v_res jsonb;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '${TEST_CETYS_USER_ID}', true);
      PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_CETYS_USER_ID}","role":"authenticated"}', true);
      PERFORM set_config('zanita.test_current_time', '2026-10-05 19:00:00', true);

      v_res := public.submit_order(
        'a0000000-0000-0000-0000-000000000001'::uuid,
        'CETYS Customer', '6642222222', 'cetys_qa@zanita.local',
        '2026-10-07'::date, '17:00'::time,
        '${CETYS_POINT_ID}'::uuid, NULL, 'Future wednesday order',
        jsonb_build_array(jsonb_build_object(
          'product_id', '${PRODUCT_MANZANITA_ID}', 'product_name', 'Manzanita',
          'base_price_cents', 5000, 'final_price_cents', 5000,
          'quantity', 1, 'subtotal_cents', 5000, 'options', '[]'::jsonb
        ))
      );
      IF v_res->>'status' != 'pending_approval' THEN
        RAISE EXCEPTION 'Case A failed: unexpected status %', v_res;
      END IF;
    END $$;
  `);
  assert(true, 'Case A: Monday 19:00 -> Wednesday 17:00 order accepted (pending_approval)');

  // Case B: Monday 19:00 -> Tuesday 16:00 (REJECTED by 24h lead time, slot not generated)
  let caseBRejected = false;
  try {
    runSql(`
      DO $$
      BEGIN
        PERFORM set_config('request.jwt.claim.sub', '${TEST_CETYS_USER_ID}', true);
        PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_CETYS_USER_ID}","role":"authenticated"}', true);
        PERFORM set_config('zanita.test_current_time', '2026-10-05 19:00:00', true);

        PERFORM public.submit_order(
          'a0000000-0000-0000-0000-000000000002'::uuid,
          'CETYS Customer', '6642222222', 'cetys_qa@zanita.local',
          '2026-10-06'::date, '16:00'::time,
          '${CETYS_POINT_ID}'::uuid, NULL, 'Tuesday too early',
          jsonb_build_array(jsonb_build_object(
            'product_id', '${PRODUCT_MANZANITA_ID}', 'product_name', 'Manzanita',
            'base_price_cents', 5000, 'final_price_cents', 5000,
            'quantity', 1, 'subtotal_cents', 5000, 'options', '[]'::jsonb
          ))
        );
      END $$;
    `);
  } catch (err: unknown) {
    const errorObj = err as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    const msg = (errorObj.stderr || errorObj.stdout || errorObj.message || '').toString();
    caseBRejected = msg.includes('no está disponible') || msg.includes('P0037');
  }
  assert(caseBRejected, 'Case B: Monday 19:00 -> Tuesday 16:00 (<24h lead) rejected by engine');

  // Case C: Monday 19:00 -> Tuesday 19:00 (ALLOWED: exactly 24h lead time)
  runSql(`
    DO $$
    DECLARE
      v_res jsonb;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '${TEST_CETYS_USER_ID}', true);
      PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_CETYS_USER_ID}","role":"authenticated"}', true);
      PERFORM set_config('zanita.test_current_time', '2026-10-05 19:00:00', true);

      v_res := public.submit_order(
        'a0000000-0000-0000-0000-000000000003'::uuid,
        'CETYS Customer', '6642222222', 'cetys_qa@zanita.local',
        '2026-10-06'::date, '19:00'::time,
        '${CETYS_POINT_ID}'::uuid, NULL, 'Tuesday valid 24h lead',
        jsonb_build_array(jsonb_build_object(
          'product_id', '${PRODUCT_MANZANITA_ID}', 'product_name', 'Manzanita',
          'base_price_cents', 5000, 'final_price_cents', 5000,
          'quantity', 1, 'subtotal_cents', 5000, 'options', '[]'::jsonb
        ))
      );
      IF v_res->>'status' != 'pending_approval' THEN
        RAISE EXCEPTION 'Case C failed: unexpected status %', v_res;
      END IF;
    END $$;
  `);
  assert(true, 'Case C: Monday 19:00 -> Tuesday 19:00 (>=24h lead) order accepted');

  // Reset CETYS slot_interval_minutes back to NULL
  runSql(`
    UPDATE public.zanita_availability_rules
    SET slot_interval_minutes = NULL
    WHERE delivery_mode = 'cetys_pickup';
  `);
  console.log();
}

function testSameDayCutoffMatrix() {
  console.log('4. Running Same-Day Cutoff Tests (Cutoff applies ONLY to same day)...');

  // Set up same-day override with cutoff at 14:00 and 0 min lead time to test cutoff in isolation
  runSql(`
    INSERT INTO public.zanita_calendar_overrides (
      override_date, delivery_mode, delivery_point_id, status,
      open_time, close_time, submission_cutoff_time, slot_interval_minutes, min_lead_minutes, created_by
    ) VALUES (
      '2026-10-05', 'cetys_pickup', NULL, 'open',
      '12:00', '18:00', '14:00', 60, 0, '${TEST_ADMIN_ID}'
    );
    -- Configure future Wednesday override with 60m interval for testing future order after cutoff
    INSERT INTO public.zanita_calendar_overrides (
      override_date, delivery_mode, delivery_point_id, status,
      open_time, close_time, slot_interval_minutes, min_lead_minutes, created_by
    ) VALUES (
      '2026-10-07', 'cetys_pickup', NULL, 'open',
      '16:00', '20:00', 60, 1440, '${TEST_ADMIN_ID}'
    );
  `);

  // Same-day before cutoff (13:59) -> 15:00 slot is ALLOWED
  runSql(`
    DO $$
    DECLARE
      v_res jsonb;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '${TEST_CETYS_USER_ID}', true);
      PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_CETYS_USER_ID}","role":"authenticated"}', true);
      PERFORM set_config('zanita.test_current_time', '2026-10-05 13:59:00', true);

      v_res := public.submit_order(
        'b0000000-0000-0000-0000-000000000001'::uuid,
        'CETYS Customer', '6642222222', 'cetys_qa@zanita.local',
        '2026-10-05'::date, '15:00'::time,
        '${CETYS_POINT_ID}'::uuid, NULL, 'Same day pre-cutoff',
        jsonb_build_array(jsonb_build_object(
          'product_id', '${PRODUCT_MANZANITA_ID}', 'product_name', 'Manzanita',
          'base_price_cents', 5000, 'final_price_cents', 5000,
          'quantity', 1, 'subtotal_cents', 5000, 'options', '[]'::jsonb
        ))
      );
      IF v_res->>'status' != 'pending_approval' THEN
        RAISE EXCEPTION 'Same day pre-cutoff failed: %', v_res;
      END IF;
    END $$;
  `);
  assert(true, 'Same-day 13:59: submission for today 15:00 succeeds before 14:00 cutoff');

  // Same-day at/after cutoff (14:00) -> today is cutoff_reached (P0036)
  let sameDayCutoffRejected = false;
  try {
    runSql(`
      DO $$
      BEGIN
        PERFORM set_config('request.jwt.claim.sub', '${TEST_CETYS_USER_ID}', true);
        PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_CETYS_USER_ID}","role":"authenticated"}', true);
        PERFORM set_config('zanita.test_current_time', '2026-10-05 14:00:00', true);

        PERFORM public.submit_order(
          'b0000000-0000-0000-0000-000000000002'::uuid,
          'CETYS Customer', '6642222222', 'cetys_qa@zanita.local',
          '2026-10-05'::date, '15:00'::time,
          '${CETYS_POINT_ID}'::uuid, NULL, 'Same day post-cutoff',
          jsonb_build_array(jsonb_build_object(
            'product_id', '${PRODUCT_MANZANITA_ID}', 'product_name', 'Manzanita',
            'base_price_cents', 5000, 'final_price_cents', 5000,
            'quantity', 1, 'subtotal_cents', 5000, 'options', '[]'::jsonb
          ))
        );
      END $$;
    `);
  } catch (err: unknown) {
    const errorObj = err as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    const msg = (errorObj.stderr || errorObj.stdout || errorObj.message || '').toString();
    sameDayCutoffRejected = msg.includes('horario límite') || msg.includes('P0036');
  }
  assert(sameDayCutoffRejected, 'Same-day 14:00: submission for today rejected with P0036 (cutoff_reached)');

  // Same-day at 14:05 -> FUTURE DATE (Wednesday 2026-10-07) is STILL ALLOWED (not blocked by today cutoff)
  runSql(`
    DO $$
    DECLARE
      v_res jsonb;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '${TEST_CETYS_USER_ID}', true);
      PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_CETYS_USER_ID}","role":"authenticated"}', true);
      PERFORM set_config('zanita.test_current_time', '2026-10-05 14:05:00', true);

      v_res := public.submit_order(
        'b0000000-0000-0000-0000-000000000003'::uuid,
        'CETYS Customer', '6642222222', 'cetys_qa@zanita.local',
        '2026-10-07'::date, '17:00'::time,
        '${CETYS_POINT_ID}'::uuid, NULL, 'Future wednesday order after today cutoff',
        jsonb_build_array(jsonb_build_object(
          'product_id', '${PRODUCT_MANZANITA_ID}', 'product_name', 'Manzanita',
          'base_price_cents', 5000, 'final_price_cents', 5000,
          'quantity', 1, 'subtotal_cents', 5000, 'options', '[]'::jsonb
        ))
      );
      IF v_res->>'status' != 'pending_approval' THEN
        RAISE EXCEPTION 'Future order after cutoff failed: %', v_res;
      END IF;
    END $$;
  `);
  assert(true, 'Same-day 14:05: submission for future Wednesday is ALLOWED (cutoff does NOT bleed)');

  // Clean overrides
  runSql(`DELETE FROM public.zanita_calendar_overrides WHERE override_date IN ('2026-10-05', '2026-10-07');`);
  console.log();
}

function testCetysStandModeAndLeadTime() {
  console.log('5. Running CETYS Stand Mode & Admin-Controlled Lead Time Tests...');

  // Configure CETYS Stand Mode for Friday 2026-10-09:
  // Window: 16:00 to 20:00, slot_interval_minutes = 15, min_lead_minutes = 15!
  runSql(`
    INSERT INTO public.zanita_calendar_overrides (
      override_date, delivery_mode, delivery_point_id, status,
      open_time, close_time, slot_interval_minutes, min_lead_minutes, created_by
    ) VALUES (
      '2026-10-09', 'cetys_pickup', NULL, 'stand_mode',
      '16:00', '20:00', 15, 15, '${TEST_ADMIN_ID}'
    );
  `);

  // Current time: Friday 2026-10-09 at 17:00
  // Requested time: Friday 2026-10-09 at 17:30 (30 min in advance, >15 min lead time)
  // If the old 24h global pre-check were still in submit_order, this would fail!
  // In 8D.3R.4, this MUST SUCCEED because the Availability Engine rules are authoritative!
  runSql(`
    DO $$
    DECLARE
      v_res jsonb;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '${TEST_CETYS_USER_ID}', true);
      PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_CETYS_USER_ID}","role":"authenticated"}', true);
      PERFORM set_config('zanita.test_current_time', '2026-10-09 17:00:00', true);

      v_res := public.submit_order(
        'c0000000-0000-0000-0000-000000000001'::uuid,
        'CETYS Customer', '6642222222', 'cetys_qa@zanita.local',
        '2026-10-09'::date, '17:30'::time,
        '${CETYS_POINT_ID}'::uuid, NULL, 'CETYS Stand Mode 15 min lead',
        jsonb_build_array(jsonb_build_object(
          'product_id', '${PRODUCT_MANZANITA_ID}', 'product_name', 'Manzanita',
          'base_price_cents', 5000, 'final_price_cents', 5000,
          'quantity', 1, 'subtotal_cents', 5000, 'options', '[]'::jsonb
        ))
      );
      IF v_res->>'status' != 'pending_approval' THEN
        RAISE EXCEPTION 'Stand Mode order failed: %', v_res;
      END IF;
    END $$;
  `);
  assert(true, 'Stand Mode: 15 min lead time order placed 30 min before succeeds (no 24h block)');

  // Requesting slot within 10 minutes (17:10) must be REJECTED (less than min_lead_minutes = 15)
  let standLeadRejected = false;
  try {
    runSql(`
      DO $$
      BEGIN
        PERFORM set_config('request.jwt.claim.sub', '${TEST_CETYS_USER_ID}', true);
        PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_CETYS_USER_ID}","role":"authenticated"}', true);
        PERFORM set_config('zanita.test_current_time', '2026-10-09 17:00:00', true);

        PERFORM public.submit_order(
          'c0000000-0000-0000-0000-000000000002'::uuid,
          'CETYS Customer', '6642222222', 'cetys_qa@zanita.local',
          '2026-10-09'::date, '17:10'::time,
          '${CETYS_POINT_ID}'::uuid, NULL, 'Stand Mode too early',
          jsonb_build_array(jsonb_build_object(
            'product_id', '${PRODUCT_MANZANITA_ID}', 'product_name', 'Manzanita',
            'base_price_cents', 5000, 'final_price_cents', 5000,
            'quantity', 1, 'subtotal_cents', 5000, 'options', '[]'::jsonb
          ))
        );
      END $$;
    `);
  } catch (err: unknown) {
    const errorObj = err as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    const msg = (errorObj.stderr || errorObj.stdout || errorObj.message || '').toString();
    standLeadRejected = msg.includes('no está disponible') || msg.includes('P0037');
  }
  assert(standLeadRejected, 'Stand Mode: slot with <15 min lead rejected by engine with P0037');

  // Clean override
  runSql(`DELETE FROM public.zanita_calendar_overrides WHERE override_date = '2026-10-09';`);
  console.log();
}

function testUnauthorizedCetys() {
  console.log('6. Running Security & Authorization Tests for CETYS...');

  // Unauthorized customer attempting CETYS pickup must be rejected with P0005
  let unauthRejected = false;
  try {
    runSql(`
      DO $$
      BEGIN
        PERFORM set_config('request.jwt.claim.sub', '${TEST_UNAUTH_USER_ID}', true);
        PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_UNAUTH_USER_ID}","role":"authenticated"}', true);
        PERFORM set_config('zanita.test_current_time', '2026-10-05 10:00:00', true);

        PERFORM public.submit_order(
          'd0000000-0000-0000-0000-000000000001'::uuid,
          'Unauth Customer', '6643333333', 'unauth_qa@zanita.local',
          '2026-10-07'::date, '17:00'::time,
          '${CETYS_POINT_ID}'::uuid, NULL, 'Unauthorized CETYS attempt',
          jsonb_build_array(jsonb_build_object(
            'product_id', '${PRODUCT_MANZANITA_ID}', 'product_name', 'Manzanita',
            'base_price_cents', 5000, 'final_price_cents', 5000,
            'quantity', 1, 'subtotal_cents', 5000, 'options', '[]'::jsonb
          ))
        );
      END $$;
    `);
  } catch (err: unknown) {
    const errorObj = err as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    const msg = (errorObj.stderr || errorObj.stdout || errorObj.message || '').toString();
    unauthRejected = msg.includes('autorización') || msg.includes('P0005');
  }
  assert(unauthRejected, 'Unauthorized customer attempting CETYS pickup rejected with P0005');
  console.log();
}

function testZeroConfigSafety() {
  console.log('7. Running Zero-Config Safety Tests (No rules configured)...');

  // Official point dddd0001 has no recurring rules seeded.
  // get_checkout_availability returns configuration_required.
  // submit_order MUST reject with P0037 and not create an order.
  let zeroConfigRejected = false;
  try {
    runSql(`
      DO $$
      BEGIN
        PERFORM set_config('request.jwt.claim.sub', '${TEST_CETYS_USER_ID}', true);
        PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_CETYS_USER_ID}","role":"authenticated"}', true);
        PERFORM set_config('zanita.test_current_time', '2026-10-05 10:00:00', true);

        PERFORM public.submit_order(
          'e0000000-0000-0000-0000-000000000001'::uuid,
          'Customer', '6642222222', 'cetys_qa@zanita.local',
          '2026-10-07'::date, '17:00'::time,
          'dddd0001-0000-0000-0000-000000000000'::uuid, NULL, 'Zero config attempt',
          jsonb_build_array(jsonb_build_object(
            'product_id', '${PRODUCT_MANZANITA_ID}', 'product_name', 'Manzanita',
            'base_price_cents', 5000, 'final_price_cents', 5000,
            'quantity', 1, 'subtotal_cents', 5000, 'options', '[]'::jsonb
          ))
        );
      END $$;
    `);
  } catch (err: unknown) {
    const errorObj = err as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    const msg = (errorObj.stderr || errorObj.stdout || errorObj.message || '').toString();
    zeroConfigRejected = msg.includes('configurad') || msg.includes('disponible') || msg.includes('P0037');
  }
  assert(zeroConfigRejected, 'Unconfigured delivery point rejected by submit_order with P0037');
  console.log();
}

function testOverridesAndBlocks() {
  console.log('8. Running Overrides & Subtractive Blocks Tests...');

  // Set closed override for Wednesday 2026-10-07 on CETYS
  runSql(`
    INSERT INTO public.zanita_calendar_overrides (
      override_date, delivery_mode, delivery_point_id, status, created_by
    ) VALUES (
      '2026-10-07', 'cetys_pickup', NULL, 'closed', '${TEST_ADMIN_ID}'
    );
  `);

  let closedOverrideRejected = false;
  try {
    runSql(`
      DO $$
      BEGIN
        PERFORM set_config('request.jwt.claim.sub', '${TEST_CETYS_USER_ID}', true);
        PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_CETYS_USER_ID}","role":"authenticated"}', true);
        PERFORM set_config('zanita.test_current_time', '2026-10-05 10:00:00', true);

        PERFORM public.submit_order(
          'f0000000-0000-0000-0000-000000000001'::uuid,
          'Customer', '6642222222', 'cetys_qa@zanita.local',
          '2026-10-07'::date, '17:00'::time,
          '${CETYS_POINT_ID}'::uuid, NULL, 'Closed day attempt',
          jsonb_build_array(jsonb_build_object(
            'product_id', '${PRODUCT_MANZANITA_ID}', 'product_name', 'Manzanita',
            'base_price_cents', 5000, 'final_price_cents', 5000,
            'quantity', 1, 'subtotal_cents', 5000, 'options', '[]'::jsonb
          ))
        );
      END $$;
    `);
  } catch (err: unknown) {
    const errorObj = err as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    const msg = (errorObj.stderr || errorObj.stdout || errorObj.message || '').toString();
    closedOverrideRejected = msg.includes('no tiene servicio') || msg.includes('P0037');
  }
  assert(closedOverrideRejected, 'Calendar closed override rejects order with P0037');

  runSql(`DELETE FROM public.zanita_calendar_overrides WHERE override_date = '2026-10-07';`);

  // Subtractive block test: Block 17:00 to 18:00 on Wednesday 2026-10-07
  // Provide QA override with 60m interval so 16:00, 18:00, 19:00 are available
  runSql(`
    INSERT INTO public.zanita_calendar_overrides (
      override_date, delivery_mode, delivery_point_id, status,
      open_time, close_time, slot_interval_minutes, min_lead_minutes, created_by
    ) VALUES (
      '2026-10-07', 'cetys_pickup', NULL, 'open',
      '16:00', '20:00', 60, 1440, '${TEST_ADMIN_ID}'
    );
    INSERT INTO public.zanita_availability_blocks (
      block_date, start_time, end_time, delivery_mode, delivery_point_id, reason, created_by
    ) VALUES (
      '2026-10-07', '17:00', '18:00', 'cetys_pickup', NULL, 'Maintenance block', '${TEST_ADMIN_ID}'
    );
  `);

  let blockedSlotRejected = false;
  try {
    runSql(`
      DO $$
      BEGIN
        PERFORM set_config('request.jwt.claim.sub', '${TEST_CETYS_USER_ID}', true);
        PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_CETYS_USER_ID}","role":"authenticated"}', true);
        PERFORM set_config('zanita.test_current_time', '2026-10-05 10:00:00', true);

        PERFORM public.submit_order(
          'f0000000-0000-0000-0000-000000000002'::uuid,
          'Customer', '6642222222', 'cetys_qa@zanita.local',
          '2026-10-07'::date, '17:00'::time,
          '${CETYS_POINT_ID}'::uuid, NULL, 'Blocked slot attempt',
          jsonb_build_array(jsonb_build_object(
            'product_id', '${PRODUCT_MANZANITA_ID}', 'product_name', 'Manzanita',
            'base_price_cents', 5000, 'final_price_cents', 5000,
            'quantity', 1, 'subtotal_cents', 5000, 'options', '[]'::jsonb
          ))
        );
      END $$;
    `);
  } catch (err: unknown) {
    const errorObj = err as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    const msg = (errorObj.stderr || errorObj.stdout || errorObj.message || '').toString();
    blockedSlotRejected = msg.includes('no está disponible') || msg.includes('P0037');
  }
  assert(blockedSlotRejected, 'Subtractive block at 17:00 rejects order with P0037');

  // But slot at 18:00 (outside block) is ALLOWED!
  runSql(`
    DO $$
    DECLARE
      v_res jsonb;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '${TEST_CETYS_USER_ID}', true);
      PERFORM set_config('request.jwt.claims', '{"sub":"${TEST_CETYS_USER_ID}","role":"authenticated"}', true);
      PERFORM set_config('zanita.test_current_time', '2026-10-05 10:00:00', true);

      v_res := public.submit_order(
        'f0000000-0000-0000-0000-000000000003'::uuid,
        'Customer', '6642222222', 'cetys_qa@zanita.local',
        '2026-10-07'::date, '18:00'::time,
        '${CETYS_POINT_ID}'::uuid, NULL, 'Unblocked slot attempt',
        jsonb_build_array(jsonb_build_object(
          'product_id', '${PRODUCT_MANZANITA_ID}', 'product_name', 'Manzanita',
          'base_price_cents', 5000, 'final_price_cents', 5000,
          'quantity', 1, 'subtotal_cents', 5000, 'options', '[]'::jsonb
        ))
      );
      IF v_res->>'status' != 'pending_approval' THEN
        RAISE EXCEPTION 'Unblocked slot failed: %', v_res;
      END IF;
    END $$;
  `);
  assert(true, 'Slot outside subtractive block (18:00) is accepted successfully');

  runSql(`
    DELETE FROM public.zanita_availability_blocks WHERE block_date = '2026-10-07';
    DELETE FROM public.zanita_calendar_overrides WHERE override_date = '2026-10-07';
  `);
  console.log();
}

function teardown() {
  console.log('9. Tearing down test artifacts...');
  runSql(`
    DELETE FROM public.zanita_order_item_options;
    DELETE FROM public.zanita_order_items;
    DELETE FROM public.zanita_orders;
    DELETE FROM public.zanita_calendar_overrides;
    DELETE FROM public.zanita_availability_blocks;
    UPDATE public.zanita_availability_rules SET slot_interval_minutes = NULL WHERE delivery_mode = 'cetys_pickup';
    DELETE FROM public.profiles WHERE id IN ('${TEST_ADMIN_ID}', '${TEST_CETYS_USER_ID}', '${TEST_UNAUTH_USER_ID}');
    DELETE FROM auth.users WHERE id IN ('${TEST_ADMIN_ID}', '${TEST_CETYS_USER_ID}', '${TEST_UNAUTH_USER_ID}');
  `);
  console.log('   All QA orders, blocks, overrides, test users deleted, and CETYS recurring rules restored to NULL.\n');
}

async function main() {
  try {
    await setup();
    testCetysBaselineUnconfigured();
    testFutureOrderMatrixWithConfiguredQA();
    testSameDayCutoffMatrix();
    testCetysStandModeAndLeadTime();
    testUnauthorizedCetys();
    testZeroConfigSafety();
    testOverridesAndBlocks();
    teardown();

    console.log('========================================================');
    console.log(`ALL TESTS PASSED: ${testsPassed} passed, ${testsFailed} failed.`);
    console.log('PASS 8D.3R.4A — AVAILABILITY AUTHORITY FULLY VERIFIED.');
    console.log('========================================================\n');
  } catch (error) {
    console.error('Test suite failed:', error);
    try {
      teardown();
    } catch {}
    process.exit(1);
  }
}

main();
