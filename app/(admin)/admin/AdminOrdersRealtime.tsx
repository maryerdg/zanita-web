'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  X,
  ExternalLink,
  CreditCard,
  ShoppingBag,
} from 'lucide-react';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface AdminNotification {
  id: string;
  type: 'new_order' | 'payment_reported' | 'status_change';
  orderNumber: string;
  title: string;
  subtitle: string;
  timestamp: Date;
  read: boolean;
}

interface AdminRealtimeContextType {
  connectionStatus: ConnectionStatus;
  notifications: AdminNotification[];
  unreadCount: number;
  markAsRead: (id?: string) => void;
  clearNotifications: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  browserPermission: NotificationPermission | 'unsupported';
  requestBrowserPermission: () => Promise<boolean>;
  activeToast: AdminNotification | null;
  dismissToast: () => void;
}

const AdminRealtimeContext = createContext<AdminRealtimeContextType>({
  connectionStatus: 'disconnected',
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  clearNotifications: () => {},
  soundEnabled: false,
  toggleSound: () => {},
  browserPermission: 'unsupported',
  requestBrowserPermission: async () => false,
  activeToast: null,
  dismissToast: () => {},
});

export function useAdminRealtime() {
  return useContext(AdminRealtimeContext);
}

// Subtle Web Audio Synthesizer Tone (No external audio file required)
function playNotificationChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Pleasant two-tone chime (F5 -> A5)
    osc.frequency.setValueAtTime(698.46, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Silently ignore if audio blocked by browser policy
  }
}

