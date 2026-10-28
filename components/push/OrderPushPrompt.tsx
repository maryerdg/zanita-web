'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import {
  isPushSupported,
  getIosInstallState,
  getExistingSubscription,
  registerPushServiceWorker,
  urlBase64ToUint8Array,
  getDevicePlatformLabel,
} from '@/lib/push/client';
import {
  getVapidPublicKey,
  savePushSubscription,
  getDeviceSubscriptionStatus,
} from '@/app/actions/push';
import { IosInstallGuide } from './IosInstallGuide';

function subscribeToNoop() {
  return () => {};
}

export function OrderPushPrompt() {
  const isMounted = useSyncExternalStore(
    subscribeToNoop,
    () => true,
    () => false
  );

  const [visible, setVisible] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      // Don't show if user dismissed prompt in this session
      if (sessionStorage.getItem('zanita_dismiss_order_push_prompt')) {
        return;
      }

      if (!isPushSupported()) return;

      try {
        const sub = await getExistingSubscription();
        if (!active) return;
        if (sub) {
          const res = await getDeviceSubscriptionStatus(sub.endpoint);
          if (!active) return;
          if (res.isSubscribed) {
            // Already subscribed, no need to prompt
            return;
          }
        }
        setVisible(true);
      } catch {
        if (active) setVisible(true);
      }
    }

    init();

    return () => {
      active = false;
    };
  }, []);

  function handleDismiss() {
    setVisible(false);
    sessionStorage.setItem('zanita_dismiss_order_push_prompt', 'true');
  }

  async function handleActivate() {
    const { isIos, isStandalone } = getIosInstallState();
    if (isIos && !isStandalone) {
      setShowIosGuide(true);
      return;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        handleDismiss();
        return;
      }

      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) {
        handleDismiss();
        return;
      }

      const reg = await registerPushServiceWorker();
      if (!reg) {
        handleDismiss();
        return;
      }

      const readyReg = await navigator.serviceWorker.ready;
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      const sub = await readyReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey.buffer as ArrayBuffer,
      });

      const p256dh = sub.getKey('p256dh')
        ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey('p256dh')!))))
        : '';
      const auth = sub.getKey('auth')
        ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey('auth')!))))
        : '';

      const { platform, deviceLabel } = getDevicePlatformLabel();

      await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh,
        auth,
        platform,
        deviceLabel,
      });

      setDone(true);
      setTimeout(() => {
        setVisible(false);
      }, 3000);
    } catch (err) {
      console.error('Error activating push in order page:', err);
      handleDismiss();
    } finally {
      setLoading(false);
    }
  }

  if (!isMounted || !visible) return null;

  return (
    <div className="bg-[#FAF7F2] border border-[#EBE3D7] rounded-2xl p-4 shadow-sm my-4 font-sans text-[#261C19]">
      {showIosGuide ? (
        <IosInstallGuide onDismiss={() => setShowIosGuide(false)} />
      ) : done ? (
        <div className="flex items-center gap-2 text-xs text-emerald-800">
          <span>✓</span>
          <span>¡Listo! Te avisaremos en cuanto tu pedido sea aprobado.</span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E57A3B]/10 text-[#E57A3B] flex items-center justify-center text-sm">
              🔔
            </span>
            <p className="text-xs sm:text-sm font-medium text-stone-800">
              ¿Quieres que te avisemos cuando Zanita apruebe tu pedido?
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 font-sans"
            >
              Ahora no
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleActivate}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#E57A3B] hover:bg-[#d46a2c] text-white shadow-sm transition-all disabled:opacity-50 font-sans"
            >
              {loading ? 'Activando...' : 'Activar notificaciones'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
