import Link from 'next/link'
import { getAdminReadinessSummary } from '@/app/actions/admin'
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  GraduationCap,
  MapPin,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const { summary, error } = await getAdminReadinessSummary()

  if (error || !summary) {
    return (
      <div className="p-8 bg-red-50 rounded-2xl border border-red-200 text-red-800">
        <p className="font-semibold">Error al cargar el resumen operativo</p>
        <p className="text-sm mt-1">{error || 'No se pudieron recuperar las métricas de estado.'}</p>
      </div>
    )
  }

  const { officialPoints, homeDelivery, pricing, cetys } = summary

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#261C19]">
          Panel de Operaciones
        </h1>
        <p className="text-sm text-[#6E564F] mt-1">
          Estado en tiempo real de la disponibilidad y logística de entrega en la tienda Zanita.
        </p>
      </div>

      {/* Main Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Puntos Oficiales */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8DCC4] shadow-xs flex flex-col justify-between hover:border-[#D46240]/40 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#F5EBDC] flex items-center justify-center text-[#A73832]">
                <MapPin className="w-5 h-5" />
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  officialPoints.isReady
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {officialPoints.isReady ? (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                )}
                {officialPoints.statusText}
              </span>
            </div>

            <h3 className="text-base font-semibold text-[#261C19] mt-4">
              Puntos Oficiales
            </h3>
            <p className="text-xs text-[#6E564F] mt-1">
              {officialPoints.detail}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F2ECE1]">
            <Link
              href="/admin/disponibilidad?mode=official_point"
              className="inline-flex items-center text-xs font-semibold text-[#A73832] hover:text-[#87201D] group"
            >
              Configurar horarios
              <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Entrega a Domicilio */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8DCC4] shadow-xs flex flex-col justify-between hover:border-[#D46240]/40 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#F5EBDC] flex items-center justify-center text-[#A73832]">
                <Truck className="w-5 h-5" />
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  homeDelivery.isReady
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {homeDelivery.isReady ? (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                )}
                {homeDelivery.statusText}
              </span>
            </div>

            <h3 className="text-base font-semibold text-[#261C19] mt-4">
              Entrega a Domicilio
            </h3>
            <p className="text-xs text-[#6E564F] mt-1">
              {homeDelivery.detail}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F2ECE1]">
            <Link
              href="/admin/disponibilidad?mode=home_delivery"
              className="inline-flex items-center text-xs font-semibold text-[#A73832] hover:text-[#87201D] group"
            >
              Configurar días y horas
              <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Pickup CETYS */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8DCC4] shadow-xs flex flex-col justify-between hover:border-[#D46240]/40 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#F5EBDC] flex items-center justify-center text-[#A73832]">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  cetys.isReady
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {cetys.isReady ? (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                )}
                {cetys.statusText}
              </span>
            </div>

            <h3 className="text-base font-semibold text-[#261C19] mt-4">
              Pickup CETYS
            </h3>
            <p className="text-xs text-[#6E564F] mt-1">
              {cetys.detail}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F2ECE1]">
            <Link
              href="/admin/disponibilidad?mode=cetys_pickup"
              className="inline-flex items-center text-xs font-semibold text-[#A73832] hover:text-[#87201D] group"
            >
              Ver horario y Stand Mode
              <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Tarifas de Domicilio */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8DCC4] shadow-xs flex flex-col justify-between hover:border-[#D46240]/40 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#F5EBDC] flex items-center justify-center text-[#A73832]">
                <Clock className="w-5 h-5" />
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  pricing.isConfigured
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {pricing.statusText}
              </span>
            </div>

            <h3 className="text-base font-semibold text-[#261C19] mt-4">
              Tarifas de Domicilio
            </h3>
            <p className="text-xs text-[#6E564F] mt-1">
              {pricing.detail}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F2ECE1]">
            <Link
              href="/admin/entregas"
              className="inline-flex items-center text-xs font-semibold text-[#A73832] hover:text-[#87201D] group"
            >
              Configurar cocina y tarifas
              <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick operational actions */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8DCC4] shadow-xs">
        <h2 className="text-lg font-serif font-bold text-[#261C19] mb-4 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-[#D46240]" />
          Acciones Operativas Frecuentes
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/disponibilidad"
            className="p-4 rounded-xl border border-[#F2ECE1] bg-[#FAF7F2] hover:border-[#D46240]/50 hover:bg-white transition-all group"
          >
            <p className="font-semibold text-sm text-[#261C19] group-hover:text-[#A73832]">
              Modificar horario semanal
            </p>
            <p className="text-xs text-[#6E564F] mt-1">
              Ajusta los días activos, intervalos de pedidos y horas de servicio.
            </p>
          </Link>

          <Link
            href="/admin/disponibilidad?action=stand"
            className="p-4 rounded-xl border border-[#F2ECE1] bg-[#FAF7F2] hover:border-[#D46240]/50 hover:bg-white transition-all group"
          >
            <p className="font-semibold text-sm text-[#261C19] group-hover:text-[#A73832]">
              Activar Stand CETYS
            </p>
            <p className="text-xs text-[#6E564F] mt-1">
              Habilita horario especial en el campus para un evento o fecha específica.
            </p>
          </Link>

          <Link
            href="/admin/disponibilidad?action=block"
            className="p-4 rounded-xl border border-[#F2ECE1] bg-[#FAF7F2] hover:border-[#D46240]/50 hover:bg-white transition-all group"
          >
            <p className="font-semibold text-sm text-[#261C19] group-hover:text-[#A73832]">
              Bloquear horario específico
            </p>
            <p className="text-xs text-[#6E564F] mt-1">
              Cierra una franja temporal (ej. 13:00–14:00) sin alterar el horario habitual.
            </p>
          </Link>

          <Link
            href="/admin/entregas"
            className="p-4 rounded-xl border border-[#F2ECE1] bg-[#FAF7F2] hover:border-[#D46240]/50 hover:bg-white transition-all group"
          >
            <p className="font-semibold text-sm text-[#261C19] group-hover:text-[#A73832]">
              Gestionar puntos de entrega
            </p>
            <p className="text-xs text-[#6E564F] mt-1">
              Activa o desactiva puntos oficiales y edita referencias públicas.
            </p>
          </Link>

          <Link
            href="/admin/entregas#tarifas"
            className="p-4 rounded-xl border border-[#F2ECE1] bg-[#FAF7F2] hover:border-[#D46240]/50 hover:bg-white transition-all group"
          >
            <p className="font-semibold text-sm text-[#261C19] group-hover:text-[#A73832]">
              Actualizar tarifas de envío
            </p>
            <p className="text-xs text-[#6E564F] mt-1">
              Define costos por rangos de kilómetros o activa cotización manual.
            </p>
          </Link>

          <Link
            href="/admin/usuarios"
            className="p-4 rounded-xl border border-[#F2ECE1] bg-[#FAF7F2] hover:border-[#D46240]/50 hover:bg-white transition-all group"
          >
            <p className="font-semibold text-sm text-[#261C19] group-hover:text-[#A73832]">
              Autorizar acceso CETYS
            </p>
            <p className="text-xs text-[#6E564F] mt-1">
              Busca un cliente registrado y habilita su permiso para entrega en CETYS.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
