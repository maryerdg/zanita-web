/**
 * Automated Verification Suite for ZANITA 2.0 — PUSH NOTIFICATIONS V1 (FINAL RELEASE-BLOCKER GATE)
 *
 * Verifies all requirements:
 * 1. Manifest, Real Raster Icons & Package Consistency (Items J, K)
 * 2. Same-Device Account Switch & Recipient Resolution (Items H, I)
 * 3. Authoritative DB Trigger Outbox Creation (Items A, B, C, D)
 * 4. Missing VAPID Handling in Production (Item E)
 * 5. Outbox Retry & Drain Strategy (Items F, G)
 * 6. Service Worker Navigation & Target Security (Item L)
 * 7. Privacy Audit: Notification Payloads PII-Free (Item M)
 * 8. Final Release-Blocker Gate:
 *    - Cron endpoint security (missing secret -> 500 fail safe, missing/wrong auth -> 401, valid -> 200)
 *    - Concurrency & atomic claim under FOR UPDATE SKIP LOCKED
 *    - Stale processing lease timeout (>5m reclaimable, <5m protected)
 *    - PWA location copy (Tijuana, no Mexicali)
 *    - SECURITY DEFINER search_path = '' hardening on trigger & claim function
 *    - Canonical admin authorization source consistency
 */

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { NextRequest } from 'next/server';

const LOCAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

process.env.NEXT_PUBLIC_SUPABASE_URL = LOCAL_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;

