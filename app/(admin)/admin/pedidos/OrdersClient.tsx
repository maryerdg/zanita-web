'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  initialTargetOrder?: string;
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

export function OrdersClient({
  initialOrders,
  initialFilter = 'hoy',
  initialTargetOrder,
}: OrdersClientProps) {
  const [orders, setOrders] = useState<AdminOrderListItem[]>(initialOrders);
  const [prevInitialOrders, setPrevInitialOrders] = useState(initialOrders);
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);
  const [activeView, setActiveView] = useState<'list' | 'kitchen'>('list');

  // Find initial match if target order was supplied
  const initialMatch = initialTargetOrder
    ? initialOrders.find((o) => o.order_number === initialTargetOrder) ?? null
    : null;
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderListItem | null>(initialMatch);
  const [isModalOpen, setIsModalOpen] = useState(Boolean(initialMatch));
  const [isLoading, setIsLoading] = useState(false);

  // Sync state if initialOrders changes from server revalidation (React recommended pattern)
  if (initialOrders !== prevInitialOrders) {
    setPrevInitialOrders(initialOrders);
    setOrders(initialOrders);
  }

  // Counters for tabs
  const pendingCount = orders.filter((o) => o.status === 'pending_approval').length;
  const toPrepareCount = orders.filter((o) => o.status === 'confirmed').length;

  const refreshOrders = useCallback(
    async (filterToLoad: string = activeFilter) => {
      setIsLoading(true);
      try {
        const res = await getAdminOrdersList(filterToLoad);
        if (res.orders) {
          setOrders(res.orders);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [activeFilter]
  );

  // Realtime Live Update Listener
  useEffect(() => {
    const handleLiveRefresh = () => {
      refreshOrders();
    };
    window.addEventListener('zanita:orders-refresh', handleLiveRefresh);
    return () => {
      window.removeEventListener('zanita:orders-refresh', handleLiveRefresh);
    };
  }, [refreshOrders]);

  // Handle direct target order navigation if not in initial filter
  useEffect(() => {
    if (!initialTargetOrder || initialMatch) return;
    let isMounted = true;
    getAdminOrdersList('todos').then((res) => {
      if (isMounted && res.orders) {
        const found = res.orders.find((o) => o.order_number === initialTargetOrder);
        if (found) {
          setSelectedOrder(found);
          setIsModalOpen(true);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [initialTargetOrder, initialMatch]);

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
            className="p-2 rounded-xl border border-[#E8DCC4] bg-white text-[#6E564F] hover:text-[#A73832] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            title="Actualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar (only visible in List view) */}
      {activeView === 'list' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-[#E8DCC4]/60">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;
            let badgeCount = null;
            if (tab.id === 'por_aprobar' && pendingCount > 0) {
              badgeCount = pendingCount;
            } else if (tab.id === 'por_preparar' && toPrepareCount > 0) {
              badgeCount = toPrepareCount;
            }

            return (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#A73832] text-white shadow-2xs'
                    : 'text-[#6E564F] hover:bg-white hover:text-[#261C19]'
                }`}
              >
                <span>{tab.label}</span>
                {badgeCount !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-white text-[#A73832]'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Area: List vs Kitchen View */}
      {activeView === 'kitchen' ? (
        <KitchenQueueView
          orders={orders}
          onOpenOrder={handleOpenDetail}
          onRefresh={() => refreshOrders(activeFilter)}
        />
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8DCC4] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E8DCC4] flex items-center justify-center mx-auto text-[#6E564F]">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-[#261C19]">
            No hay pedidos en esta vista
          </h3>
          <p className="text-xs text-[#6E564F] max-w-sm mx-auto">
            {activeFilter === 'hoy'
              ? 'No hay pedidos programados para entrega el día de hoy.'
              : `No se encontraron pedidos con el filtro "${activeFilter}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => {
            const statusMeta = getOperationalStatusMeta(order.status);
            const paymentMeta = derivePaymentStatus(
              order.total_amount_cents,
              order.amount_paid_cents,
              order.deposit_required_pct,
              order.payment_reported_at
            );
            const isToday = isTijuanaToday(order.requested_date);
            const isCetys = order.delivery_mode_snapshot === 'cetys_pickup';
            const isHome = order.delivery_mode_snapshot === 'home_delivery';

            return (
              <div
                key={order.id}
                onClick={() => handleOpenDetail(order)}
                className={`bg-white rounded-2xl border p-5 shadow-xs hover:border-[#A73832]/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
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
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#A73832] font-semibold text-xs border border-[#E8DCC4] transition-colors cursor-pointer"
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
