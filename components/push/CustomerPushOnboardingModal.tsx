'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import {
  isPushSupported,
  getIosInstallState,
  getExistingSubscription,
  subscribeCurrentDevice,
  isDismissedRecently,
  recordDismissal,
  CUSTOMER_PUSH_DISMISS_KEY,
} from '@/lib/push/client';
import { getDeviceSubscriptionStatus } from '@/app/actions/push';
import { IosInstallGuide } from './IosInstallGuide';

function subscribeToNoop() {
  return () => {};
}

export function CustomerPushOnboardingModal() {
  const isMounted = useSyncExternalStore(
    subscribeToNoop,
    () => true,
    () => false
  );

  const [isOpen, setIsOpen] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isIosUninstalled, setIsIosUninstalled] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkEligibility() {
      if (typeof window === 'undefined') return;

      // 1. Anti-annoyance: 7-day dismissal check
      if (isDismissedRecently(CUSTOMER_PUSH_DISMISS_KEY)) {
        return;
      }

      // 2. Permission denied check
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        return;
      }

      // 3. iOS non-standalone check
      const { isIos, isStandalone } = getIosInstallState();
      if (isIos && !isStandalone) {
        if (active) {
          setIsIosUninstalled(true);
          setIsOpen(true);
        }
        return;
      }

      // 4. Push support check
      if (!isPushSupported()) {
        return;
      }

      // 5. Active subscription check
      try {
        const sub = await getExistingSubscription();
        if (!active) return;
        if (sub) {
          const res = await getDeviceSubscriptionStatus(sub.endpoint);
          if (!active) return;
          if (res.isSubscribed) {
            // Already active on this device: do not prompt
            return;
          }
        }
        setIsOpen(true);
      } catch {
        // Fallback: eligible to prompt
        if (active) setIsOpen(true);
      }
    }

    checkEligibility();

    return () => {
      active = false;
    };
  }, []);

  function handleDismiss() {
    recordDismissal(CUSTOMER_PUSH_DISMISS_KEY);
    setIsOpen(false);
  }

  async function handleActivate() {
    setLoading(true);
    try {
      const result = await subscribeCurrentDevice();
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
        }, 1500);
      } else {
        // If denied or failed, close and record dismissal
        handleDismiss();
      }
    } catch (err) {
      console.error('[WebPush] Error activating customer push onboarding:', err);
      handleDismiss();
    } finally {
      setLoading(false);
    }
  }

  if (!isMounted || !isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-push-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
    >
      <div className="bg-[#FCFBF7] border border-[#E8DCC4] rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-[#261C19] font-sans">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors p-1"
          aria-label="Cerrar"
        >
          ✕
        </button>

        {showIosGuide ? (
          <IosInstallGuide
            title="Recibe actualizaciones en tu iPhone"
            step5Text="Toca &ldquo;Activar notificaciones&rdquo; para recibir alertas de tus pedidos"
            onDismiss={handleDismiss}
            dismissText="Entendido"
          />
        ) : success ? (
          <div className="py-6 text-center space-y-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 text-xl font-bold">
              ✓
            </span>
            <h3 className="font-serif font-bold text-lg text-[#261C19]">
              ¡Notificaciones activadas!
            </h3>
            <p className="text-xs text-[#6E564F]">
              Te avisaremos en cuanto tu pedido sea aprobado o cambie de estado.
            </p>
          </div>
        ) : isIosUninstalled ? (
          /* iOS Safari Not Standalone */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[#A73832]/10 text-[#A73832] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </span>
              <h3 id="customer-push-title" className="font-serif font-bold text-lg text-[#261C19]">
                Recibe actualizaciones en tu iPhone
              </h3>
            </div>

            <p className="text-sm text-[#6E564F] leading-relaxed">
              Agrega Zanita a tu pantalla de inicio para recibir avisos cuando tu pedido cambie de estado.
            </p>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-[#6E564F] hover:text-[#261C19] transition-colors text-center"
              >
                Ahora no
              </button>
              <button
                type="button"
                onClick={() => setShowIosGuide(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#A73832] hover:bg-[#8e2e28] text-white transition-all shadow-xs text-center"
              >
                Cómo agregar Zanita
              </button>
            </div>
          </div>
        ) : (
          /* Standard Supported / Standalone Browser */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[#A73832]/10 text-[#A73832] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </span>
              <h3 id="customer-push-title" className="font-serif font-bold text-lg text-[#261C19]">
                Recibe actualizaciones de tus pedidos
              </h3>
            </div>

            <p className="text-sm text-[#6E564F] leading-relaxed">
              Te avisaremos cuando tu pedido sea aprobado, confirmemos tu pago, empecemos a prepararlo o esté listo.
            </p>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-[#6E564F] hover:text-[#261C19] transition-colors text-center"
              >
                Ahora no
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleActivate}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#A73832] hover:bg-[#8e2e28] text-white transition-all shadow-xs disabled:opacity-50 text-center"
              >
                {loading ? 'Activando...' : 'Activar notificaciones'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}