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

export function CustomerPushToggle() {
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

    const handleSubscriptionChange = () => {
      init();
    };
    window.addEventListener('zanita:push-subscription-changed', handleSubscriptionChange);

    return () => {
      active = false;
      window.removeEventListener('zanita:push-subscription-changed', handleSubscriptionChange);
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
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('zanita:push-subscription-changed'));
        setMessage({ text: 'Notificaciones desactivadas en este dispositivo.', type: 'success' });
      } else {
        // Subscribe
        if (typeof Notification === 'undefined') {
          setMessage({ text: 'Tu navegador no soporta notificaciones.', type: 'error' });
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setMessage({
            text: 'Permiso denegado. Para recibir avisos, actívalas en la configuración de tu navegador.',
            type: 'error',
          });
          return;
        }

        const vapidPublicKey = await getVapidPublicKey();
        if (!vapidPublicKey) {
          setMessage({
            text: 'El servicio de notificaciones no está disponible temporalmente.',
            type: 'error',
          });
          return;
        }

        const reg = await registerPushServiceWorker();
        if (!reg) {
          setMessage({ text: 'No se pudo iniciar el servicio de notificaciones.', type: 'error' });
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
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('zanita:push-subscription-changed'));
        setMessage({
          text: '¡Listo! Te avisaremos de cualquier actualización de tus pedidos.',
          type: 'success',
        });
      }
    } catch (err: unknown) {
      console.error('Error toggling customer push:', err);
      setMessage({
        text: 'Ocurrió un error al configurar las notificaciones.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  if (!isMounted) return null;

  return (
    <div className="bg-[#FAF7F2] rounded-2xl border border-[#EBE3D7] p-6 space-y-4">
      <div>
        <h3 className="font-serif font-bold text-lg text-[#261C19] flex items-center gap-2">
          <span>🔔</span> Notificaciones de Pedidos
        </h3>
        <p className="text-sm text-stone-600 mt-1 font-sans">
          Te avisaremos cuando tu pedido sea aprobado, tu pago sea confirmado, empiece la preparación o esté listo para entrega.
        </p>
      </div>

      {isIosUninstalled ? (
        <IosInstallGuide />
      ) : !supported ? (
        <div className="bg-white/80 border border-stone-200 rounded-xl p-4 text-xs text-stone-600 font-sans">
          Las notificaciones push no están disponibles en este navegador. Podrás seguir viendo el estado de tus pedidos iniciando sesión aquí.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-y border-[#EBE3D7]/70">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-sans">
                Estado en este dispositivo
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
                  ? 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-300'
                  : 'bg-[#E57A3B] hover:bg-[#d46a2c] text-white'
              } disabled:opacity-50`}
            >
              {loading
                ? 'Configurando...'
                : isSubscribed
                ? 'Desactivar notificaciones'
                : 'Activar notificaciones de mi pedido'}
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
