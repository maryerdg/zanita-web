// lib/push/client.ts
// Standards-based client push utilities for Web Push & iOS Standalone detection

export interface IosInstallState {
  isIos: boolean;
  isStandalone: boolean;
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
