// lib/push/client.ts
// Standards-based client push utilities for Web Push & iOS Standalone detection

import { getVapidPublicKey, savePushSubscription } from '@/app/actions/push';

export interface IosInstallState {
  isIos: boolean;
  isStandalone: boolean;
}

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const CUSTOMER_PUSH_DISMISS_KEY = 'zanita_customer_push_dismissed_at';
export const ADMIN_PUSH_DISMISS_KEY = 'zanita_admin_push_dismissed_at';

export function isDismissedRecently(storageKey: string, expiryMs = SEVEN_DAYS_MS): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return false;
    const timestamp = parseInt(raw, 10);
    if (isNaN(timestamp)) return false;
    return Date.now() - timestamp < expiryMs;
  } catch {
    return false;
  }
}

export function recordDismissal(storageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, Date.now().toString());
  } catch {
    // Ignore localStorage errors
  }
}

export function clearDismissal(storageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Ignore
  }
}

export function getIosInstallState(): IosInstallState {
  if (typeof window === 'undefined') {
    return { isIos: false, isStandalone: false };
  }

  const ua = window.navigator.userAgent || '';
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

  const isStandalone =
    ('standalone' in window.navigator &&
      (window.navigator as unknown as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches;

  return { isIos, isStandalone };
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export function getDevicePlatformLabel(): { platform: string; deviceLabel: string } {
  if (typeof window === 'undefined') {
    return { platform: 'unknown', deviceLabel: 'Dispositivo desconocido' };
  }
  const ua = window.navigator.userAgent;
  const { isIos, isStandalone } = getIosInstallState();

  let platform = 'Web';
  let deviceLabel = 'Navegador Web';

  if (isIos) {
    platform = isStandalone ? 'iOS PWA' : 'iOS Safari';
    deviceLabel = isStandalone ? 'iPhone/iPad (Pantalla de inicio)' : 'iPhone/iPad';
  } else if (/Android/.test(ua)) {
    platform = 'Android';
    deviceLabel = 'Dispositivo Android';
  } else if (/Macintosh/.test(ua)) {
    platform = 'macOS';
    deviceLabel = 'Mac';
  } else if (/Windows/.test(ua)) {
    platform = 'Windows';
    deviceLabel = 'PC Windows';
  }

  return { platform, deviceLabel };
}

export async function subscribeCurrentDevice(): Promise<{
  success: boolean;
  error?: string;
  permission?: NotificationPermission;
}> {
  if (!isPushSupported()) {
    return { success: false, error: 'Tu navegador no soporta notificaciones push.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      success: false,
      permission,
      error: 'Permiso denegado. Puedes habilitar las notificaciones en los ajustes de tu navegador.',
    };
  }

  const vapidPublicKey = await getVapidPublicKey();
  if (!vapidPublicKey) {
    return { success: false, permission, error: 'VAPID public key no configurada.' };
  }

  const reg = await registerPushServiceWorker();
  if (!reg) {
    return { success: false, permission, error: 'No se pudo registrar el Service Worker.' };
  }

  const readyReg = await navigator.serviceWorker.ready;
  const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

  let sub = await readyReg.pushManager.getSubscription();
  if (!sub) {
    sub = await readyReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey.buffer as ArrayBuffer,
    });
  }

  const p256dh = sub.getKey('p256dh')
    ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey('p256dh')!))))
    : '';
  const auth = sub.getKey('auth')
    ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey('auth')!))))
    : '';

  const { platform, deviceLabel } = getDevicePlatformLabel();

  const res = await savePushSubscription({
    endpoint: sub.endpoint,
    p256dh,
    auth,
    platform,
    deviceLabel,
  });

  if (res.success && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('zanita:push-subscription-changed'));
  }

  return { success: res.success, error: res.error, permission };
}
