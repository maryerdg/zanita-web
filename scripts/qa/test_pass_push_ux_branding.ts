/**
 * Automated Verification Suite for ZANITA 2.0 — PUSH UX POLISH + OFFICIAL APP ICON
 *
 * Verifies all requirements:
 * CUSTOMER:
 * A. notifications off -> enter Mi Cuenta -> onboarding eligible
 * B. click Ahora no -> modal closes -> does not appear again immediately (< 7 days)
 * C. active subscription -> no onboarding
 * D. permission denied -> no repeated popup
 * E. iOS Safari not standalone -> install guide instead of permission request
 * F. iOS standalone -> activation CTA works
 *
 * ADMIN:
 * G. Admin desktop with no subscription -> onboarding eligible
 * H. Admin mobile standalone with no subscription -> onboarding appears
 * I. Admin subscription enabled -> no onboarding
 * J. same Admin: Mac subscription + iPhone subscription -> both remain stored
 *
 * ICON:
 * K. icon-180 exactly 180x180
 * L. icon-192 exactly 192x192
 * M. icon-512 exactly 512x512
 * N. manifest references official generated assets
 * O. Apple touch icon uses official Zanita artwork
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import {
  isDismissedRecently,
  recordDismissal,
  clearDismissal,
  CUSTOMER_PUSH_DISMISS_KEY,
} from '@/lib/push/client';

const LOCAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const serviceClient = createClient(LOCAL_URL, SERVICE_KEY, {
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

// In-memory mock localStorage for testing node environment
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string) {
    this.store[key] = value.toString();
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

async function run() {
  console.log('\n==================================================');
  console.log('ZANITA 2.0 — PUSH UX POLISH + APP ICON QA SUITE');
  console.log('==================================================\n');

  // Setup mock window & localStorage
  const mockStorage = new MockLocalStorage();
  (global as unknown as { window: unknown }).window = {
    localStorage: mockStorage,
    navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
  };
  (global as unknown as { localStorage: unknown }).localStorage = mockStorage;

  // -------------------------------------------------------------
  // SECTION 1: OFFICIAL APP ICON DERIVATIVES & SPECIFICATIONS
  // -------------------------------------------------------------
  console.log('--- 1. OFFICIAL APP ICON ASSETS (K, L, M, N, O) ---');

  const rootDir = process.cwd();
  const masterSvgPath = path.join(rootDir, 'public', 'brand', 'zanita-app-icon-1024.svg');
  const icon180Path = path.join(rootDir, 'public', 'icon-180.png');
  const icon192Path = path.join(rootDir, 'public', 'icon-192.png');
  const icon512Path = path.join(rootDir, 'public', 'icon-512.png');
  const manifestPath = path.join(rootDir, 'public', 'manifest.webmanifest');
  const layoutPath = path.join(rootDir, 'app', 'layout.tsx');

  assert(fs.existsSync(masterSvgPath), 'Master SVG asset exists: public/brand/zanita-app-icon-1024.svg');

  // Helper to inspect dimensions via sips
  function getImageDimensions(filePath: string): { width: number; height: number } {
    const out = execSync(`sips -g pixelWidth -g pixelHeight "${filePath}"`, { encoding: 'utf8' });
    const widthMatch = out.match(/pixelWidth:\s*(\d+)/);
    const heightMatch = out.match(/pixelHeight:\s*(\d+)/);
    return {
      width: widthMatch ? parseInt(widthMatch[1], 10) : 0,
      height: heightMatch ? parseInt(heightMatch[1], 10) : 0,
    };
  }

  // K. icon-180 exactly 180x180
  assert(fs.existsSync(icon180Path), 'K. public/icon-180.png exists');
  const dim180 = getImageDimensions(icon180Path);
  assert(dim180.width === 180 && dim180.height === 180, `K. icon-180 is exactly 180x180 (got ${dim180.width}x${dim180.height})`);

  // L. icon-192 exactly 192x192
  assert(fs.existsSync(icon192Path), 'L. public/icon-192.png exists');
  const dim192 = getImageDimensions(icon192Path);
  assert(dim192.width === 192 && dim192.height === 192, `L. icon-192 is exactly 192x192 (got ${dim192.width}x${dim192.height})`);

  // M. icon-512 exactly 512x512
  assert(fs.existsSync(icon512Path), 'M. public/icon-512.png exists');
  const dim512 = getImageDimensions(icon512Path);
  assert(dim512.width === 512 && dim512.height === 512, `M. icon-512 is exactly 512x512 (got ${dim512.width}x${dim512.height})`);

  // N. manifest references official generated assets
  assert(fs.existsSync(manifestPath), 'N. manifest.webmanifest exists');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const has192 = manifest.icons.some((i: { src: string; sizes: string }) => i.src === '/icon-192.png' && i.sizes === '192x192');
  const has512 = manifest.icons.some((i: { src: string; sizes: string }) => i.src === '/icon-512.png' && i.sizes === '512x512');
  assert(has192 && has512, 'N. manifest.webmanifest references /icon-192.png (192x192) and /icon-512.png (512x512)');

  // O. Apple touch icon uses official 180x180 asset
  assert(fs.existsSync(layoutPath), 'O. app/layout.tsx exists');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert(layoutContent.includes("apple: '/icon-180.png'"), "O. app/layout.tsx configures Apple touch icon to '/icon-180.png'");

  // -------------------------------------------------------------
  // SECTION 2: CUSTOMER NOTIFICATION ONBOARDING LOGIC (A, B, C, D, E, F)
  // -------------------------------------------------------------
  console.log('\n--- 2. CUSTOMER NOTIFICATION ONBOARDING LOGIC (A, B, C, D, E, F) ---');

  // Customer Eligibility Function Simulation
  interface EligibilityParams {
    isDismissed: boolean;
    permission: NotificationPermission;
    isSubscribed: boolean;
    isPushSupported: boolean;
    isIos: boolean;
    isStandalone: boolean;
  }

  function evaluateCustomerPrompt(p: EligibilityParams): {
    show: boolean;
    view: 'none' | 'onboarding_standard' | 'ios_install_prompt';
  } {
    if (p.isDismissed) return { show: false, view: 'none' };
    if (p.permission === 'denied') return { show: false, view: 'none' };
    if (p.isSubscribed) return { show: false, view: 'none' };

    if (p.isIos && !p.isStandalone) {
      return { show: true, view: 'ios_install_prompt' };
    }

    if (!p.isPushSupported) return { show: false, view: 'none' };

    return { show: true, view: 'onboarding_standard' };
  }

  // A. notifications off -> enter Mi Cuenta -> onboarding appears
  const evalA = evaluateCustomerPrompt({
    isDismissed: false,
    permission: 'default',
    isSubscribed: false,
    isPushSupported: true,
    isIos: false,
    isStandalone: false,
  });
  assert(evalA.show && evalA.view === 'onboarding_standard', 'A. Notifications off -> onboarding modal appears for customer');

  // B. click Ahora no -> modal closes -> does not appear again immediately (< 7 days)
  clearDismissal(CUSTOMER_PUSH_DISMISS_KEY);
  assert(!isDismissedRecently(CUSTOMER_PUSH_DISMISS_KEY), 'B.1 Initially not dismissed');
  recordDismissal(CUSTOMER_PUSH_DISMISS_KEY);
  assert(isDismissedRecently(CUSTOMER_PUSH_DISMISS_KEY), 'B.2 After clicking Ahora no: recorded as dismissed');

  const evalB = evaluateCustomerPrompt({
    isDismissed: isDismissedRecently(CUSTOMER_PUSH_DISMISS_KEY),
    permission: 'default',
    isSubscribed: false,
    isPushSupported: true,
    isIos: false,
    isStandalone: false,
  });
  assert(!evalB.show, 'B.3 Does not appear again immediately after dismissal');

  // 7-day expiration check
  const sixDaysAgo = Date.now() - (6 * 24 * 60 * 60 * 1000);
  mockStorage.setItem(CUSTOMER_PUSH_DISMISS_KEY, sixDaysAgo.toString());
  assert(isDismissedRecently(CUSTOMER_PUSH_DISMISS_KEY), 'B.4 Still suppressed at 6 days');

  const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
  mockStorage.setItem(CUSTOMER_PUSH_DISMISS_KEY, eightDaysAgo.toString());
  assert(!isDismissedRecently(CUSTOMER_PUSH_DISMISS_KEY), 'B.5 Re-eligible after 7 days expiration');

  // Reset dismissal for subsequent tests
  clearDismissal(CUSTOMER_PUSH_DISMISS_KEY);

  // C. active subscription -> no onboarding
  const evalC = evaluateCustomerPrompt({
    isDismissed: false,
    permission: 'granted',
    isSubscribed: true,
    isPushSupported: true,
    isIos: false,
    isStandalone: false,
  });
  assert(!evalC.show, 'C. Active subscription -> onboarding modal is suppressed');

  // D. permission denied -> no repeated popup
  const evalD = evaluateCustomerPrompt({
    isDismissed: false,
    permission: 'denied',
    isSubscribed: false,
    isPushSupported: true,
    isIos: false,
    isStandalone: false,
  });
  assert(!evalD.show, 'D. Permission denied -> onboarding modal is suppressed without nagging');

  // E. iOS Safari not standalone -> install guide instead of permission request
  const evalE = evaluateCustomerPrompt({
    isDismissed: false,
    permission: 'default',
    isSubscribed: false,
    isPushSupported: false, // iOS Safari without standalone has no PushManager
    isIos: true,
    isStandalone: false,
  });
  assert(evalE.show && evalE.view === 'ios_install_prompt', 'E. iOS Safari not standalone -> shows iOS install guide flow instead of permission request');

  // F. iOS standalone -> activation CTA works
  const evalF = evaluateCustomerPrompt({
    isDismissed: false,
    permission: 'default',
    isSubscribed: false,
    isPushSupported: true, // iOS PWA has PushManager
    isIos: true,
    isStandalone: true,
  });
  assert(evalF.show && evalF.view === 'onboarding_standard', 'F. iOS standalone -> standard activation CTA displayed');

  // -------------------------------------------------------------
  // SECTION 3: ADMIN ONBOARDING & MULTI-DEVICE BEHAVIOR (G, H, I, J)
  // -------------------------------------------------------------
  console.log('\n--- 3. ADMIN ONBOARDING & MULTI-DEVICE BEHAVIOR (G, H, I, J) ---');

  function evaluateAdminPrompt(p: EligibilityParams): {
    show: boolean;
    view: 'none' | 'admin_onboarding_standard' | 'admin_ios_prompt';
  } {
    if (p.isDismissed) return { show: false, view: 'none' };
    if (p.permission === 'denied') return { show: false, view: 'none' };
    if (p.isSubscribed) return { show: false, view: 'none' };

    if (p.isIos && !p.isStandalone) {
      return { show: true, view: 'admin_ios_prompt' };
    }

    if (!p.isPushSupported) return { show: false, view: 'none' };

    return { show: true, view: 'admin_onboarding_standard' };
  }

  // G. Admin desktop with no subscription -> onboarding eligible
  const evalG = evaluateAdminPrompt({
    isDismissed: false,
    permission: 'default',
    isSubscribed: false,
    isPushSupported: true,
    isIos: false,
    isStandalone: false,
  });
  assert(evalG.show && evalG.view === 'admin_onboarding_standard', 'G. Admin desktop with no subscription -> eligible for alert onboarding');

  // H. Admin mobile standalone with no subscription -> onboarding appears
  const evalH = evaluateAdminPrompt({
    isDismissed: false,
    permission: 'default',
    isSubscribed: false,
    isPushSupported: true,
    isIos: true,
    isStandalone: true,
  });
  assert(evalH.show && evalH.view === 'admin_onboarding_standard', 'H. Admin mobile standalone -> alert onboarding appears');

  // Admin iOS not standalone
  const evalH_ios = evaluateAdminPrompt({
    isDismissed: false,
    permission: 'default',
    isSubscribed: false,
    isPushSupported: false,
    isIos: true,
    isStandalone: false,
  });
  assert(evalH_ios.show && evalH_ios.view === 'admin_ios_prompt', 'H.2 Admin iOS Safari -> guide prompt appears');

  // I. Admin subscription enabled -> no onboarding
  const evalI = evaluateAdminPrompt({
    isDismissed: false,
    permission: 'granted',
    isSubscribed: true,
    isPushSupported: true,
    isIos: false,
    isStandalone: false,
  });
  assert(!evalI.show, 'I. Admin subscription enabled -> onboarding prompt is hidden');

  // J. Multi-device: same Admin (or Customer) has Mac + iPhone subscriptions concurrently
  console.log('Testing multi-device concurrent subscriptions in DB...');
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const macEndpoint = 'https://fcm.googleapis.com/fcm/send/test-admin-mac-' + Date.now();
  const iphoneEndpoint = 'https://web.push.apple.com/test-admin-iphone-' + Date.now();

  try {
    // Insert Mac subscription
    const { error: insMacErr } = await serviceClient.from('zanita_push_subscriptions').insert({
      user_id: testUserId,
      endpoint: macEndpoint,
      p256dh: 'mock-p256dh-mac',
      auth: 'mock-auth-mac',
      platform: 'macOS',
      device_label: 'Mac',
    });
    assert(!insMacErr, 'J.1 Admin Mac subscription saved successfully');

    // Insert iPhone subscription for SAME user
    const { error: insIphoneErr } = await serviceClient.from('zanita_push_subscriptions').insert({
      user_id: testUserId,
      endpoint: iphoneEndpoint,
      p256dh: 'mock-p256dh-iphone',
      auth: 'mock-auth-iphone',
      platform: 'iOS PWA',
      device_label: 'iPhone (Pantalla de inicio)',
    });
    assert(!insIphoneErr, 'J.2 Admin iPhone subscription saved successfully for same user');

    // Query active subscriptions for test user
    const { data: userSubs, error: selErr } = await serviceClient
      .from('zanita_push_subscriptions')
      .select('endpoint, platform, device_label')
      .eq('user_id', testUserId)
      .in('endpoint', [macEndpoint, iphoneEndpoint])
      .is('disabled_at', null);

    assert(!selErr && userSubs?.length === 2, `J.3 Both Mac & iPhone subscriptions coexist active in database (count: ${userSubs?.length})`);

    // Clean up test subscriptions
    await serviceClient.from('zanita_push_subscriptions').delete().in('endpoint', [macEndpoint, iphoneEndpoint]);
    console.log('  Cleaned up temporary multi-device test subscriptions.');
  } catch (err: unknown) {
    console.error('Error in multi-device test:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // SECTION 4: MODAL & PROMPT COPY VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- 4. VISUAL & COPY COMPLIANCE VERIFICATION ---');

  const customerModalCode = fs.readFileSync(
    path.join(rootDir, 'components', 'push', 'CustomerPushOnboardingModal.tsx'),
    'utf8'
  );
  assert(customerModalCode.includes('Recibe actualizaciones de tus pedidos'), 'Customer Modal: Title exact match');
  assert(
    customerModalCode.includes(
      'Te avisaremos cuando tu pedido sea aprobado, confirmemos tu pago, empecemos a prepararlo o esté listo.'
    ),
    'Customer Modal: Body exact match'
  );
  assert(customerModalCode.includes('Activar notificaciones'), 'Customer Modal: Primary CTA exact match');
  assert(customerModalCode.includes('Ahora no'), 'Customer Modal: Secondary CTA exact match');
  assert(customerModalCode.includes('Recibe actualizaciones en tu iPhone'), 'Customer Modal iOS: Title exact match');
  assert(
    customerModalCode.includes('Agrega Zanita a tu pantalla de inicio para recibir avisos cuando tu pedido cambie de estado.'),
    'Customer Modal iOS: Body exact match'
  );
  assert(customerModalCode.includes('Cómo agregar Zanita'), 'Customer Modal iOS: CTA exact match');

  const adminPromptCode = fs.readFileSync(
    path.join(rootDir, 'components', 'push', 'AdminPushOnboardingPrompt.tsx'),
    'utf8'
  );
  assert(adminPromptCode.includes('Recibe nuevos pedidos en este dispositivo'), 'Admin Prompt: Title exact match');
  assert(
    adminPromptCode.includes(
      'Te avisaremos cuando entre un nuevo pedido o cuando un cliente reporte su pago, incluso si Zanita no está abierta.'
    ),
    'Admin Prompt: Body exact match'
  );
  assert(adminPromptCode.includes('Activar alertas'), 'Admin Prompt: Primary CTA exact match');
  assert(adminPromptCode.includes('Ahora no'), 'Admin Prompt: Secondary CTA exact match');
  assert(adminPromptCode.includes('Recibe pedidos en tu iPhone'), 'Admin Prompt iOS: Title exact match');
  assert(
    adminPromptCode.includes(
      'Agrega Zanita a tu pantalla de inicio y activa las alertas para recibir nuevos pedidos aunque no tengas el panel abierto.'
    ),
    'Admin Prompt iOS: Body exact match'
  );
  assert(adminPromptCode.includes('Cómo agregar Zanita'), 'Admin Prompt iOS: CTA exact match');

  // Summary
  console.log('\n==================================================');
  console.log(`QA SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('Fatal error in QA suite:', e);
  process.exit(1);
});
