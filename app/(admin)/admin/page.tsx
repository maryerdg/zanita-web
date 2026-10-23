import Link from 'next/link';
import { getAdminReadinessSummary } from '@/app/actions/admin';
import { getAdminTodayOperationSummary } from '@/app/actions/admin-orders';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  GraduationCap,
  MapPin,
  ArrowRight,
  ShoppingBag,
  ChefHat,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import { formatDateLong } from '@/lib/time/tijuana';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [readinessRes, todayRes] = await Promise.all([
    getAdminReadinessSummary(),
    getAdminTodayOperationSummary(),
  ]);

  const { summary: readiness, error: readinessErr } = readinessRes;
  const { summary: today } = todayRes;

  if (readinessErr || !readiness) {
    return (
      <div className="p-8 bg-red-50 rounded-2xl border border-red-200 text-red-800">
        <p className="font-semibold">Error al cargar el resumen operativo</p>
        <p className="text-sm mt-1">{readinessErr || 'No se pudieron recuperar las métricas de estado.'}</p>
      </div>
    );
  }

  const { officialPoints, homeDelivery, pricing, cetys } = readiness;

  return (
    <div className="space-y-10">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#261C19]">
          Panel de Operaciones
        </h1>
        <p className="text-xs sm:text-sm text-[#6E564F] mt-1">
          Operación de hoy, cola de producción y estado de disponibilidad en tiempo real.
        </p>
      </div>

      {/* 1. HERO SECTION: TODAY'S OPERATION */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#261C19] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#A73832]" />
              Operación de Hoy
            </h2>
            <p className="text-xs text-[#6E564F]">
              {today?.tijuanaDate ? formatDateLong(today.tijuanaDate) : 'Tijuana, BC'}
            </p>
          </div>

          <Link
            href="/admin/pedidos"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#A73832] text-white hover:bg-[#8E2E28] transition-colors shadow-xs self-start sm:self-auto"
          >
            <span>Ir al Módulo de Pedidos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Operational Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Pedidos Hoy */}
          <Link
            href="/admin/pedidos?filter=hoy"
            className="bg-white p-4 rounded-2xl border border-[#E8DCC4] shadow-xs hover:border-[#D46240]/40 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500">
                Pedidos Hoy
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#FAF7F2] text-[#A73832] flex items-center justify-center">
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-bold font-mono text-[#261C19]">
                {today?.ordersTodayCount ?? 0}
              </p>
              <p className="text-[11px] text-[#6E564F] mt-0.5">Programados hoy</p>
            </div>
          </Link>

          {/* Por Aprobar */}
          <Link
            href="/admin/pedidos?filter=por_aprobar"
            className={`p-4 rounded-2xl border shadow-xs transition-all flex flex-col justify-between group ${
              (today?.pendingApprovalCount ?? 0) > 0
                ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-100'
                : 'bg-white border-[#E8DCC4] hover:border-[#D46240]/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500">
                Por Aprobar
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-bold font-mono text-amber-900">
                {today?.pendingApprovalCount ?? 0}
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">Requieren revisión</p>
            </div>
          </Link>

          {/* Por Preparar */}
          <Link
            href="/admin/pedidos?filter=por_preparar"
            className="bg-white p-4 rounded-2xl border border-[#E8DCC4] shadow-xs hover:border-[#D46240]/40 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500">
                Por Preparar
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ChefHat className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-bold font-mono text-[#261C19]">
                {today?.toPrepareCount ?? 0}
              </p>
              <p className="text-[11px] text-[#6E564F] mt-0.5">En cola para cocina</p>
            </div>
          </Link>

          {/* Listos */}
          <Link
            href="/admin/pedidos?filter=listos"
            className="bg-white p-4 rounded-2xl border border-[#E8DCC4] shadow-xs hover:border-[#D46240]/40 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500">
                Listos
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <PackageCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-bold font-mono text-[#261C19]">
                {today?.readyCount ?? 0}
              </p>
              <p className="text-[11px] text-[#6E564F] mt-0.5">Para entrega o despacho</p>
            </div>
          </Link>

          {/* Total Programado Hoy */}
          <div className="col-span-2 lg:col-span-1 bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DCC4] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-600">
                Total Programado
              </span>
              <span className="text-[10px] font-bold text-stone-400">HOY</span>
            </div>
            <div className="mt-3">
              <p className="text-xl sm:text-2xl font-bold font-mono text-[#261C19]">
                ${((today?.scheduledTotalCentsToday ?? 0) / 100).toFixed(2)}
              </p>
              <p className="text-[11px] text-[#6E564F] mt-0.5">Monto activo hoy</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SYSTEM READINESS / LOGISTICS STATUS */}
      <section className="space-y-4 pt-4 border-t border-[#F2ECE1]">
        <div>
          <h2 className="text-lg font-serif font-bold text-[#261C19]">
            Disponibilidad & Reglas del Catálogo
          </h2>
          <p className="text-xs text-[#6E564F]">
            Estado de los canales de entrega y configuración logística de la tienda.
          </p>
        </div>

        {/* Readiness Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Puntos Oficiales */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8DCC4] shadow-xs flex flex-col justify-between hover:border-[#D46240]/40 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#F5EBDC] flex items-center justify-center text-[#A73832]">
                  <MapPin className="w-4 h-4" />
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    officialPoints.isReady
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {officialPoints.isReady ? (
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                  )}
                  {officialPoints.statusText}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-[#261C19] mt-3">
                Puntos Oficiales
              </h3>
              <p className="text-xs text-[#6E564F] mt-1 leading-relaxed">
                {officialPoints.detail}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F2ECE1]">
              <Link
                href="/admin/disponibilidad?mode=official_point"
                className="inline-flex items-center text-xs font-semibold text-[#A73832] hover:text-[#87201D] group"
              >
                Configurar horarios
                <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Entrega a Domicilio */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8DCC4] shadow-xs flex flex-col justify-between hover:border-[#D46240]/40 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#F5EBDC] flex items-center justify-center text-[#A73832]">
                  <Truck className="w-4 h-4" />
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    homeDelivery.isReady
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {homeDelivery.isReady ? (
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                  )}
                  {homeDelivery.statusText}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-[#261C19] mt-3">
                Entrega a Domicilio
              </h3>
              <p className="text-xs text-[#6E564F] mt-1 leading-relaxed">
                {homeDelivery.detail}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F2ECE1]">
              <Link
                href="/admin/disponibilidad?mode=home_delivery"
                className="inline-flex items-center text-xs font-semibold text-[#A73832] hover:text-[#87201D] group"
              >
                Configurar días y horas
                <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Pickup CETYS */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8DCC4] shadow-xs flex flex-col justify-between hover:border-[#D46240]/40 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#F5EBDC] flex items-center justify-center text-[#A73832]">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    cetys.isReady
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {cetys.isReady ? (
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                  )}
                  {cetys.statusText}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-[#261C19] mt-3">
                Pickup CETYS
              </h3>
              <p className="text-xs text-[#6E564F] mt-1 leading-relaxed">
                {cetys.detail}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F2ECE1]">
              <Link
                href="/admin/disponibilidad?mode=cetys_pickup"
                className="inline-flex items-center text-xs font-semibold text-[#A73832] hover:text-[#87201D] group"
              >
                Ver horario CETYS
                <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Tarifas de Domicilio */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8DCC4] shadow-xs flex flex-col justify-between hover:border-[#D46240]/40 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#F5EBDC] flex items-center justify-center text-[#A73832]">
                  <Clock className="w-4 h-4" />
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    pricing.isConfigured
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {pricing.statusText}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-[#261C19] mt-3">
                Tarifas de Domicilio
              </h3>
              <p className="text-xs text-[#6E564F] mt-1 leading-relaxed">
                {pricing.detail}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F2ECE1]">
              <Link
                href="/admin/entregas"
                className="inline-flex items-center text-xs font-semibold text-[#A73832] hover:text-[#87201D] group"
              >
                Configurar cocina y tarifas
                <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. QUICK ACTIONS */}
      <section className="bg-white rounded-2xl p-5 border border-[#E8DCC4] shadow-xs space-y-3">
        <h2 className="text-base font-serif font-bold text-[#261C19]">
          Accesos Rápidos
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            href="/admin/pedidos"
            className="p-3.5 rounded-xl border border-[#F2ECE1] bg-[#FAF7F2] hover:border-[#D46240]/50 hover:bg-white transition-all group"
          >
            <p className="font-semibold text-xs text-[#261C19] group-hover:text-[#A73832]">
              Ver Todos los Pedidos
            </p>
            <p className="text-[11px] text-[#6E564F] mt-0.5">
              Consulta lista completa con filtros por estado y comanda.
            </p>
          </Link>

          <Link
            href="/admin/disponibilidad"
            className="p-3.5 rounded-xl border border-[#F2ECE1] bg-[#FAF7F2] hover:border-[#D46240]/50 hover:bg-white transition-all group"
          >
            <p className="font-semibold text-xs text-[#261C19] group-hover:text-[#A73832]">
              Modificar Horario Semanal
            </p>
            <p className="text-[11px] text-[#6E564F] mt-0.5">
              Ajusta días activos, intervalos y horarios de servicio.
            </p>
          </Link>

          <Link
            href="/admin/usuarios"
            className="p-3.5 rounded-xl border border-[#F2ECE1] bg-[#FAF7F2] hover:border-[#D46240]/50 hover:bg-white transition-all group"
          >
            <p className="font-semibold text-xs text-[#261C19] group-hover:text-[#A73832]">
              Autorizar Acceso CETYS
            </p>
            <p className="text-[11px] text-[#6E564F] mt-0.5">
              Habilita permiso de recogida en CETYS para un cliente.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}
