import { ShoppingBag, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function AdminOrdersPlaceholderPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#261C19]">
          Gestión de Pedidos
        </h1>
        <p className="text-sm text-[#6E564F] mt-1">
          Monitor de pedidos en vivo, cambio de estados operativos y detalles de despacho.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8DCC4] p-12 text-center max-w-xl mx-auto shadow-xs space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#F5EBDC] flex items-center justify-center mx-auto text-[#A73832]">
          <ShoppingBag className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-serif font-bold text-[#261C19]">
          Módulo de Pedidos (Fase 8E)
        </h2>
        <p className="text-xs text-[#6E564F] leading-relaxed">
          El panel operativo de pedidos en tiempo real con cambios de estado («En preparación», «Listo para entrega», «Entregado») se conectará en la siguiente fase tras la confirmación de la pasarela y checkout.
        </p>

        <div className="pt-4">
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-[#261C19] text-white hover:bg-[#A73832] transition-colors"
          >
            Volver al Resumen Operativo
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
