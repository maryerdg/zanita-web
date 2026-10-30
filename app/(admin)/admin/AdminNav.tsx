'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Clock,
  Truck,
  Users,
  ShoppingBag,
  Package,
  Menu,
  ExternalLink,
  Settings,
  Bell,
  Volume2,
  VolumeX,
  CreditCard,
  X,
} from 'lucide-react'
import { useAdminRealtime } from './AdminOrdersRealtime'

const NAV_ITEMS = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag, exact: false },
  { href: '/admin/catalogo', label: 'Catálogo', icon: Package, exact: false },
  { href: '/admin/disponibilidad', label: 'Disponibilidad', icon: Clock, exact: false },
  { href: '/admin/entregas', label: 'Entregas', icon: Truck, exact: false },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users, exact: false },
  { href: '/admin/ajustes', label: 'Ajustes', icon: Settings, exact: false },
]

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const {
    connectionStatus,
    notifications,
    unreadCount,
    markAsRead,
    soundEnabled,
    toggleSound,
    browserPermission,
    requestBrowserPermission,
  } = useAdminRealtime()

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const isActive = (item: typeof NAV_ITEMS[number]) => {
    if (item.exact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  const renderConnectionPill = () => {
    if (connectionStatus === 'connected') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
          title="Conectado en tiempo real con Supabase"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>En vivo</span>
        </span>
      )
    }
    if (connectionStatus === 'reconnecting') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
          title="Reconectando con el servidor..."
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
          <span>Reconectando…</span>
        </span>
      )
    }
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200"
        title="Sin conexión activa"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
        <span>Desconectado</span>
      </span>
    )
  }

  const renderNotificationPopover = () => (
    <div
      ref={popoverRef}
      className="absolute top-12 right-2 sm:right-auto sm:left-4 z-50 w-[calc(100vw-24px)] sm:w-80 bg-white rounded-2xl shadow-xl border border-[#E8DCC4] p-4 text-[#261C19] space-y-3"
    >
      <div className="flex items-center justify-between border-b border-[#F2ECE1] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-[#261C19]">Alertas de Operación</span>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-[#A73832] text-white font-bold px-1.5 py-0.2 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAsRead()}
              className="text-[11px] font-medium text-[#A73832] hover:underline cursor-pointer"
            >
              Marcar leídas
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowNotifications(false)}
            className="text-stone-400 hover:text-stone-600 cursor-pointer p-0.5"
            aria-label="Cerrar panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preferences row (Sound & Desktop Notifications) */}
      <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#F2ECE1] space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#6E564F] flex items-center gap-1.5">
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-stone-400" />}
            <span>Alertas sonoras</span>
          </span>
          <button
            type="button"
            onClick={toggleSound}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-white text-stone-600 border border-[#E8DCC4]'
            }`}
          >
            {soundEnabled ? 'Activadas' : 'Silenciadas'}
          </button>
        </div>

        {browserPermission === 'default' && (
          <div className="pt-1.5 border-t border-[#E8DCC4]/60 flex items-center justify-between">
            <span className="text-[10px] text-[#6E564F]">Alertas de escritorio</span>
            <button
              type="button"
              onClick={requestBrowserPermission}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#A73832] text-white hover:bg-[#87201D] transition-colors cursor-pointer"
            >
              Habilitar
            </button>
          </div>
        )}
      </div>

      {/* Notifications list */}
      <div className="max-h-64 overflow-y-auto space-y-1.5 divide-y divide-[#F2ECE1]/60 pr-1">
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#6E564F]">
            <span>Sin alertas en esta sesión</span>
            <p className="text-[10px] text-stone-400 mt-0.5">Los nuevos pedidos y pagos reportados aparecerán aquí.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                markAsRead(n.id);
                setShowNotifications(false);
                router.push(n.target || `/admin/pedidos?order=${encodeURIComponent(n.orderNumber)}`);
              }}
              className={`pt-2 pb-1.5 px-2 rounded-xl text-xs transition-colors cursor-pointer flex items-start gap-2.5 ${
                n.read ? 'opacity-70 hover:bg-[#FAF7F2]' : 'bg-[#FAF7F2] font-semibold hover:bg-[#F2ECE1]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  n.type === 'payment_reported'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {n.type === 'payment_reported' ? (
                  <CreditCard className="w-3 h-3" />
                ) : (
                  <ShoppingBag className="w-3 h-3" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] text-[#261C19] truncate">
                    {n.title} <span className="font-mono text-[#A73832] font-bold">{n.orderNumber}</span>
                  </span>
                  <span className="text-[9px] text-stone-400 font-mono">
                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[10px] text-[#6E564F] line-clamp-1">{n.subtitle}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Top Navigation Bar (< md) */}
      <div className="md:hidden w-full bg-white border-b border-[#E8DCC4] sticky top-0 z-20">
        <div className="px-4 py-2 flex items-center justify-between border-b border-[#F2ECE1] relative">
          <div className="flex items-center gap-2">
            <span className="font-serif font-black text-lg tracking-tight text-[#A73832]">
              Zanita
            </span>
            <span className="text-[9px] uppercase font-bold tracking-widest bg-[#F09CA9]/30 text-[#A73832] px-1.5 py-0.5 rounded-full">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-2">
            {renderConnectionPill()}

            {/* Notification Bell Button */}
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              aria-label="Ver alertas"
              className="relative p-1.5 rounded-xl text-[#6E564F] hover:bg-[#FAF7F2] hover:text-[#261C19] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#A73832] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {showNotifications && renderNotificationPopover()}
        </div>

      </div>

      {/* Persistent mobile bottom navigation */}
      <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[#E8DCC4] bg-white/95 backdrop-blur-md px-2 pt-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(38,28,25,0.08)]"
        aria-label="Navegación principal del Admin"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {MOBILE_BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors ${
                  active
                    ? 'bg-[#A73832] text-white'
                    : 'text-[#6E564F] hover:bg-[#FAF7F2] hover:text-[#261C19]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop / Tablet Sidebar (>= md) */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 bg-white border-r border-[#E8DCC4] shrink-0 self-stretch relative">
        {/* Brand header */}
        <div className="p-6 border-b border-[#E8DCC4] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-serif font-black text-2xl tracking-tight text-[#A73832]">
                Zanita
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-[#F09CA9]/30 text-[#A73832] px-2 py-0.5 rounded-full">
                Admin
              </span>
            </div>

            {/* Notification Bell Button */}
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              aria-label="Ver alertas"
              className="relative p-1.5 rounded-xl text-[#6E564F] hover:bg-[#FAF7F2] hover:text-[#261C19] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#A73832] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <p className="text-xs text-[#6E564F] font-mono truncate max-w-[120px]" title={userEmail}>
              {userEmail}
            </p>
            {renderConnectionPill()}
          </div>

          {showNotifications && renderNotificationPopover()}
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#A73832] text-white shadow-xs font-semibold'
                    : 'text-[#6E564F] hover:bg-[#FAF7F2] hover:text-[#261C19]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#6E564F]'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer links */}
        <div className="p-4 border-t border-[#E8DCC4] space-y-2">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#6E564F] hover:bg-[#FAF7F2] hover:text-[#261C19] transition-colors"
          >
            <span>Ver tienda</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/productos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#6E564F] hover:bg-[#FAF7F2] hover:text-[#261C19] transition-colors"
          >
            <span>Ver catálogo</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>
    </>
  )
}
