'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Clock,
  Truck,
  Users,
  ShoppingBag,
  ExternalLink,
  Settings,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag, exact: false },
  { href: '/admin/disponibilidad', label: 'Disponibilidad', icon: Clock, exact: false },
  { href: '/admin/entregas', label: 'Entregas', icon: Truck, exact: false },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users, exact: false },
  { href: '/admin/ajustes', label: 'Ajustes', icon: Settings, exact: false },
]

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()

  const isActive = (item: typeof NAV_ITEMS[number]) => {
    if (item.exact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  return (
    <aside className="w-64 bg-white border-r border-[#E8DCC4] flex flex-col shrink-0">
      {/* Brand header */}
      <div className="p-6 border-b border-[#E8DCC4]">
        <div className="flex items-center gap-2">
          <span className="font-serif font-black text-2xl tracking-tight text-[#A73832]">
            Zanita
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest bg-[#F09CA9]/30 text-[#A73832] px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>
        <p className="text-xs text-[#6E564F] mt-1 font-mono truncate" title={userEmail}>
          {userEmail}
        </p>
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
  )
}
