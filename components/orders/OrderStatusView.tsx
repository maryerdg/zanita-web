'use client';

import React from 'react';
import Link from 'next/link';
import { Check, Clock, MapPin, Calendar, ShoppingBag, ArrowRight } from 'lucide-react';

interface OrderItemOption {
  id: string;
  option_name: string;
  group_name: string;
  quantity: number;
  unit_price_cents: number;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  options?: OrderItemOption[];
}

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  products_subtotal_cents: number;
  delivery_fee_cents: number | null;
  total_amount_cents: number;
  delivery_quote_status: string;
  requested_date: string;
  requested_time: string;
  delivery_name: string;
  delivery_type: string;
  delivery_address: string | null;
  delivery_requires_quote: boolean;
  delivery_point?: {
    name: string;
    address: string;
    type?: string;
    requires_special_pickup_permission?: boolean;
  } | null;
  items: OrderItem[];
}

export function OrderStatusView({ order }: { order: OrderData }) {
  // Snapshot authority: primary source of truth is historical snapshot
  const isCetys = order.delivery_type === 'special' || order.delivery_point?.type === 'special';
  const isOther = order.delivery_type === 'other' || order.delivery_point?.type === 'other';
  const isFreeDelivery = !isOther;
  const isDeliveryPending = isOther && order.delivery_quote_status === 'pending';

  const subtotalPesos = Math.round(order.products_subtotal_cents / 100);
  const totalPesos = isDeliveryPending
    ? subtotalPesos
    : Math.round((order.total_amount_cents || order.products_subtotal_cents) / 100);

  // Format date nicely (e.g. 15 de octubre de 2026)
  const [year, month, day] = order.requested_date.split('-');
  const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  const formattedDate = dateObj.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Format time (e.g. 17:00:00 -> 17:00)
  const formattedTime = order.requested_time.slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-8">
      {/* Top Brand & Success Header (Uber Eats style calm layout) */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D5C1] shadow-2xs text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#FFF9F2] border border-[#E4D5C1] flex items-center justify-center text-3xl">
          🍎
        </div>

        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#261C19]">
            Pedido enviado
          </h1>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF4E5] border border-[#F5D0A9] text-xs font-bold text-[#A75D28]">
            <Clock className="w-3.5 h-3.5" />
            <span>Esperando confirmación</span>
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-2 text-xs sm:text-sm text-[#6E564F] leading-relaxed">
          <p>
            Recibimos tu pedido y lo estamos revisando. Confirmaremos disponibilidad, fecha solicitada y costo de entrega.
          </p>
          <p className="text-xs text-[#261C19] font-medium">
            Te avisaremos cuando tu pedido esté confirmado y puedas continuar con el pago.
          </p>
        </div>

        <div className="pt-2">
          <span className="font-mono text-xs sm:text-sm font-bold bg-[#FFF9F2] px-3.5 py-1.5 rounded-lg border border-[#E4D5C1] text-[#261C19]">
            Pedido {order.order_number}
          </span>
        </div>
      </div>

      {/* Status Tracker */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D5C1] shadow-2xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#6E564F]">
          Estado de tu pedido
        </h2>

        <div className="relative flex items-center justify-between pt-2">
          {/* Connector Line */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-[#E4D5C1] z-0" />

          {/* Step 1: Enviado (Done) */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
            <div className="w-8 h-8 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#2D6A4F] text-center">
              Pedido enviado
            </span>
          </div>

          {/* Step 2: En revisión (Active) */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
            <div className="w-8 h-8 rounded-full bg-[#A73832] text-white flex items-center justify-center text-xs font-bold ring-4 ring-[#A73832]/20 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#A73832] text-center">
              En revisión
            </span>
          </div>

          {/* Step 3: Confirmado (Pending) */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
            <div className="w-8 h-8 rounded-full bg-[#FFF9F2] border-2 border-[#E4D5C1] text-[#6E564F] flex items-center justify-center text-xs">
              <span className="w-2 h-2 rounded-full bg-[#E4D5C1]" />
            </div>
            <span className="text-[11px] sm:text-xs text-[#6E564F] text-center">
              Confirmado
            </span>
          </div>

          {/* Step 4: Pago (Pending) */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
            <div className="w-8 h-8 rounded-full bg-[#FFF9F2] border-2 border-[#E4D5C1] text-[#6E564F] flex items-center justify-center text-xs">
              <span className="w-2 h-2 rounded-full bg-[#E4D5C1]" />
            </div>
            <span className="text-[11px] sm:text-xs text-[#6E564F] text-center">
              Pago
            </span>
          </div>
        </div>

        {/* Current Step Status Note */}
        <div className="mt-4 p-3.5 rounded-xl bg-[#FFF9F2] border border-[#E4D5C1] text-xs text-[#6E564F] flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-[#A73832] shrink-0" />
          <span>
            {isDeliveryPending
              ? 'Estamos revisando tu pedido y calculando el costo de envío.'
              : isCetys
              ? 'Estamos revisando tu pedido. Pickup en CETYS no requiere costo de entrega.'
              : 'Sin costo de entrega. Estamos revisando tu pedido y confirmando disponibilidad.'}
          </span>
        </div>
      </div>

      {/* Order Details & Summary Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D5C1] shadow-2xs space-y-6">
        <h2 className="font-serif font-bold text-lg text-[#261C19] border-b border-[#E4D5C1]/60 pb-3">
          Detalles de la entrega
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#FFF9F2] border border-[#E4D5C1]/60 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#261C19]">
              <Calendar className="w-3.5 h-3.5 text-[#A73832]" />
              <span>Fecha y hora solicitada</span>
            </div>
            <p className="text-[#6E564F] capitalize">{formattedDate}</p>
            <p className="text-[#6E564F] font-medium">{formattedTime} hrs</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FFF9F2] border border-[#E4D5C1]/60 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#261C19]">
              <MapPin className="w-3.5 h-3.5 text-[#A73832]" />
              <span>Modalidad o punto de entrega</span>
            </div>
            <p className="font-medium text-[#261C19]">
              {order.delivery_name || order.delivery_point?.name || 'Entrega a domicilio'}
            </p>
            <p className="text-[#6E564F]">
              {order.delivery_address || order.delivery_point?.address || 'Por confirmar'}
            </p>
          </div>
        </div>

        {/* Products list */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6E564F]">
            Productos solicitados ({order.items.length})
          </h3>
          <div className="divide-y divide-[#E4D5C1]/60 border border-[#E4D5C1] rounded-xl overflow-hidden">
            {order.items.map((item) => (
              <div key={item.id} className="p-3.5 sm:p-4 flex items-start justify-between gap-4 bg-white">
                <div className="space-y-1 min-w-0">
                  <p className="font-serif font-bold text-sm text-[#261C19]">
                    {item.quantity}× {item.product_name}
                  </p>
                  {item.options && item.options.length > 0 && (
                    <ul className="text-[11px] text-[#6E564F] space-y-0.5">
                      {item.options.map((opt) => (
                        <li key={opt.id}>
                          • <span className="font-medium text-[#261C19]">{opt.option_name}</span>
                          {opt.quantity > 1 ? ` ×${opt.quantity}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className="font-bold text-sm text-[#261C19] shrink-0">
                  ${Math.round(item.subtotal_cents / 100)} MXN
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="pt-2 border-t border-[#E4D5C1]/60 space-y-2 text-xs">
          <div className="flex justify-between text-[#6E564F]">
            <span>Subtotal de productos</span>
            <span className="font-bold text-[#261C19]">${subtotalPesos} MXN</span>
          </div>

          <div className="flex justify-between items-center text-[#6E564F]">
            <span>Costo de envío</span>
            {isCetys ? (
              <span className="font-bold text-[#2D6A4F]">Sin costo ($0 MXN)</span>
            ) : isDeliveryPending ? (
              <span className="italic text-[#A75D28] font-medium">Por confirmar</span>
            ) : isFreeDelivery ? (
              <span className="font-bold text-[#2D6A4F]">Sin costo de entrega</span>
            ) : (
              <span className="font-bold text-[#261C19]">
                ${Math.round((order.delivery_fee_cents || 0) / 100)} MXN
              </span>
            )}
          </div>

          <div className="pt-2 border-t border-[#E4D5C1]/60 flex justify-between items-baseline">
            <div>
              <span className="text-sm font-bold text-[#261C19]">
                {isDeliveryPending ? 'Subtotal actual' : 'Total'}
              </span>
              {isDeliveryPending && (
                <p className="text-[10px] text-[#6E564F] italic">
                  (Pendiente costo de entrega)
                </p>
              )}
            </div>
            <span className="font-serif font-bold text-xl text-[#A73832]">
              ${totalPesos} MXN
            </span>
          </div>
        </div>

        {/* Payment Helper Box */}
        <div className="p-3.5 rounded-xl bg-[#FFF9F2] border border-[#E4D5C1] text-xs text-[#6E564F] text-center">
          <p className="font-medium text-[#261C19]">
            El pago estará disponible después de la confirmación del pedido.
          </p>
          <p className="text-[11px] mt-0.5 text-[#6E564F]">
            No es necesario realizar ningún pago en este momento.
          </p>
        </div>

        {/* Navigation Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            href="/productos"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-[#A73832] hover:bg-[#8e2e28] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs text-center"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Seguir viendo productos</span>
          </Link>

          <Link
            href="/mi-cuenta"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-[#E4D5C1] hover:border-[#A73832] text-[#261C19] hover:text-[#A73832] bg-[#FFF9F2] text-xs font-bold uppercase tracking-wider transition-colors text-center"
          >
            <span>Ir a mi cuenta</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
