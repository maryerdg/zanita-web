'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import {
  isPushSupported,
  getIosInstallState,
  getExistingSubscription,
  subscribeCurrentDevice,
  isDismissedRecently,
  recordDismissal,
  ADMIN_PUSH_DISMISS_KEY,
} from '@/lib/push/client';
import { getDeviceSubscriptionStatus } from '@/app/actions/push';
import { IosInstallGuide } from './IosInstallGuide';

function subscribeToNoop() {
  return () => {};
}

export function AdminPushOnboardingPrompt() {
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
      if (isDismissedRecently(ADMIN_PUSH_DISMISS_KEY)) {
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
            // Already active on this admin device: do not prompt
            return;
          }
        }
        setIsOpen(true);
      } catch {
        if (active) setIsOpen(true);
      }
    }

    checkEligibility();

    return () => {
      active = false;
    };
  }, []);

  function handleDismiss() {
    recordDismissal(ADMIN_PUSH_DISMISS_KEY);
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
        handleDismiss();
      }
    } catch (err) {
      console.error('[WebPush] Error activating admin push onboarding:', err);
      handleDismiss();
    } finally {
      setLoading(false);
    }
  }

  if (!isMounted || !isOpen) return null;

  return (
    <div
      role="region"
      aria-label="Aviso de activación de alertas admin"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 max-w-md w-[calc(100vw-2rem)] sm:w-[420px] bg-[#FCFBF7] border border-[#E8DCC4] rounded-2xl p-5 shadow-2xl text-[#261C19] font-sans animate-in slide-in-from-bottom-5 duration-300"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-stone-400 hover:text-stone-600 transition-colors p-1"
        aria-label="Cerrar aviso"
      >
        ✕
      </button>

      {showIosGuide ? (
        <IosInstallGuide
          title="Recibe pedidos en tu iPhone"
          step5Text="Toca &ldquo;Activar alertas&rdquo; para recibir avisos de nuevos pedidos"
          onDismiss={handleDismiss}
          dismissText="Entendido"
        />
      ) : success ? (
        <div className="py-4 text-center space-y-2">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 text-lg font-bold">
            ✓
          </span>
          <h3 className="font-serif font-bold text-base text-[#261C19]">¡Alertas activadas!</h3>
          <p className="text-xs text-[#6E564F]">
            Recibirás alertas en este dispositivo cuando entre un pedido o reporte de pago.
          </p>
        </div>
      ) : isIosUninstalled ? (
        /* iOS Safari Not Standalone */
        <div className="space-y-3">
          <div className="flex items-center gap-3 pr-6">
            <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[#A73832]/10 text-[#A73832] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </span>
            <h3 className="font-serif font-bold text-base text-[#261C19]">
              Recibe pedidos en tu iPhone
            </h3>
          </div>

          <p className="text-xs text-[#6E564F] leading-relaxed">
            Agrega Zanita a tu pantalla de inicio y activa las alertas para recibir nuevos pedidos aunque no tengas el panel abierto.
          </p>

          <div className="pt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-[#6E564F] hover:text-[#261C19] transition-colors"
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={() => setShowIosGuide(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#A73832] hover:bg-[#8e2e28] text-white transition-all shadow-xs"
            >
              Cómo agregar Zanita
            </button>
          </div>
        </div>
      ) : (
        /* Standard Supported / Standalone Admin Browser */
        <div className="space-y-3">
          <div className="flex items-center gap-3 pr-6">
            <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[#A73832]/10 text-[#A73832] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </span>
            <h3 className="font-serif font-bold text-base text-[#261C19]">
              Recibe nuevos pedidos en este dispositivo
            </h3>
          </div>

          <p className="text-xs text-[#6E564F] leading-relaxed">
            Te avisaremos cuando entre un nuevo pedido o cuando un cliente reporte su pago, incluso si Zanita no está abierta.
          </p>

          <div className="pt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-[#6E564F] hover:text-[#261C19] transition-colors"
            >
              Ahora no
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleActivate}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#A73832] hover:bg-[#8e2e28] text-white transition-all shadow-xs disabled:opacity-50"
            >
              {loading ? 'Activando...' : 'Activar alertas'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}