export function AdminOrdersRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('reconnecting');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [activeToast, setActiveToast] = useState<AdminNotification | null>(null);

  // Lazy initializers for SSR safety & no set-state in effect
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem('zanita_admin_sound_enabled');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Stable set of already-handled event identities
  // Keys:
  // - "new_order:<order_id>"
  // - "payment_reported:<order_id>:<payment_reported_at>"
  const handledEventsRef = useRef<Set<string>>(new Set());

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const wasReconnectingRef = useRef<boolean>(false);

  // Cross-tab BroadcastChannel setup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('zanita_admin_realtime_bus');
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          const data = event.data;
          if (data?.type === 'EVENT_HANDLED' && typeof data.key === 'string') {
            handledEventsRef.current.add(data.key);
          }
        };
      }
    } catch {
      // Ignore broadcast channel errors in restricted environments
    }

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, []);

  // Hydrate initial seen-state from canonical database on mount
  // Ensures historical payment reports or orders do not trigger alerts on reload
  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    supabase
      .from('zanita_orders')
      .select('id, payment_reported_at')
      .then(({ data }) => {
        if (!isMounted || !data) return;
        for (const order of data) {
          if (order.id) {
            handledEventsRef.current.add(`new_order:${order.id}`);
            if (order.payment_reported_at) {
              handledEventsRef.current.add(
                `payment_reported:${order.id}:${order.payment_reported_at}`
              );
            }
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('zanita_admin_sound_enabled', String(next));
      } catch {
        // Ignore localStorage error
      }
      if (next) {
        playNotificationChime();
      }
      return next;
    });
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      return perm === 'granted';
    } catch {
      return false;
    }
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setActiveToast(null);
  }, []);

  const triggerToast = useCallback((notif: AdminNotification) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setActiveToast(notif);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 8000);
  }, []);

  const markAsRead = useCallback((id?: string) => {
    setNotifications((prev) =>
      prev.map((n) => (id === undefined || n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Shared refresh handler for canonical data
  const refreshCanonicalData = useCallback(
    (reason: string, payload?: unknown) => {
      try {
        // 1. Refresh Server Components (Dashboard metrics, etc.)
        router.refresh();

        // 2. Dispatch custom event for mounted client components (OrdersClient, KitchenQueue)
        window.dispatchEvent(
          new CustomEvent('zanita:orders-refresh', {
            detail: { reason, payload },
          })
        );
      } catch {
        // Ignore refresh errors
      }
    },
    [router]
  );

  // Handle incoming order operational alerts
  const handleOperationalAlert = useCallback(
    (notif: AdminNotification, eventKey: string) => {
      if (handledEventsRef.current.has(eventKey)) {
        // Event already handled; ignore duplicate alert
        return;
      }
      handledEventsRef.current.add(eventKey);

      // Inform other tabs via BroadcastChannel so they don't repeat sound or OS notification
      try {
        broadcastChannelRef.current?.postMessage({
          type: 'EVENT_HANDLED',
          key: eventKey,
        });
      } catch {
        // Ignore
      }

      // Add to session notifications list
      setNotifications((prev) => [notif, ...prev.slice(0, 49)]);

      // Show in-app toast
      triggerToast(notif);

      // Play audio chime if enabled
      if (soundEnabled) {
        playNotificationChime();
      }

      // Browser OS Notification if page is hidden
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.visibilityState === 'hidden'
      ) {
        try {
          new Notification(notif.title, {
            body: notif.subtitle,
            icon: '/brand/favicons/favicon-vertical-512.webp',
            tag: eventKey,
          });
        } catch {
          // Silently ignore notification failure
        }
      }
    },
    [soundEnabled, triggerToast]
  );

  // Set up Supabase Realtime channel
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('zanita-admin-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'zanita_orders',
        },
        (payload) => {
          const newOrder = payload.new as {
            id?: string;
            order_number?: string;
            status?: string;
          };
          const orderId = newOrder?.id || '';
          const orderNumber = newOrder?.order_number || 'Nuevo pedido';
          const eventKey = `new_order:${orderId}`;

          const notif: AdminNotification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: 'new_order',
            orderNumber,
            title: `Nuevo pedido ${orderNumber}`,
            subtitle: 'Requiere revisión en el Centro de Operaciones',
            timestamp: new Date(),
            read: false,
          };

          handleOperationalAlert(notif, eventKey);
          refreshCanonicalData('insert', payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'zanita_orders',
        },
        (payload) => {
          const newOrder = payload.new as {
            id?: string;
            order_number?: string;
            status?: string;
            payment_reported_at?: string | null;
          };

          const orderId = newOrder?.id || '';
          const orderNumber = newOrder?.order_number || 'Pedido';

          // Detect payment reported using ONLY payload.new and stable identity:
          // payment_reported:<order_id>:<payment_reported_at>
          if (newOrder?.payment_reported_at) {
            const paymentEventKey = `payment_reported:${orderId}:${newOrder.payment_reported_at}`;

            if (!handledEventsRef.current.has(paymentEventKey)) {
              const notif: AdminNotification = {
                id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                type: 'payment_reported',
                orderNumber,
                title: `Pago reportado en ${orderNumber}`,
                subtitle: 'Comprobante listo para verificación',
                timestamp: new Date(),
                read: false,
              };

              handleOperationalAlert(notif, paymentEventKey);
            }
          }

          // Always refresh canonical data on update so orders move between tabs/queues
          refreshCanonicalData('update', payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          if (wasReconnectingRef.current) {
            refreshCanonicalData('reconnect');
            wasReconnectingRef.current = false;
          }
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('reconnecting');
          wasReconnectingRef.current = true;
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
          wasReconnectingRef.current = true;
        }
      });

    // Fallback periodic reconciliation every 45s (Refreshes data only, no fake alerts)
    const interval = setInterval(() => {
      refreshCanonicalData('fallback-interval');
    }, 45000);

    // Reconcile on window focus / tab visibility
    const handleFocus = () => {
      refreshCanonicalData('window-focus');
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshCanonicalData('tab-visible');
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [handleOperationalAlert, refreshCanonicalData]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AdminRealtimeContext.Provider
      value={{
        connectionStatus,
        notifications,
        unreadCount,
        markAsRead,
        clearNotifications,
        soundEnabled,
        toggleSound,
        browserPermission,
        requestBrowserPermission,
        activeToast,
        dismissToast,
      }}
    >
      {children}

      {/* In-App Live Alert Toast Banner */}
      {activeToast && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-sm w-full bg-white rounded-2xl shadow-xl border border-[#E8DCC4] p-4 text-[#261C19] animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeToast.type === 'payment_reported'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {activeToast.type === 'payment_reported' ? (
                <CreditCard className="w-4 h-4" />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8DCC4] text-[#A73832]">
                  {activeToast.type === 'payment_reported' ? 'Pago Reportado' : 'Nuevo Pedido'}
                </span>
                <span className="text-[10px] text-stone-400 font-mono">Ahora</span>
              </div>
              <h4 className="font-bold text-xs text-[#261C19] mt-1 truncate">
                {activeToast.title}
              </h4>
              <p className="text-[11px] text-[#6E564F] line-clamp-2 mt-0.5">
                {activeToast.subtitle}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dismissToast();
                    router.push(`/admin/pedidos?order=${activeToast.orderNumber}`);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#A73832] text-white hover:bg-[#87201D] shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver pedido</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={dismissToast}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#6E564F] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                >
                  Descartar
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissToast}
              aria-label="Cerrar notificación"
              className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </AdminRealtimeContext.Provider>
  );
}
