'use client';

import React, { useState } from 'react';
import {
  ShoppingBag,
  ChefHat,
  Clock,
  MapPin,
  Calendar,
  Phone,
  ListFilter,
  Eye,
  RefreshCw,
} from 'lucide-react';
import type { AdminOrderListItem } from '@/app/actions/admin-orders';
import { getAdminOrdersList } from '@/app/actions/admin-orders';
import { getOperationalStatusMeta } from '@/lib/orders/operational-status';
import { derivePaymentStatus } from '@/lib/orders/payment-status';
import { formatTimeShort, formatDateCompact, isTijuanaToday } from '@/lib/time/tijuana';
import { OrderDetailModal } from './OrderDetailModal';
import { KitchenQueueView } from './KitchenQueueView';

interface OrdersClientProps {
  initialOrders: AdminOrderListItem[];
  initialFilter?: string;
}

const FILTER_TABS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'por_aprobar', label: 'Por Aprobar' },
  { id: 'por_preparar', label: 'Por Preparar' },
  { id: 'listos', label: 'Listos' },
  { id: 'proximos', label: 'Próximos' },
  { id: 'completados', label: 'Completados' },
  { id: 'todos', label: 'Todos' },
];

export function OrdersClient({ initialOrders, initialFilter = 'hoy' }: OrdersClientProps) {
  const [orders, setOrders] = useState<AdminOrderListItem[]>(initialOrders);
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);
  const [activeView, setActiveView] = useState<'list' | 'kitchen'>('list');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Counters for tabs
  const pendingCount = orders.filter((o) => o.status === 'pending_approval').length;
  const toPrepareCount = orders.filter((o) => o.status === 'confirmed').length;

  const refreshOrders = async (filterToLoad: string = activeFilter) => {
    setIsLoading(true);
    try {
      const res = await getAdminOrdersList(filterToLoad);
      if (res.orders) {
        setOrders(res.orders);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setActiveFilter(newFilter);
    refreshOrders(newFilter);
  };

  const handleOpenDetail = (order: AdminOrderListItem) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#261C19]">
            Centro de Operaciones de Pedidos
          </h1>
          <p className="text-xs sm:text-sm text-[#6E564F] mt-1">
            Gestión en vivo de pedidos, cola de producción y despacho para el taller.
          </p>
        </div>

        {/* View Switcher Button Group */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-[#FAF7F2] p-1 rounded-xl border border-[#E8DCC4] flex items-center">
            <button
              onClick={() => setActiveView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'list'
                  ? 'bg-white text-[#261C19] shadow-xs'
                  : 'text-[#6E564F] hover:text-[#261C19]'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
            <button
              onClick={() => setActiveView('kitchen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'kitchen'
                  ? 'bg-[#A73832] text-white shadow-xs'
                  : 'text-[#6E564F] hover:text-[#261C19]'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Cola de Cocina</span>
            </button>
          </div>

          <button
            onClick={() => refreshOrders(activeFilter)}
            disabled={isLoading}
            className="p-2 rounded-xl border border-[#E8DCC4] bg-white text-[#6E564F] hover:text-[#A73832] hover:bg-[#FAF7F2] transition-colors"
            title="Actualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs (Visible in List View) */}
      {activeView === 'list' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-[#F2ECE1]">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;
            const showPendingBadge = tab.id === 'por_aprobar' && pendingCount > 0;
            const showPrepareBadge = tab.id === 'por_preparar' && toPrepareCount > 0;

            return (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id)}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#261C19] text-white shadow-xs'
                    : 'bg-white text-[#6E564F] hover:bg-[#FAF7F2] border border-transparent hover:border-[#E8DCC4]'
                }`}
              >
                <span>{tab.label}</span>

                {showPendingBadge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {pendingCount}
                  </span>
                )}

                {showPrepareBadge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                    {toPrepareCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      {activeView === 'kitchen' ? (
        <KitchenQueueView
          orders={orders}
          onOpenOrder={handleOpenDetail}
          onRefresh={() => refreshOrders(activeFilter)}
        />
      ) : orders.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-[#E8DCC4] p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#F5EBDC] text-[#A73832] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h3 className="font-serif font-bold text-lg text-[#261C19]">
            Sin Pedidos en esta Vista
          </h3>
          <p className="text-xs text-[#6E564F] leading-relaxed">
            {activeFilter === 'hoy'
              ? 'No hay pedidos programados para entrega hoy en Tijuana. Los pedidos entrantes se ordenarán aquí automáticamente.'
              : activeFilter === 'por_aprobar'
              ? '¡Excelente! No hay pedidos pendientes de revisión o aprobación.'
              : activeFilter === 'por_preparar'
              ? 'No hay pedidos en cola de preparación en este momento.'
              : activeFilter === 'listos'
              ? 'No hay pedidos listos pendientes de entrega.'
              : 'No se encontraron pedidos con el filtro seleccionado.'}
          </p>
        </div>
      ) : (
        /* Order Cards List (Mobile-Optimized) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => {
            const statusMeta = getOperationalStatusMeta(order.status);
            const paymentMeta = derivePaymentStatus(
              order.total_amount_cents,
              order.amount_paid_cents,
              order.deposit_required_pct
            );
            const isToday = isTijuanaToday(order.requested_date);
            const isCetys = order.delivery_mode_snapshot === 'cetys_pickup';
            const isHome = order.delivery_mode_snapshot === 'home_delivery';

            return (
              <div
                key={order.id}
                onClick={() => handleOpenDetail(order)}
                className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between shadow-xs hover:border-[#D46240]/50 hover:shadow-sm ${
                  order.status === 'pending_approval'
                    ? 'border-amber-300 ring-2 ring-amber-100'
                    : 'border-[#E8DCC4]'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Order Number & Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-[#261C19]">
                      {order.order_number}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.badgeClass}`}
                      >
                        <span className={`w-1 h-1 rounded-full mr-1 ${statusMeta.dotClass}`} />
                        {statusMeta.label}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${paymentMeta.badgeClass}`}
                      >
                        {paymentMeta.label}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">
                      Cliente
                    </span>
                    <p className="font-bold text-sm text-[#261C19]">
                      {order.customer_name_snapshot}
                    </p>
                    <div className="flex items-center justify-between text-xs text-[#6E564F] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#A73832]" />
                        {order.customer_phone_snapshot}
                      </span>
                    </div>
                  </div>

                  {/* Delivery details */}
                  <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#F2ECE1] space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold text-[#261C19]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#A73832]" />
                        {isToday ? (
                          <strong className="text-[#A73832]">HOY</strong>
                        ) : (
                          formatDateCompact(order.requested_date)
                        )}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-stone-400" />
                        {formatTimeShort(order.requested_time)} hrs
                      </span>
                    </div>

                    <p className="text-[11px] text-[#6E564F] flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-[#A73832] shrink-0" />
                      <span>
                        {isCetys
                          ? 'Pickup CETYS'
                          : isHome
                          ? 'Entrega a Domicilio'
                          : order.delivery_name_snapshot || 'Punto Oficial'}
                      </span>
                    </p>
                  </div>

                  {/* Items Summary */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">
                      Productos ({order.items_count})
                    </span>
                    <p className="text-xs text-[#261C19] line-clamp-2">
                      {order.items_summary}
                    </p>
                  </div>
                </div>

                {/* Footer Bar: Total & Action button */}
                <div className="pt-3 mt-3 border-t border-[#F2ECE1] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">
                      Total
                    </span>
                    <span className="font-mono font-bold text-sm text-[#261C19]">
                      ${(order.total_amount_cents / 100).toFixed(2)} MXN
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetail(order);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#A73832] font-semibold text-xs border border-[#E8DCC4] transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusUpdated={() => refreshOrders(activeFilter)}
      />
    </div>
  );
}
