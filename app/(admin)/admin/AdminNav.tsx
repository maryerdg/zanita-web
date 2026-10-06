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
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/admin/disponibilidad', label: 'Disponibilidad', icon: Clock, exact: false },
  { href: '/admin/entregas', label: 'Entregas', icon: Truck, exact: false },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users, exact: false },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag, exact: false },
]

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()

  return (
    <header className="bg-white border-b border-[#E8DCC4] sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar: Brand + User info */}
        <div className="flex items-center justify-between h-16 border-b border-[#F2ECE1]">
          <div className="flex items-center space-x-3">
            <span className="font-serif text-2xl font-bold tracking-tight text-[#A73832]">
              Zanita
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F5EBDC] text-[#6E564F] border border-[#E8DCC4]">
              Operaciones
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center text-xs font-medium text-[#6E564F] hover:text-[#A73832] transition-colors"
            >
              Ver Tienda
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Link>
            <div className="text-right">
              <p className="text-xs font-medium text-[#261C19]">{userEmail}</p>
              <p className="text-[10px] text-[#98B19C] font-semibold uppercase tracking-wider">
                Administrador
              </p>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2 no-scrollbar" aria-label="Navegación Admin">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`)

            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#A73832] text-white shadow-xs'
                    : 'text-[#6E564F] hover:text-[#261C19] hover:bg-[#F5EBDC]/60'
                }`}
              >
                <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-white' : 'text-[#6E564F]'}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