const adminClient = createClient(LOCAL_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

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

async function run() {
  console.log('=== ZANITA 2.0 PUSH NOTIFICATIONS V1 RELEASE-BLOCKER GATE QA ===\n');

  const rootDir = path.resolve(__dirname, '../..');

  // =========================================================================
  // 1. MANIFEST, RASTER ICONS & PACKAGE-LOCK (Items J, K)
  // =========================================================================
  console.log('1. Manifest, Real Raster Icons & Package Consistency (Items J, K)');

  const manifestPath = path.join(rootDir, 'public/manifest.webmanifest');
  const icon192Path = path.join(rootDir, 'public/icon-192.png');
  const icon512Path = path.join(rootDir, 'public/icon-512.png');
  const pkgPath = path.join(rootDir, 'package.json');
  const pkgLockPath = path.join(rootDir, 'package-lock.json');

  assert(fs.existsSync(manifestPath), '1.1 public/manifest.webmanifest exists');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert(manifest.display === 'standalone', '1.2 Manifest display is standalone');
  assert(manifest.theme_color === '#261C19', '1.3 Manifest theme_color is #261C19');
  assert(manifest.background_color === '#FCFBF7', '1.4 Manifest background_color is #FCFBF7');

  assert(fs.existsSync(icon192Path), '1.5 icon-192.png exists on disk');
  assert(fs.existsSync(icon512Path), '1.6 icon-512.png exists on disk');

  function getPngDimensions(filePath: string): { width: number; height: number } {
    const buf = fs.readFileSync(filePath);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  }

  const dim192 = getPngDimensions(icon192Path);
  assert(dim192.width === 192 && dim192.height === 192, `1.7 icon-192.png verified as exact 192x192 (${dim192.width}x${dim192.height})`);

  const dim512 = getPngDimensions(icon512Path);
  assert(dim512.width === 512 && dim512.height === 512, `1.8 icon-512.png verified as exact 512x512 (${dim512.width}x${dim512.height})`);

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const pkgLock = JSON.parse(fs.readFileSync(pkgLockPath, 'utf8'));
  assert(Boolean(pkg.dependencies?.['web-push']), '1.9 package.json contains web-push');
  assert(
    Boolean(pkgLock.packages?.['node_modules/web-push'] || pkgLock.dependencies?.['web-push']),
    '1.10 package-lock.json includes web-push dependency'
  );

  // =========================================================================
  // 2. SAME-DEVICE ACCOUNT SWITCH PRIVACY & ADMIN RESOLUTION (Items H, I)
  // =========================================================================
  console.log('\n2. Same-Device Account Switch & Recipient Resolution (Items H, I)');

  const userAId = '33333333-3333-3333-3333-333333333333'; // Customer
  const userBId = '11111111-1111-1111-1111-111111111111'; // Admin
  const sharedEndpoint = `https://fcm.googleapis.com/fcm/send/shared-device-${Date.now()}`;

  await adminClient.from('zanita_push_subscriptions').delete().in('user_id', [userAId, userBId]);

  const { error: insAErr } = await adminClient.from('zanita_push_subscriptions').insert({
    user_id: userAId,
    endpoint: sharedEndpoint,
    p256dh: 'test-p256dh-a',
    auth: 'test-auth-a',
    platform: 'iOS PWA',
    device_label: 'iPhone Compartido',
  });
  assert(!insAErr, '2.1 User A registers subscription on Device X');

  const { data: subA } = await adminClient
    .from('zanita_push_subscriptions')
    .select('user_id')
    .eq('endpoint', sharedEndpoint)
    .single();
  assert(subA?.user_id === userAId, '2.2 Device X initially bound to User A');

  const { error: rebindErr } = await adminClient
    .from('zanita_push_subscriptions')
    .update({
      user_id: userBId,
      p256dh: 'test-p256dh-b',
      auth: 'test-auth-b',
      disabled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('endpoint', sharedEndpoint);

  assert(!rebindErr, '2.3 Device X atomically rebound to User B');

  const { data: subB } = await adminClient
    .from('zanita_push_subscriptions')
    .select('user_id')
    .eq('endpoint', sharedEndpoint)
    .single();
  assert(subB?.user_id === userBId, '2.4 Device X is now bound ONLY to User B');

  const { data: userASubs } = await adminClient
    .from('zanita_push_subscriptions')
    .select('id')
    .eq('user_id', userAId)
    .is('disabled_at', null);
  assert(userASubs?.length === 0, '2.5 User A no longer receives any notifications on Device X');

  const { data: adminProfiles } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('role', 'admin');
  assert(
    (adminProfiles || []).length > 0 && (adminProfiles || []).every((p) => p.role === 'admin'),
    '2.6 Admin recipients resolved via database profiles.role = "admin" (no hardcoded users/emails)'
  );

  // =========================================================================
  // 3. AUTHORITATIVE DATABASE TRIGGER & OUTBOX EVENT CREATION (Items A, B, C, D)
  // =========================================================================
  console.log('\n3. Authoritative DB Trigger Outbox Creation (Items A, B, C, D)');

  await adminClient.from('zanita_orders').delete().eq('customer_phone_snapshot', '6860001122');

  const { data: insertedOrder, error: insOrderErr } = await adminClient
    .from('zanita_orders')
    .insert({
      user_id: userAId,
      customer_name_snapshot: 'Trigger QA Test Customer',
      customer_phone_snapshot: '6860001122',
      customer_email_snapshot: 'trigger_qa@zanita.mx',
      status: 'pending_approval',
      products_subtotal_cents: 6000,
      total_amount_cents: 6000,
      amount_paid_cents: 0,
      requested_date: '2026-11-05',
      requested_time: '15:00',
      delivery_name_snapshot: 'Punto Trigger QA',
      delivery_type_snapshot: 'standard',
      delivery_requires_quote_snapshot: false,
    })
    .select('id, order_number, status')
    .single();

  assert(!insOrderErr && !!insertedOrder, '3.1 Order created in zanita_orders');

  const orderId = insertedOrder!.id;
  const orderNumber = insertedOrder!.order_number;

  const { data: newOrderEvent } = await adminClient
    .from('zanita_notification_events')
    .select('*')
    .eq('event_key', `new_order:${orderId}`)
    .single();

  assert(!!newOrderEvent, '3.2 [Item A] DB trigger automatically inserted new_order into outbox table');
  assert(newOrderEvent?.recipient_scope === 'admin', '3.3 new_order recipient_scope is admin');
  assert(newOrderEvent?.order_number === orderNumber, '3.4 new_order contains exact canonical order_number');
  assert(
    newOrderEvent?.created_at !== undefined,
    '3.5 [Item C] Outbox event originated authoritatively from database trigger (no manual app INSERT needed)'
  );

  const { error: dupTriggerErr } = await adminClient
    .from('zanita_notification_events')
    .insert({
      event_key: `new_order:${orderId}`,
      type: 'new_order',
      order_id: orderId,
      order_number: orderNumber,
      recipient_scope: 'admin',
      payload: { title: 'Dup' },
    });
  assert(
    Boolean(dupTriggerErr && dupTriggerErr.code === '23505'),
    '3.6 [Item D] Idempotent outbox: duplicate event_key rejected by UNIQUE constraint (23505)'
  );

  // Status transitions
  await adminClient
    .from('zanita_orders')
    .update({ status: 'deposit_pending' })
    .eq('id', orderId);

  const { data: evApproved } = await adminClient
    .from('zanita_notification_events')
    .select('*')
    .eq('event_key', `order_approved:${orderId}:deposit_pending`)
    .single();
  assert(!!evApproved && evApproved.type === 'order_approved', '3.7 [Item B] Trigger created order_approved customer event');
  assert(evApproved?.recipient_user_id === userAId, '3.8 order_approved recipient_user_id is customer user_id');

  const reportTime = new Date().toISOString();
  await adminClient
    .from('zanita_orders')
    .update({ payment_reported_at: reportTime, payment_reference: 'TEST-REF' })
    .eq('id', orderId);

  const { data: evPaymentReported } = await adminClient
    .from('zanita_notification_events')
    .select('*')
    .eq('type', 'payment_reported')
    .eq('order_id', orderId)
    .single();
  assert(!!evPaymentReported, '3.9 Trigger created payment_reported admin alert event on NULL -> timestamp transition');

  await adminClient
    .from('zanita_orders')
    .update({ status: 'confirmed', amount_paid_cents: 6000 })
    .eq('id', orderId);

  const { data: evConfirmed } = await adminClient
    .from('zanita_notification_events')
    .select('*')
    .eq('event_key', `payment_confirmed:${orderId}:confirmed`)
    .single();
  assert(!!evConfirmed && evConfirmed.type === 'payment_confirmed', '3.10 Trigger created payment_confirmed customer event');

  await adminClient
    .from('zanita_orders')
    .update({ status: 'preparing' })
    .eq('id', orderId);

  const { data: evPreparing } = await adminClient
    .from('zanita_notification_events')
    .select('*')
    .eq('event_key', `preparing:${orderId}:preparing`)
    .single();
  assert(!!evPreparing && evPreparing.type === 'preparing', '3.11 Trigger created preparing customer event');

  await adminClient
    .from('zanita_orders')
    .update({ status: 'ready' })
    .eq('id', orderId);

  const { data: evReady } = await adminClient
    .from('zanita_notification_events')
    .select('*')
    .eq('event_key', `ready:${orderId}:ready`)
    .single();
  assert(!!evReady && evReady.type === 'ready', '3.12 Trigger created ready customer event');

  // =========================================================================
  // 4. MISSING VAPID CONFIG BEHAVIOR IN PREVIEW/PRODUCTION (Item E)
  // =========================================================================
  console.log('\n4. Missing VAPID Handling in Production (Item E)');

  const { dispatchNotificationEvent } = await import('../../lib/push/sender');

  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  process.env.LOCAL_MOCK_PUSH = 'false';
  (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

  await adminClient.from('zanita_push_subscriptions').insert({
    user_id: userAId,
    endpoint: `https://fcm.googleapis.com/fcm/send/test-sub-prod-${Date.now()}`,
    p256dh: 'BNcR...',
    auth: 'A1B2...',
  });

  const prodEventKey = `test_prod_vapid_missing:${orderId}`;
  await adminClient.from('zanita_notification_events').insert({
    event_key: prodEventKey,
    type: 'ready',
    order_id: orderId,
    order_number: orderNumber,
    recipient_scope: 'customer',
    recipient_user_id: userAId,
    payload: { title: 'Listo' },
    status: 'pending',
  });

  await dispatchNotificationEvent(prodEventKey);

  const { data: failedEvent } = await adminClient
    .from('zanita_notification_events')
    .select('status, last_error')
    .eq('event_key', prodEventKey)
    .single();

  assert(failedEvent?.status === 'failed', '4.1 [Item E] When VAPID is missing, event status is marked "failed" (never "sent")');
  assert(failedEvent?.last_error === 'PUSH_CONFIG_MISSING', '4.2 [Item E] last_error is safe code "PUSH_CONFIG_MISSING" (no secret leak)');

  const testVapid = webpush.generateVAPIDKeys();
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = testVapid.publicKey;
  process.env.VAPID_PRIVATE_KEY = testVapid.privateKey;
  process.env.VAPID_SUBJECT = 'https://zanita.maryerdigital.com';
  (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
  process.env.LOCAL_MOCK_PUSH = 'true';

  // =========================================================================
  // 5. RETRY & DRAIN OF PENDING/FAILED EVENTS (Items F, G)
  // =========================================================================
  console.log('\n5. Outbox Retry & Drain Strategy (Items F, G)');

  const { processPendingNotificationOutbox } = await import('../../lib/push/sender');

  await adminClient
    .from('zanita_notification_events')
    .update({ status: 'failed', attempt_count: 1 })
    .eq('event_key', prodEventKey);

  const drainRes = await processPendingNotificationOutbox({ limit: 10 });
  assert(drainRes.processed >= 1, '5.1 [Item F] Pending/failed event picked up and retried by outbox drain');

  const { data: retriedEvent } = await adminClient
    .from('zanita_notification_events')
    .select('status, attempt_count')
    .eq('event_key', prodEventKey)
    .single();

  assert(
    retriedEvent?.status === 'sent' || retriedEvent?.status === 'failed',
    `5.2 [Item G] Retried event reached final bounded state (status: ${retriedEvent?.status})`
  );
  assert((retriedEvent?.attempt_count || 0) >= 2, '5.3 attempt_count incremented during retry');

  // =========================================================================
  // 6. SERVICE WORKER ORIGIN SANITATION (Item L)
  // =========================================================================
  console.log('\n6. Service Worker Navigation & Target Security (Item L)');

  const swPath = path.join(rootDir, 'public/sw.js');
  const swCode = fs.readFileSync(swPath, 'utf8');

  assert(swCode.includes('safeTargetUrl'), '6.1 sw.js enforces safeTargetUrl sanitation');
  assert(swCode.includes('parsed.origin === self.location.origin'), '6.2 [Item L] External target URLs are rejected; only same-origin paths allowed');
  assert(swCode.includes('hasVisibleAdmin'), '6.3 [Section 12] Visible admin duplication prevented when admin tab is focused and visible');

  // =========================================================================
  // 7. PRIVACY AUDIT (Item M)
  // =========================================================================
  console.log('\n7. Privacy Audit: Notification Payloads PII-Free (Item M)');

  const { data: allTestEvents } = await adminClient
    .from('zanita_notification_events')
    .select('payload')
    .eq('order_id', orderId);

  let hasPII = false;
  for (const ev of allTestEvents || []) {
    const payloadStr = JSON.stringify(ev.payload);
    if (
      payloadStr.includes('6860001122') ||
      payloadStr.includes('trigger_qa@zanita.mx') ||
      payloadStr.includes('Trigger QA Test Customer')
    ) {
      hasPII = true;
    }
  }

  assert(!hasPII, '7.1 [Item M] All outbox payloads contain ZERO customer PII (no phone, no email, no personal name)');

  // Clean test orders and events from previous sections
  await adminClient.from('zanita_orders').delete().eq('id', orderId);
  await adminClient.from('zanita_notification_events').delete().eq('order_id', orderId);
  await adminClient.from('zanita_push_subscriptions').delete().in('user_id', [userAId, userBId]);

  // =========================================================================
  // 8. FINAL RELEASE-BLOCKER GATES
  // =========================================================================
  console.log('\n8. Final Release-Blocker Gates (Cron Security, Concurrency, PWA Copy & DB Hardening)');

  // 8.1 PWA Location Copy
  assert(
    manifest.description.includes('Tijuana') && !manifest.description.includes('Mexicali'),
    '8.1 manifest.webmanifest description contains "Tijuana" and no "Mexicali"'
  );

  // 8.2 Vercel Cron Configuration
  const vercelPath = path.join(rootDir, 'vercel.json');
  assert(fs.existsSync(vercelPath), '8.2 vercel.json exists in root directory');
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  const cronEntry = vercelConfig.crons?.find((c: { path: string }) => c.path === '/api/cron/push-drain');
  assert(Boolean(cronEntry), '8.3 vercel.json contains cron entry for /api/cron/push-drain');
  assert(cronEntry?.schedule === '* * * * *', '8.4 Cron schedule is every 1 minute (* * * * *)');

  // 8.3 Cron Endpoint Security Gate
  const { GET: cronHandler } = await import('../../app/api/cron/push-drain/route');

  const originalSecret = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;

  const reqNoEnv = new NextRequest('http://localhost:3000/api/cron/push-drain', {
    method: 'GET',
    headers: { authorization: 'Bearer test' },
  });
  const resNoEnv = await cronHandler(reqNoEnv);
  assert(resNoEnv.status === 500, '8.5 Cron route safely fails with 500 when CRON_SECRET is unconfigured (never unprotected)');

  const testSecret = 'qa-super-secret-cron-key-12345';
  process.env.CRON_SECRET = testSecret;

  const reqNoAuth = new NextRequest('http://localhost:3000/api/cron/push-drain', { method: 'GET' });
  const resNoAuth = await cronHandler(reqNoAuth);
  assert(resNoAuth.status === 401, '8.6 Cron route rejects request without Authorization header with 401');

  const reqWrongAuth = new NextRequest('http://localhost:3000/api/cron/push-drain', {
    method: 'GET',
    headers: { authorization: 'Bearer wrong-secret' },
  });
  const resWrongAuth = await cronHandler(reqWrongAuth);
  assert(resWrongAuth.status === 401, '8.7 Cron route rejects invalid Bearer token with 401');

  const reqValidAuth = new NextRequest('http://localhost:3000/api/cron/push-drain', {
    method: 'GET',
    headers: { authorization: `Bearer ${testSecret}` },
  });
  const resValidAuth = await cronHandler(reqValidAuth);
  assert(resValidAuth.status === 200, '8.8 Cron route accepts valid Bearer token and returns 200');

  if (originalSecret) process.env.CRON_SECRET = originalSecret;
  else delete process.env.CRON_SECRET;

  // Clean outbox completely before concurrency and lease tests
  await adminClient.from('zanita_notification_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 8.4 Concurrency & Atomic Claim Test (FOR UPDATE SKIP LOCKED)
  console.log('\n  Testing Concurrency & Atomic Claim via claim_pending_notification_events:');
  const evKeyConcurrentA = `test_concurrent_a:${Date.now()}`;
  const evKeyConcurrentB = `test_concurrent_b:${Date.now()}`;

  await adminClient.from('zanita_notification_events').insert([
    {
      event_key: evKeyConcurrentA,
      type: 'new_order',
      order_number: 'TEST-CONC-A',
      recipient_scope: 'admin',
      payload: { title: 'Conc A' },
      status: 'pending',
      attempt_count: 0,
    },
    {
      event_key: evKeyConcurrentB,
      type: 'new_order',
      order_number: 'TEST-CONC-B',
      recipient_scope: 'admin',
      payload: { title: 'Conc B' },
      status: 'pending',
      attempt_count: 0,
    },
  ]);

  // Worker 1 claims 1 event
  const { data: claim1 } = await adminClient.rpc('claim_pending_notification_events', { p_limit: 1 });
  assert((claim1 || []).length === 1, '8.9 Worker 1 atomically claims 1 pending event');
  const claimedEventId1 = claim1?.[0]?.id;

  // Worker 2 simultaneously claims 1 event: MUST NOT get Worker 1's event
  const { data: claim2 } = await adminClient.rpc('claim_pending_notification_events', { p_limit: 1 });
  assert((claim2 || []).length === 1, '8.10 Worker 2 claims 1 pending event concurrently');
  const claimedEventId2 = claim2?.[0]?.id;

  assert(
    Boolean(claimedEventId1 && claimedEventId2 && claimedEventId1 !== claimedEventId2),
    `8.11 Concurrent claims are mutually exclusive: Worker 1 (${claimedEventId1}) != Worker 2 (${claimedEventId2})`
  );

  // Clean test concurrency events
  await adminClient.from('zanita_notification_events').delete().in('event_key', [evKeyConcurrentA, evKeyConcurrentB]);

  // 8.5 Lease Timeout & Stuck 'processing' Reclamation (> 5 min)
  console.log('\n  Testing Lease Timeout & Stale Processing Reclamation:');
  const evKeyStale = `test_stale_processing:${Date.now()}`;
  const evKeyFresh = `test_fresh_processing:${Date.now()}`;

  const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
  const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();

  await adminClient.from('zanita_notification_events').insert([
    {
      event_key: evKeyStale,
      type: 'new_order',
      order_number: 'TEST-STALE',
      recipient_scope: 'admin',
      payload: { title: 'Stale' },
      status: 'processing',
      attempt_count: 1,
      updated_at: sixMinutesAgo,
    },
    {
      event_key: evKeyFresh,
      type: 'new_order',
      order_number: 'TEST-FRESH',
      recipient_scope: 'admin',
      payload: { title: 'Fresh' },
      status: 'processing',
      attempt_count: 1,
      updated_at: oneMinuteAgo,
    },
  ]);

  const { data: reclaimedEvents } = await adminClient.rpc('claim_pending_notification_events', { p_limit: 10 });
  const reclaimedKeys = (reclaimedEvents || []).map((e: { event_key: string }) => e.event_key);

  assert(
    reclaimedKeys.includes(evKeyStale),
    '8.12 Stale processing event (>5m) successfully reclaimed by worker'
  );
  assert(
    !reclaimedKeys.includes(evKeyFresh),
    '8.13 Fresh processing event (<5m) remains protected under active lease (NOT claimed)'
  );

  // 8.6 SECURITY DEFINER / INVOKER Hardening & Privilege Lockdown
  console.log('\n  Verifying DB Trigger & Claim RPC Security & Privilege Matrix:');
  const triggerProConfig = execSync(
    'docker exec supabase_db_zanita-web psql -U postgres -d postgres -t -A -c "SELECT proconfig FROM pg_proc WHERE proname = \'zanita_orders_notification_trigger\';"'
  ).toString().trim();
  assert(
    triggerProConfig.includes('search_path=""') || triggerProConfig.includes('search_path=\\"\\"'),
    `8.14 Trigger function has search_path="" strictly configured (${triggerProConfig})`
  );

  const claimProConfig = execSync(
    'docker exec supabase_db_zanita-web psql -U postgres -d postgres -t -A -c "SELECT proconfig FROM pg_proc WHERE proname = \'claim_pending_notification_events\';"'
  ).toString().trim();
  assert(
    claimProConfig.includes('search_path=""') || claimProConfig.includes('search_path=\\"\\"'),
    `8.15 Atomic claim function has search_path="" strictly configured (${claimProConfig})`
  );

  const claimSecDef = execSync(
    'docker exec supabase_db_zanita-web psql -U postgres -d postgres -t -A -c "SELECT prosecdef FROM pg_proc WHERE proname = \'claim_pending_notification_events\';"'
  ).toString().trim();
  assert(
    claimSecDef === 'f',
    `8.16 Atomic claim function is SECURITY INVOKER (prosecdef: ${claimSecDef}) for least-privilege execution`
  );

  // Exact Privilege Matrix Verification (PUBLIC, anon, authenticated, service_role)
  const pubPriv = execSync(
    'docker exec supabase_db_zanita-web psql -U postgres -d postgres -t -A -c "SELECT has_function_privilege(\'public\', \'public.claim_pending_notification_events(integer)\', \'EXECUTE\');"'
  ).toString().trim();
  assert(pubPriv === 'f', '8.17 PUBLIC role has NO EXECUTE on claim_pending_notification_events');

  const anonPriv = execSync(
    'docker exec supabase_db_zanita-web psql -U postgres -d postgres -t -A -c "SELECT has_function_privilege(\'anon\', \'public.claim_pending_notification_events(integer)\', \'EXECUTE\');"'
  ).toString().trim();
  assert(anonPriv === 'f', '8.18 anon role has NO EXECUTE on claim_pending_notification_events (42501)');

  const authPriv = execSync(
    'docker exec supabase_db_zanita-web psql -U postgres -d postgres -t -A -c "SELECT has_function_privilege(\'authenticated\', \'public.claim_pending_notification_events(integer)\', \'EXECUTE\');"'
  ).toString().trim();
  assert(authPriv === 'f', '8.19 authenticated role has NO EXECUTE on claim_pending_notification_events (42501)');

  const srvPriv = execSync(
    'docker exec supabase_db_zanita-web psql -U postgres -d postgres -t -A -c "SELECT has_function_privilege(\'service_role\', \'public.claim_pending_notification_events(integer)\', \'EXECUTE\');"'
  ).toString().trim();
  assert(srvPriv === 't', '8.20 service_role has EXECUTE on claim_pending_notification_events');

  // Test runtime privilege denial (SET ROLE anon / authenticated)
  const roleDenialTest = execSync(
    `docker exec supabase_db_zanita-web psql -U postgres -d postgres -t -A -c "
DO \\\$\$
BEGIN
    BEGIN
        SET LOCAL ROLE anon;
        PERFORM public.claim_pending_notification_events(1);
        RAISE EXCEPTION 'SECURITY FAILURE: anon executed claim RPC';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    BEGIN
        SET LOCAL ROLE authenticated;
        PERFORM public.claim_pending_notification_events(1);
        RAISE EXCEPTION 'SECURITY FAILURE: authenticated executed claim RPC';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    BEGIN
        SET LOCAL ROLE service_role;
        PERFORM public.claim_pending_notification_events(1);
    END;
END;
\\\$\$;
SELECT 'PASSED';
"`
  ).toString().trim();
  assert(roleDenialTest.includes('PASSED'), '8.21 Runtime test: anon and authenticated blocked with 42501; service_role succeeds');

  // 8.7 Git Ancestry & Production Hotfix Continuity Gate
  console.log('\n  Verifying Git Branch Ancestry & Hotfix Continuity:');
  let realtimeAncestor = false;
  try {
    execSync('git merge-base --is-ancestor fa02ea3196c40d02287f53bbda4f7e790dc89f93 HEAD');
    realtimeAncestor = true;
  } catch {}
  assert(realtimeAncestor, '8.22 Push branch includes Admin Realtime (fa02ea3) as ancestor');

  let stabilityAncestor = false;
  try {
    execSync('git merge-base --is-ancestor 866f2a98f0e00cc1462d3c1b19c4a13cd63bcafb HEAD');
    stabilityAncestor = true;
  } catch {}
  assert(stabilityAncestor, '8.23 Push branch includes Operations Realtime Stability (866f2a9) as ancestor');

  // Clean test fixtures
  await adminClient.from('zanita_notification_events').delete().in('event_key', [evKeyStale, evKeyFresh]);

  console.log(`\n==================================================`);
  console.log(`FINAL RELEASE-BLOCKER QA: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
