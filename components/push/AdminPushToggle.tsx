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
  removePushSubscription,
  getDeviceSubscriptionStatus,
} from '@/app/actions/push';
import { IosInstallGuide } from './IosInstallGuide';

function subscribeToNoop() {
  return () => {};
}

export function AdminPushToggle() {
  const isMounted = useSyncExternalStore(
    subscribeToNoop,
    () => true,
    () => false
  );

  const [supported, setSupported] = useState(false);
  const [isIosUninstalled, setIsIosUninstalled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let active = true;

    async function init() {
      const hasSupport = isPushSupported();
      if (!active) return;
      setSupported(hasSupport);

      const { isIos, isStandalone } = getIosInstallState();
      if (isIos && !isStandalone) {
        setIsIosUninstalled(true);
        return;
      }

      if (hasSupport) {
        try {
          const sub = await getExistingSubscription();
          if (!active) return;
          if (!sub) {
            setIsSubscribed(false);
            return;
          }
          const res = await getDeviceSubscriptionStatus(sub.endpoint);
          if (!active) return;
          setIsSubscribed(res.isSubscribed);
        } catch {
          if (active) setIsSubscribed(false);
        }
      }
    }

    init();

    return () => {
      active = false;
    };
  }, []);

  async function handleToggle() {
    setMessage(null);
    setLoading(true);

    try {
      if (isSubscribed) {
        // Unsubscribe
        const sub = await getExistingSubscription();
        if (sub) {
          await sub.unsubscribe();
          await removePushSubscription(sub.endpoint);
        }
        setIsSubscribed(false);
        setMessage({ text: 'Alertas desactivadas en este dispositivo.', type: 'success' });
      } else {
        // Subscribe
        if (typeof Notification === 'undefined') {
          setMessage({ text: 'Tu navegador no soporta notificaciones.', type: 'error' });
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setMessage({
            text: 'Permiso denegado. Puedes habilitar las notificaciones en los ajustes de tu navegador.',
            type: 'error',
          });
          return;
        }

        const vapidPublicKey = await getVapidPublicKey();
        if (!vapidPublicKey) {
          setMessage({
            text: 'Las claves de notificación push no están configuradas en el servidor.',
            type: 'error',
          });
          return;
        }

        const reg = await registerPushServiceWorker();
        if (!reg) {
          setMessage({ text: 'No se pudo inicializar el servicio de notificaciones.', type: 'error' });
          return;
        }

        // Wait until service worker is active
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

        const saveRes = await savePushSubscription({
          endpoint: sub.endpoint,
          p256dh,
          auth,
          platform,
          deviceLabel,
        });

        if (!saveRes.success) {
          setMessage({ text: saveRes.error || 'Error al guardar suscripción.', type: 'error' });
          return;
        }

        setIsSubscribed(true);
        setMessage({
          text: '¡Alertas activadas! Recibirás notificaciones de nuevos pedidos y pagos.',
          type: 'success',
        });
      }
    } catch (err: unknown) {
      console.error('Error toggling admin push:', err);
      setMessage({
        text: 'Ocurrió un error al configurar las alertas en este dispositivo.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  if (!isMounted) return null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-4">
      <div>
        <h3 className="font-serif font-bold text-lg text-[#261C19] flex items-center gap-2">
          <span>🔔</span> Notificaciones Push
        </h3>
        <p className="text-sm text-stone-600 mt-1 font-sans">
          Recibirás avisos de nuevos pedidos y pagos reportados incluso cuando Zanita no esté abierta en tu navegador.
        </p>
      </div>

      {isIosUninstalled ? (
        <IosInstallGuide />
      ) : !supported ? (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-600 font-sans">
          Este navegador o dispositivo no soporta notificaciones Web Push. Puedes mantener la pestaña del panel abierta para recibir alertas en vivo en pantalla.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-y border-stone-100">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-sans">
                Este dispositivo
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSubscribed ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'
                  }`}
                />
                <span className="text-sm font-medium text-stone-900 font-sans">
                  {isSubscribed ? 'Activadas' : 'Desactivadas'}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleToggle}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm font-sans ${
                isSubscribed
                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
                  : 'bg-[#E57A3B] hover:bg-[#d46a2c] text-white'
              } disabled:opacity-50`}
            >
              {loading
                ? 'Configurando...'
                : isSubscribed
                ? 'Desactivar alertas'
                : 'Activar alertas en este dispositivo'}
            </button>
          </div>

          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-sans ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
