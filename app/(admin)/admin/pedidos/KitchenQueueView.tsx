'use client';

import React, { useState } from 'react';
import {
  ChefHat,
  Clock,
  MapPin,
  Sparkles,
  PackageCheck,
  Calendar,
  AlertCircle,
  Eye,
} from 'lucide-react';
import type { AdminOrderListItem } from '@/app/actions/admin-orders';
import { adminUpdateOrderStatus } from '@/app/actions/admin-orders';
import { formatDateLong, formatTimeShort, isTijuanaToday } from '@/lib/time/tijuana';

interface KitchenQueueViewProps {
  orders: AdminOrderListItem[];
  onOpenOrder: (order: AdminOrderListItem) => void;
  onRefresh: () => void;
}

export function KitchenQueueView({
  orders,
  onOpenOrder,
  onRefresh,
}: KitchenQueueViewProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter queue to production-relevant orders: confirmed or preparing
  const queueOrders = orders.filter(
    (o) => o.status === 'confirmed' || o.status === 'preparing'
  );

  // Group by date
  const groupsByDate: Record<string, AdminOrderListItem[]> = {};
  queueOrders.forEach((o) => {
    if (!groupsByDate[o.requested_date]) {
      groupsByDate[o.requested_date] = [];
    }
    groupsByDate[o.requested_date].push(o);
  });

  const sortedDates = Object.keys(groupsByDate).sort();

  const handleQuickTransition = async (order: AdminOrderListItem, nextStatus: 'preparing' | 'ready') => {
    setUpdatingId(order.id);
    setErrorMsg(null);
    try {
      const res = await adminUpdateOrderStatus(order.id, nextStatus);
      if (!res.success) {
        setErrorMsg(res.error || 'Error al actualizar');
      } else {
        onRefresh();
      }
    } catch {
      setErrorMsg('Error de red al actualizar estado');
    } finally {
      setUpdatingId(null);
    }
  };

  if (queueOrders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8DCC4] p-12 text-center max-w-lg mx-auto space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
          <ChefHat className="w-7 h-7" />
        </div>
        <h3 className="font-serif font-bold text-lg text-[#261C19]">
          Cola de Preparación Vacía
        </h3>
        <p className="text-xs text-[#6E564F] leading-relaxed">
          No hay pedidos pendientes de cocinar o armar en este momento. Cuando un pedido sea confirmado con su pago, aparecerá aquí listo para producción.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {sortedDates.map((dateStr) => {
        const isToday = isTijuanaToday(dateStr);
        const dayOrders = groupsByDate[dateStr].sort((a, b) =>
          a.requested_time.localeCompare(b.requested_time)
        );

        return (
          <div key={dateStr} className="space-y-3">
            {/* Date Group Header */}
            <div className="flex items-center justify-between pb-1 border-b border-[#E8DCC4]/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#A73832]" />
                <h3 className="font-serif font-bold text-base text-[#261C19]">
                  {formatDateLong(dateStr)}
                </h3>
                {isToday && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#A73832] text-white uppercase tracking-wider">
                    HOY
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-[#6E564F]">
                {dayOrders.length} {dayOrders.length === 1 ? 'pedido' : 'pedidos'}
              </span>
            </div>

            {/* Orders in this date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dayOrders.map((order) => {
                const isPreparing = order.status === 'preparing';
                const isCetys = order.delivery_mode_snapshot === 'cetys_pickup';
                const isHome = order.delivery_mode_snapshot === 'home_delivery';

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl border transition-all p-4 flex flex-col justify-between shadow-xs ${
                      isPreparing
                        ? 'border-orange-300 ring-2 ring-orange-200/50'
                        : 'border-[#E8DCC4] hover:border-[#D46240]/40'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Time slot & Destination */}
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#F2ECE1]">
                        <div>
                          <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-[#261C19]">
                            <Clock className="w-4 h-4 text-[#A73832]" />
                            <span>{formatTimeShort(order.requested_time)} hrs</span>
                          </div>
                          <p className="text-[11px] text-[#6E564F] mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#A73832]" />
                            {isCetys
                              ? 'Pickup CETYS'
                              : isHome
                              ? 'Entrega a Domicilio'
                              : order.delivery_name_snapshot || 'Punto Oficial'}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-stone-700 block">
                            {order.order_number}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isPreparing
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isPreparing ? 'En Cocina' : 'Por Preparar'}
                          </span>
                        </div>
                      </div>

                      {/* Customer name */}
                      <div className="pt-2 pb-3">
                        <span className="text-[10px] uppercase font-bold text-stone-400">
                          Para
                        </span>
                        <p className="font-bold text-sm text-[#261C19]">
                          {order.customer_name_snapshot}
                        </p>
                      </div>

                      {/* Product Comanda Items */}
                      <div className="space-y-2.5 bg-[#FAF7F2] p-3 rounded-xl border border-[#F2ECE1]">
                        <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">
                          Comanda ({order.items_count} piezas)
                        </span>

                        {order.items.map((it) => (
                          <div key={it.id} className="text-xs">
                            <p className="font-bold text-[#261C19]">
                              <span className="text-[#A73832] mr-1">{it.quantity}x</span>
                              {it.product_name_snapshot}
                            </p>

                            {it.options.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1 pl-3">
                                {it.options.map((opt) => (
                                  <span
                                    key={opt.id}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-[#E8DCC4] text-[10px] font-medium text-stone-700"
                                  >
                                    <Sparkles className="w-2.5 h-2.5 text-[#D46240]" />
                                    <span>{opt.option_name_snapshot}</span>
                                    {opt.quantity > 1 && <strong>(x{opt.quantity})</strong>}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}

                        {order.notes && (
                          <div className="mt-2 pt-2 border-t border-[#E8DCC4]/60 text-[11px] text-amber-800 italic">
                            Nota: &ldquo;{order.notes}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-3.5 mt-3 border-t border-[#F2ECE1] flex items-center justify-between gap-2">
                      <button
                        onClick={() => onOpenOrder(order)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#6E564F] hover:text-[#A73832] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver detalle
                      </button>

                      {isPreparing ? (
                        <button
                          disabled={updatingId === order.id}
                          onClick={() => handleQuickTransition(order, 'ready')}
                          className="px-3.5 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          Marcar Listo
                        </button>
                      ) : (
                        <button
                          disabled={updatingId === order.id}
                          onClick={() => handleQuickTransition(order, 'preparing')}
                          className="px-3.5 py-1.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          <ChefHat className="w-3.5 h-3.5" />
                          Cocinar Ahora
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
